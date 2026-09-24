import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ShopsModule } from './shops/shops.module';
import { ProductsModule } from './products/products.module';
import { LeadsModule } from './leads/leads.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { UsersModule } from './users/users.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { FollowsModule } from './follows/follows.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { NetworkModule } from './network/network.module';
import { LocationModule } from './location/location.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UploadModule } from './upload/upload.module';
import { BannersModule } from './banners/banners.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ShopsModule,
    ProductsModule,
    LeadsModule,
    CategoriesModule,
    BrandsModule,
    UsersModule,
    ActivityLogsModule,
    FollowsModule,
    WishlistModule,
    NetworkModule,
    LocationModule,
    SubscriptionsModule,
    UploadModule,
    BannersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
