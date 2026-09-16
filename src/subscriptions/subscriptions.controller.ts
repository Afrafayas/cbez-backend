import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { AdminGuard } from '../auth/admin.guard';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  findAllPlans(@Query('status') status?: string) {
    if (status === 'ACTIVE' || status === 'active') {
      return this.subscriptionsService.findActivePlans();
    }
    return this.subscriptionsService.findAllPlans();
  }

  @Get('plans/active')
  findActivePlans() {
    return this.subscriptionsService.findActivePlans();
  }

  @Get('plans/:id')
  findOnePlan(@Param('id') id: string) {
    return this.subscriptionsService.findOnePlan(id);
  }

  @Post('plans')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch('plans/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  updatePlan(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Patch('plans/:id/status')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  togglePlanStatus(@Param('id') id: string, @Body('status') status?: string) {
    return this.subscriptionsService.togglePlanStatus(id, status);
  }

  @Delete('plans/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }

  @Post('assign')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  assignPlanToShop(@Body() dto: AssignSubscriptionDto) {
    return this.subscriptionsService.assignPlanToShop(dto);
  }

  @Get('shop/:shopId')
  getShopSubscription(@Param('shopId') shopId: string) {
    return this.subscriptionsService.getShopSubscription(shopId);
  }
}
