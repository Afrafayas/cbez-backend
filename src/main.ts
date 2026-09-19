import { json, urlencoded } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  // Ensure base uploads directories exist
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from uploads folder at both /uploads/ and /api/uploads/
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });
  app.useStaticAssets(uploadsDir, {
    prefix: '/api/uploads/',
  });

  // Increase payload limit for base64 multi-angle product images
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS for frontend web and mobile web
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Set global API prefix (/api/auth, /api/products, etc.)
  app.setGlobalPrefix('api');

  // Enable global validation pipe for request DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Cbez B2C Backend running on: http://localhost:${port}/api`);
}
bootstrap();
