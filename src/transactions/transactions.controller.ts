import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('revenue/stats')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  getRevenueStats() {
    return this.transactionsService.getRevenueStats();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  findAll(@Query() filter: TransactionFilterDto) {
    return this.transactionsService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
