import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivityLogsService } from './activity-logs.service';
import { VerifiedSellerGuard } from '../auth/verified-seller.guard';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Post()
  async createLog(
    @Body() body: { action: string; details?: string; userId?: string; sellerId?: string },
    @Request() req: any,
  ) {
    let tokenUserId: string | null = null;
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          tokenUserId = payload.sub || payload.id || null;
        }
      } catch (e) {
        // Fallback gracefully
      }
    }

    const finalUserId = body.userId || tokenUserId || null;
    const ipAddress =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      null;
    const userAgent = (req.headers?.['user-agent'] as string) || null;

    const isSameUser = Boolean(
      finalUserId &&
      body.sellerId &&
      String(finalUserId).trim().toLowerCase() === String(body.sellerId).trim().toLowerCase()
    );

    let cleanDetails = body.details;
    if (isSameUser && cleanDetails) {
      // Strip seller shop attribution so it does not trigger seller customer log
      cleanDetails = cleanDetails.replace(/\(Shop:[^)]+\)/gi, '(Self view)').replace(/listed by "[^"]+"/gi, '(Own shop)');
    }

    const log = await this.activityLogsService.log(
      finalUserId,
      body.action,
      cleanDetails,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Activity logged successfully',
      data: log,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  async findMine(@Request() req: any) {
    return this.activityLogsService.findMine(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), VerifiedSellerGuard)
  @Get('seller/customers')
  async findSellerCustomerLogs(@Request() req: any, @Query('shopId') shopId?: string) {
    return this.activityLogsService.findSellerCustomerLogs(req.user?.id, shopId);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Request() req: any,
    @Query('currentUserId') currentUserId?: string,
  ) {
    let currentUser = req.user || null;
    if (!currentUser) {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            const uid = payload.sub || payload.id || payload.userId;
            if (uid) {
              currentUser = await this.activityLogsService.getUserById(uid);
            }
          }
        } catch (e) {}
      }
    }

    if (!currentUser && currentUserId) {
      currentUser = await this.activityLogsService.getUserById(currentUserId);
    }

    return this.activityLogsService.findByUser(userId, currentUser);
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('userId') queryUserId?: string,
    @Query('sellerId') querySellerId?: string,
  ) {
    let currentUser = req.user || null;

    if (!currentUser) {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            const uid = payload.sub || payload.id || payload.userId;
            if (uid) {
              currentUser = await this.activityLogsService.getUserById(uid);
            }
          }
        } catch (e) {}
      }
    }

    const testId = queryUserId || querySellerId;
    if (!currentUser && testId) {
      currentUser = await this.activityLogsService.getUserById(testId);
    }

    return this.activityLogsService.findAll(currentUser);
  }
}

