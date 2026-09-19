import { Module, BadRequestException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

export const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    let folder = (req.query?.folder as string) || (req.params?.folder as string) || 'general';
    folder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const uploadPath = join(process.cwd(), 'uploads', folder);
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const cleanName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${cleanName || 'img'}-${uniqueSuffix}${ext}`);
  },
});

export const imageFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif',
  ];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed types are: JPEG, PNG, WEBP, GIF, SVG, AVIF`,
      ),
      false,
    );
  }
};

@Module({
  imports: [
    MulterModule.register({
      storage: multerStorage,
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
