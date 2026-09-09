import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      success: true,
      message: 'Cbez B2C Backend API is running smoothly',
      data: {
        version: '1.0.0',
        status: 'online',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

