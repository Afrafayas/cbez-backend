import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { SELLER_VERIFICATION_MESSAGE } from '../shops/shop-profile.helper';
import { OtpService } from '../auth/otp.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private activityLogsService: ActivityLogsService,
  ) {}

  onModuleInit() {
    // Run an initial check 5s after startup to process any pending alerts or expired plans
    setTimeout(() => {
      this.processExpiringSubscriptionAlerts().catch((err) => {
        this.logger.error(`Error in initial subscription alert run: ${err.message}`);
      });
    }, 5000);

    // Run hourly check for expiring plans and daily alerts
    setInterval(() => {
      this.processExpiringSubscriptionAlerts().catch((err) => {
        this.logger.error(`Error in scheduled subscription alert run: ${err.message}`);
      });
    }, 60 * 60 * 1000);
  }

  async createPlan(dto: CreateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(`Subscription plan with name "${dto.name}" already exists.`);
    }

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description || '',
        productLimit: Number(dto.productLimit),
        durationDays: Number(dto.durationDays || 30),
        status: dto.status || 'ACTIVE',
        price: Number(dto.price || 0),
      },
    });

    return {
      success: true,
      message: 'Subscription plan created successfully',
      data: { plan },
    };
  }

  async findAllPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    return {
      success: true,
      message: 'Subscription plans fetched successfully',
      data: { plans },
    };
  }

  async findActivePlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { productLimit: 'asc' },
    });

    return {
      success: true,
      message: 'Active subscription plans fetched successfully',
      data: { plans },
    };
  }

  async findOnePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            shop: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`);
    }

    return {
      success: true,
      message: 'Subscription plan fetched successfully',
      data: { plan },
    };
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`);
    }

    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.subscriptionPlan.findUnique({ where: { name: dto.name } });
      if (nameConflict) {
        throw new BadRequestException(`Subscription plan name "${dto.name}" is already taken.`);
      }
    }

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.productLimit !== undefined && { productLimit: Number(dto.productLimit) }),
        ...(dto.durationDays !== undefined && { durationDays: Number(dto.durationDays) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.price !== undefined && { price: Number(dto.price) }),
      },
    });

    return {
      success: true,
      message: 'Subscription plan updated successfully',
      data: { plan },
    };
  }

  async togglePlanStatus(id: string, status?: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`);
    }

    const newStatus = status ? status : plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updatedPlan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { status: newStatus },
    });

    return {
      success: true,
      message: `Subscription plan "${updatedPlan.name}" status updated to ${newStatus}`,
      data: { plan: updatedPlan },
    };
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`);
    }

    if (plan._count.subscriptions > 0) {
      throw new BadRequestException(
        `Cannot delete subscription plan "${plan.name}" because it is currently assigned to ${plan._count.subscriptions} active shop(s). Deactivate the plan instead or reassign the shops first.`,
      );
    }

    await this.prisma.subscriptionPlan.delete({ where: { id } });

    return {
      success: true,
      message: `Subscription plan "${plan.name}" deleted successfully`,
      data: { id },
    };
  }

  /**
   * Get effective subscription with automatic queued plan activation and expiry check
   */
  async getEffectiveSubscription(shopId: string) {
    let sub = await this.prisma.shopSubscription.findUnique({
      where: { shopId },
      include: { plan: true },
    });

    if (!sub) return null;

    const now = new Date();
    let endDate = sub.endDate ? new Date(sub.endDate) : null;
    if (!endDate) {
      const duration = sub.plan?.durationDays || 30;
      endDate = new Date(sub.createdAt.getTime() + duration * 86400000);
      sub = await this.prisma.shopSubscription.update({
        where: { shopId },
        data: { endDate, startDate: sub.startDate || sub.createdAt },
        include: { plan: true },
      });
    }

    // If expired, check if queued subscription is ready to activate (mobile recharge logic)
    if (endDate <= now) {
      const queued = await this.prisma.shopSubscriptionQueue.findFirst({
        where: { shopId, status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        include: { plan: true },
      });

      if (queued) {
        const newStartDate = now;
        const duration = queued.plan?.durationDays || queued.durationDays || 30;
        const newEndDate = new Date(now.getTime() + duration * 86400000);

        sub = await this.prisma.shopSubscription.update({
          where: { shopId },
          data: {
            planId: queued.planId,
            startDate: newStartDate,
            endDate: newEndDate,
            status: 'ACTIVE',
            lastAlertSentAt: null,
          },
          include: { plan: true },
        });

        await this.prisma.shopSubscriptionQueue.update({
          where: { id: queued.id },
          data: { status: 'ACTIVATED' },
        });

        return sub;
      }

      // No queued plan: mark EXPIRED if still ACTIVE
      if (sub.status !== 'EXPIRED') {
        sub = await this.prisma.shopSubscription.update({
          where: { shopId },
          data: { status: 'EXPIRED' },
          include: { plan: true },
        });
      }
    }

    return sub;
  }

  /**
   * Assign or queue a subscription plan for a shop.
   * If an active non-expired plan is running, the new plan is queued like a mobile recharge pack.
   */
  async assignPlanToShop(dto: AssignSubscriptionDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      include: { owner: true },
    });
    if (!shop) {
      throw new NotFoundException(`Shop with ID "${dto.shopId}" not found`);
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID "${dto.planId}" not found`);
    }

    if (plan.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot assign plan "${plan.name}" because it is currently INACTIVE.`);
    }

    const durationDays = plan.durationDays || 30;
    const now = new Date();

    const currentSub = await this.prisma.shopSubscription.findUnique({
      where: { shopId: dto.shopId },
      include: { plan: true },
    });

    const isCurrentActive =
      currentSub &&
      currentSub.status === 'ACTIVE' &&
      currentSub.endDate &&
      new Date(currentSub.endDate) > now &&
      !dto.forceImmediate;

    // Record Transaction if transaction info or amount provided or price > 0
    const amount = dto.amount !== undefined ? Number(dto.amount) : Number(plan.price || 0);
    const txnType = dto.type || (!shop.verified ? 'INITIAL_VERIFICATION' : isCurrentActive ? 'RENEWAL' : 'PLAN_CHANGE');

    let createdTransaction: any = null;
    if (dto.transactionMode || dto.transactionId || dto.amount !== undefined || plan.price > 0) {
      createdTransaction = await this.prisma.transaction.create({
        data: {
          shopId: dto.shopId,
          planId: plan.id,
          planName: plan.name,
          amount,
          paymentStatus: 'COMPLETED',
          type: txnType,
          transactionMode: dto.transactionMode || 'UPI',
          transactionId: dto.transactionId || null,
          notes: dto.notes || `Plan: ${plan.name} (${durationDays} days)`,
        },
      });
    }

    // MOBILE RECHARGE LOGIC:
    // If shop already has an active, non-expired subscription and forceImmediate is not set:
    // Queue the new subscription!
    if (isCurrentActive) {
      const queuedSub = await this.prisma.shopSubscriptionQueue.create({
        data: {
          shopId: dto.shopId,
          planId: plan.id,
          durationDays,
          status: 'QUEUED',
          transactionId: createdTransaction?.id || dto.transactionId || null,
          notes: dto.notes || `Queued pack to activate after current plan expires on ${new Date(currentSub.endDate!).toLocaleDateString('en-IN')}`,
        },
        include: { plan: true },
      });

      if (shop.ownerId) {
        await this.activityLogsService.log(
          shop.ownerId,
          'QUEUE_SUBSCRIPTION',
          `Queued subscription plan "${plan.name}" (${durationDays} days) for store "${shop.name}". Will activate after current plan expires on ${new Date(currentSub.endDate!).toLocaleDateString('en-IN')}.`,
        );
      }

      return {
        success: true,
        message: `Plan "${plan.name}" queued successfully. It will activate automatically after your current plan expires on ${new Date(currentSub.endDate!).toLocaleDateString('en-IN')}.`,
        data: {
          queued: true,
          queuedSubscription: queuedSub,
          currentSubscription: currentSub,
          transaction: createdTransaction,
        },
      };
    }

    // Otherwise, activate immediately!
    const startDate = now;
    const endDate = new Date(now.getTime() + durationDays * 86400000);

    const subscription = await this.prisma.shopSubscription.upsert({
      where: { shopId: dto.shopId },
      create: {
        shopId: dto.shopId,
        planId: dto.planId,
        startDate,
        endDate,
        status: 'ACTIVE',
        lastAlertSentAt: null,
      },
      update: {
        planId: dto.planId,
        startDate,
        endDate,
        status: 'ACTIVE',
        lastAlertSentAt: null,
      },
      include: {
        plan: true,
        shop: true,
      },
    });

    if (shop.ownerId) {
      await this.activityLogsService.log(
        shop.ownerId,
        'ASSIGN_SUBSCRIPTION',
        `Assigned subscription plan "${plan.name}" (${durationDays} days, valid until ${endDate.toLocaleDateString('en-IN')}) to shop "${shop.name}".`,
      );
    }

    return {
      success: true,
      message: `Shop "${shop.name}" subscribed to plan "${plan.name}" successfully (Valid for ${durationDays} days until ${endDate.toLocaleDateString('en-IN')})`,
      data: {
        queued: false,
        subscription,
        transaction: createdTransaction,
      },
    };
  }

  async getShopSubscription(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException(`Shop with ID "${shopId}" not found`);
    }

    const sub = await this.getEffectiveSubscription(shopId);
    const activeProductCount = await this.prisma.product.count({
      where: { shopId },
    });

    const now = new Date();
    const isExpired = sub ? (sub.status === 'EXPIRED' || (sub.endDate ? new Date(sub.endDate) <= now : false)) : false;
    const daysRemaining = sub?.endDate ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;
    const isExpiringSoon = !isExpired && daysRemaining <= 5 && daysRemaining >= 0;

    const queuedSub = await this.prisma.shopSubscriptionQueue.findFirst({
      where: { shopId, status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      include: { plan: true },
    });

    const productLimit = sub?.plan ? sub.plan.productLimit : 0;
    const canAddProduct = Boolean(
      shop.verified && !isExpired && sub && sub.plan.status === 'ACTIVE' && activeProductCount < productLimit,
    );

    return {
      success: true,
      message: 'Shop subscription fetched successfully',
      data: {
        shopId,
        shopName: shop.name,
        verified: Boolean(shop.verified),
        isApproved: Boolean(shop.verified),
        verificationStatus: shop.verified ? 'VERIFIED' : 'UNDER_VERIFICATION',
        verificationMessage: shop.verified
          ? 'Approved'
          : SELLER_VERIFICATION_MESSAGE,
        subscription: sub ? sub : null,
        usage: {
          planName: sub ? sub.plan.name : 'None',
          currentProducts: activeProductCount,
          productLimit,
          remaining: sub ? Math.max(0, productLimit - activeProductCount) : 0,
          durationDays: sub?.plan?.durationDays || 30,
          startDate: sub?.startDate || null,
          endDate: sub?.endDate || null,
          isExpired,
          daysRemaining,
          isExpiringSoon,
          queuedPlan: (queuedSub && queuedSub.plan) ? {
            planName: queuedSub.plan.name,
            durationDays: queuedSub.durationDays,
            status: queuedSub.status,
          } : null,
          canAddProduct,
          verificationRequired: !shop.verified,
          expirationMessage: isExpired
            ? 'Your subscription plan has expired. You cannot create new products. Please contact Admin to buy or renew a subscription plan.'
            : isExpiringSoon
            ? `Your subscription will expire in ${daysRemaining === 0 ? 'today' : `${daysRemaining} day(s)`}. Please contact Admin to renew.`
            : null,
        },
      },
    };
  }

  async getMySubscription(userId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) {
      return {
        success: true,
        message: 'No shop found for user',
        data: null,
      };
    }
    return this.getShopSubscription(shop.id);
  }

  async checkProductLimit(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new ForbiddenException('Shop profile not found');
    }

    if (!shop.verified) {
      throw new ForbiddenException(SELLER_VERIFICATION_MESSAGE);
    }

    const sub = await this.getEffectiveSubscription(shopId);

    if (!sub || !sub.plan || sub.plan.status !== 'ACTIVE') {
      throw new ForbiddenException('Your shop does not have an active subscription plan assigned. Please contact Admin to assign a subscription plan.');
    }

    const now = new Date();
    const isExpired = sub.status === 'EXPIRED' || (sub.endDate && new Date(sub.endDate) <= now);
    if (isExpired) {
      throw new ForbiddenException(
        'Your subscription plan has expired. You cannot create new products. Please contact Admin to buy or renew a subscription plan.',
      );
    }

    const currentCount = await this.prisma.product.count({ where: { shopId } });
    if (currentCount >= sub.plan.productLimit) {
      throw new ForbiddenException(
        'You have reached the maximum number of products allowed for your current subscription plan. Please upgrade or change your subscription plan to add more products.',
      );
    }

    return {
      allowed: true,
      currentCount,
      productLimit: sub.plan.productLimit,
      planName: sub.plan.name,
      endDate: sub.endDate,
    };
  }

  /**
   * Process all expiring subscriptions:
   * - Daily mobile alert to agent phone on all 5 days before expiring
   * - Automatic activation of queued pack upon expiry
   * - Mark expired and notify if no queued pack
   */
  async processExpiringSubscriptionAlerts() {
    this.logger.log('Processing expiring subscriptions and mobile alerts...');
    const subscriptions = await this.prisma.shopSubscription.findMany({
      include: {
        shop: {
          include: {
            owner: true,
          },
        },
        plan: true,
      },
    });

    const now = new Date();
    let alertsSent = 0;
    let expirationsProcessed = 0;
    let queuedActivated = 0;

    for (const sub of subscriptions) {
      if (!sub.shop || !sub.plan) continue;

      let endDate = sub.endDate ? new Date(sub.endDate) : null;
      if (!endDate) {
        const duration = sub.plan.durationDays || 30;
        endDate = new Date(sub.createdAt.getTime() + duration * 86400000);
        await this.prisma.shopSubscription.update({
          where: { id: sub.id },
          data: { endDate, startDate: sub.startDate || sub.createdAt },
        });
      }

      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      const targetPhone = sub.shop.phone || sub.shop.owner?.phone || sub.shop.whatsapp;

      // 1. Check if plan is expired
      if (diffMs <= 0) {
        // Mobile recharge logic: check queued pack
        const queued = await this.prisma.shopSubscriptionQueue.findFirst({
          where: { shopId: sub.shopId, status: 'QUEUED' },
          orderBy: { createdAt: 'asc' },
          include: { plan: true },
        });

        if (queued) {
          const newStartDate = now;
          const newDuration = queued.plan?.durationDays || queued.durationDays || 30;
          const newEndDate = new Date(now.getTime() + newDuration * 86400000);

          await this.prisma.shopSubscription.update({
            where: { id: sub.id },
            data: {
              planId: queued.planId,
              startDate: newStartDate,
              endDate: newEndDate,
              status: 'ACTIVE',
              lastAlertSentAt: null,
            },
          });

          await this.prisma.shopSubscriptionQueue.update({
            where: { id: queued.id },
            data: { status: 'ACTIVATED' },
          });

          queuedActivated++;
          const planName = queued?.plan?.name || 'Subscription Plan';
          if (sub.shop.ownerId) {
            await this.activityLogsService.log(
              sub.shop.ownerId,
              'AUTO_ACTIVATE_QUEUED_SUBSCRIPTION',
              `Queued plan "${planName}" automatically activated for store "${sub.shop.name}" after existing plan expired`,
            );
          }

          if (targetPhone) {
            await this.otpService.sendWhatsAppMessage(
              targetPhone,
              `Hello ${sub.shop.ownerName || sub.shop.name}, your queued MLX subscription plan "${planName}" has been automatically activated! It is valid until ${newEndDate.toLocaleDateString('en-IN')}. Thank you!`,
            );
          }
          continue;
        }

        // No queued pack: mark expired
        if (sub.status !== 'EXPIRED') {
          await this.prisma.shopSubscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
          });
          expirationsProcessed++;

          if (sub.shop.ownerId) {
            await this.activityLogsService.log(
              sub.shop.ownerId,
              'SUBSCRIPTION_EXPIRED',
              `Subscription plan "${sub.plan.name}" expired for store "${sub.shop.name}". Agent cannot create products without renewal.`,
            );
          }

          if (targetPhone) {
            await this.otpService.sendWhatsAppMessage(
              targetPhone,
              `Alert: Dear ${sub.shop.ownerName || sub.shop.name}, your MLX subscription plan "${sub.plan.name}" has expired. You cannot add new products until renewal. Please contact MLX Admin to buy or renew your subscription plan.`,
            );
          }
        }
        continue;
      }

      // 2. Alert logic: on all days 5 days before expiring
      if (diffDays <= 5 && diffDays >= 0 && sub.status === 'ACTIVE') {
        const lastSent = sub.lastAlertSentAt ? new Date(sub.lastAlertSentAt) : null;
        const alreadySentToday = lastSent && lastSent.toDateString() === now.toDateString();

        if (!alreadySentToday) {
          const daysText = diffDays === 0 ? 'today' : `in ${diffDays} day(s)`;
          const alertMsg = `Alert: Dear ${sub.shop.ownerName || sub.shop.name}, your MLX store subscription plan "${sub.plan.name}" will expire ${daysText} (on ${endDate.toLocaleDateString('en-IN')}). Please contact MLX Admin to renew your subscription plan and keep listing gadgets without interruption.`;

          if (targetPhone) {
            await this.otpService.sendWhatsAppMessage(targetPhone, alertMsg);
          }

          await this.prisma.shopSubscription.update({
            where: { id: sub.id },
            data: { lastAlertSentAt: now },
          });

          if (sub.shop.ownerId) {
            await this.activityLogsService.log(
              sub.shop.ownerId,
              'EXPIRY_ALERT_SENT',
              `Daily subscription expiry alert sent to ${sub.shop.name} (${targetPhone}) - ${diffDays} day(s) remaining until expiry.`,
            );
          }

          alertsSent++;
        }
      }
    }

    return {
      success: true,
      alertsSent,
      expirationsProcessed,
      queuedActivated,
      timestamp: now.toISOString(),
    };
  }
}
