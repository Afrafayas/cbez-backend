import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedFileResponse {
  url: string;
  path: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  provider: 's3' | 'local';
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string = '';
  private region: string = '';

  constructor() {
    this.initS3();
  }

  private initS3() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'ap-south-1';
    const bucket = process.env.AWS_S3_BUCKET || 'cbez-gallery-uploads';

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.bucketName = bucket;
      this.region = region;
      this.logger.log(`AWS S3 Initialized successfully with Bucket: "${this.bucketName}" (${this.region})`);
    } else {
      this.logger.warn('AWS S3 credentials missing in .env. Falling back to local disk uploads.');
    }
  }

  getBaseUrl(req: Request): string {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    return `${proto}://${host}`;
  }

  async uploadFileToS3(
    fileBuffer: Buffer,
    filename: string,
    mimetype: string,
    folderName: string = 'general',
  ): Promise<string | null> {
    if (!this.s3Client || !this.bucketName) {
      return null;
    }

    try {
      const cleanFolder = folderName.replace(/[^a-zA-Z0-9_-]/g, '');
      const key = `${cleanFolder}/${filename}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimetype,
        }),
      );

      const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      this.logger.log(`Uploaded to S3: ${s3Url}`);
      return s3Url;
    } catch (error) {
      this.logger.error('Failed to upload file to AWS S3:', error);
      return null;
    }
  }

  async formatFileResponseAsync(
    file: Express.Multer.File,
    req: Request,
    folderName?: string,
  ): Promise<UploadedFileResponse> {
    const subfolder = folderName || (req.query?.folder as string) || 'general';
    const cleanFolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, '');

    // Try S3 upload if configured
    if (this.s3Client && file.buffer) {
      const s3Url = await this.uploadFileToS3(file.buffer, file.filename || `${Date.now()}-${file.originalname}`, file.mimetype, cleanFolder);
      if (s3Url) {
        return {
          url: s3Url,
          path: s3Url,
          filename: file.filename || file.originalname,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          provider: 's3',
        };
      }
    }

    // If file is saved to disk via multer storage disk:
    if (file.path && fs.existsSync(file.path) && this.s3Client) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const s3Url = await this.uploadFileToS3(fileBuffer, file.filename, file.mimetype, cleanFolder);
        if (s3Url) {
          return {
            url: s3Url,
            path: s3Url,
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            provider: 's3',
          };
        }
      } catch (err) {
        this.logger.error('Failed reading file from disk for S3 upload', err);
      }
    }

    // Fallback to local disk URL
    const baseUrl = this.getBaseUrl(req);
    const relativePath = `/uploads/${cleanFolder}/${file.filename}`;
    return {
      url: `${baseUrl}${relativePath}`,
      path: relativePath,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      provider: 'local',
    };
  }

  formatFileResponse(file: Express.Multer.File, req: Request, folderName?: string): UploadedFileResponse {
    const subfolder = folderName || (req.query?.folder as string) || 'general';
    const cleanFolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, '');
    const baseUrl = this.getBaseUrl(req);
    const relativePath = `/uploads/${cleanFolder}/${file.filename}`;

    return {
      url: `${baseUrl}${relativePath}`,
      path: relativePath,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      provider: 'local',
    };
  }

  async formatMultipleFilesResponseAsync(files: Express.Multer.File[], req: Request, folderName?: string) {
    const formatted = await Promise.all(files.map((file) => this.formatFileResponseAsync(file, req, folderName)));
    return {
      urls: formatted.map((f) => f.url),
      paths: formatted.map((f) => f.path),
      files: formatted,
    };
  }

  formatMultipleFilesResponse(files: Express.Multer.File[], req: Request, folderName?: string) {
    const formatted = files.map((file) => this.formatFileResponse(file, req, folderName));
    return {
      urls: formatted.map((f) => f.url),
      paths: formatted.map((f) => f.path),
      files: formatted,
    };
  }

  async uploadBase64Image(base64Data: string, folderName: string = 'general'): Promise<string> {
    if (!base64Data) return '';
    if (!base64Data.startsWith('data:')) {
      // Already an HTTP / S3 URL
      return base64Data;
    }

    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Data;
    }

    const mimetype = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = mimetype.split('/')[1] || 'jpg';
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    if (this.s3Client && this.bucketName) {
      const s3Url = await this.uploadFileToS3(buffer, filename, mimetype, folderName);
      if (s3Url) return s3Url;
    }

    // Fallback: save to disk
    const cleanFolder = folderName.replace(/[^a-zA-Z0-9_-]/g, '');
    const uploadDir = path.join(process.cwd(), 'uploads', cleanFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${cleanFolder}/${filename}`;
  }
}
