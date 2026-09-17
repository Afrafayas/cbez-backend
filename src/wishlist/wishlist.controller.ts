import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('toggle/:productId')
  async toggleWishlist(
    @Request() req: any,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.toggleWishlist(req.user.id, productId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':productId')
  async addToWishlist(
    @Request() req: any,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.addToWishlist(req.user.id, productId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':productId')
  async removeFromWishlist(
    @Request() req: any,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(req.user.id, productId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getUserWishlist(@Request() req: any) {
    return this.wishlistService.getUserWishlist(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('ids')
  async getWishlistIds(@Request() req: any) {
    return this.wishlistService.getWishlistIds(req.user.id);
  }
}
