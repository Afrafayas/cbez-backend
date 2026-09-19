import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

export const SELLER_VERIFICATION_MESSAGE =
  'Your profile is under verification. After verification only you can create a product and access all the features.';

@Injectable()
export class VerifiedSellerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Admins bypass seller checks
    if (user.role === 'admin') {
      return true;
    }

    if (user.role !== 'seller') {
      throw new ForbiddenException('Only registered and verified sellers can perform this action');
    }

    if (!user.shop || !user.shop.verified) {
      throw new ForbiddenException(SELLER_VERIFICATION_MESSAGE);
    }

    return true;
  }
}
