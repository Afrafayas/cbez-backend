import { Controller, Get, Post, Put, Patch, Body } from '@nestjs/common';
import { MlxDetailsService } from './mlx-details.service';
import { UpdateMlxDetailsDto } from './dto/update-mlx-details.dto';

@Controller(['platform-settings', 'mlx-details'])
export class MlxDetailsController {
  constructor(private readonly mlxDetailsService: MlxDetailsService) {}

  @Get()
  async getDetails() {
    return this.mlxDetailsService.getDetails();
  }

  @Put()
  async updateDetailsPut(@Body() dto: UpdateMlxDetailsDto) {
    return this.mlxDetailsService.updateDetails(dto);
  }

  @Patch()
  async updateDetailsPatch(@Body() dto: UpdateMlxDetailsDto) {
    return this.mlxDetailsService.updateDetails(dto);
  }

  @Post()
  async updateDetailsPost(@Body() dto: UpdateMlxDetailsDto) {
    return this.mlxDetailsService.updateDetails(dto);
  }
}
