import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowsService } from './follows.service';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':shopId')
  async followShop(@Request() req: any, @Param('shopId') shopId: string) {
    return this.followsService.followShop(req.user.id, shopId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':shopId')
  async unfollowShop(@Request() req: any, @Param('shopId') shopId: string) {
    return this.followsService.unfollowShop(req.user.id, shopId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-shops')
  async getFollowedShops(@Request() req: any) {
    return this.followsService.getFollowedShops(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('status/:shopId')
  async checkFollowStatus(@Request() req: any, @Param('shopId') shopId: string) {
    return this.followsService.checkFollowStatus(req.user.id, shopId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('shop-followers')
  async getShopFollowers(@Request() req: any) {
    return this.followsService.getShopFollowers(req.user.id);
  }
}
