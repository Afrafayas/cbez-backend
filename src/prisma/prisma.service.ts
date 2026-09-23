 import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _shopSubscription: any;
  public get shopSubscription(): any {
    return this._shopSubscription;
  }
  public set shopSubscription(value: any) {
    this._shopSubscription = value;
  }
  private _subscriptionPlan: any;
  public get subscriptionPlan(): any {
    return this._subscriptionPlan;
  }
  public set subscriptionPlan(value: any) {
    this._subscriptionPlan = value;
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
