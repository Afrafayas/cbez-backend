import { Module } from '@nestjs/common';
import { MlxDetailsService } from './mlx-details.service';
import { MlxDetailsController } from './mlx-details.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MlxDetailsController],
  providers: [MlxDetailsService],
  exports: [MlxDetailsService],
})
export class MlxDetailsModule {}
