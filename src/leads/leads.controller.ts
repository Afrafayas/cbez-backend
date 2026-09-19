import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { VerifiedSellerGuard } from '../auth/verified-seller.guard';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  async create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), VerifiedSellerGuard)
  @Get('seller')
  async getSellerLeads(@Request() req: any) {
    return this.leadsService.getSellerLeads(req.user.id);
  }
}
