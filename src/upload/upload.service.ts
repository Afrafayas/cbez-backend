import { Injectable } from '@nestjs/common';
import { Request } from 'express';

export interface UploadedFileResponse {
  url: string;
  path: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadService {
  getBaseUrl(req: Request): string {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    return `${proto}://${host}`;
  }

  formatFileResponse(file: Express.Multer.File, req: Request, folderName?: string): UploadedFileResponse {
    const baseUrl = this.getBaseUrl(req);
    const subfolder = folderName || (req.query?.folder as string) || 'general';
    const cleanFolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, '');
    const relativePath = `/uploads/${cleanFolder}/${file.filename}`;

    return {
      url: `${baseUrl}${relativePath}`,
      path: relativePath,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
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
}
