import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
