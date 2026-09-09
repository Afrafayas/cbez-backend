import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { NetworkService } from './network.service';
import { CreateNetworkInquiryDto } from './dto/create-network-inquiry.dto';

@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Post('inquiries')
  async createInquiry(@Body() dto: CreateNetworkInquiryDto, @Request() req: any) {
    const userId = req.user?.id || undefined;
    return this.networkService.createInquiry(dto, userId);
  }

  @Get('inquiries')
  async findAllInquiries(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.networkService.findAllInquiries({ city, category, search });
  }
}
