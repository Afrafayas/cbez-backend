import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
