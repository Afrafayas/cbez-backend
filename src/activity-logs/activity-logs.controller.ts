import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivityLogsService } from './activity-logs.service';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  async findMine(@Request() req: any) {
    return this.activityLogsService.findMine(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.activityLogsService.findByUser(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll() {
    return this.activityLogsService.findAll();
  }
}
