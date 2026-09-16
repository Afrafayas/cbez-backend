import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

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

  async assignPlanToShop(dto: AssignSubscriptionDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
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

    const subscription = await this.prisma.shopSubscription.upsert({
      where: { shopId: dto.shopId },
      create: {
        shopId: dto.shopId,
        planId: dto.planId,
      },
      update: {
        planId: dto.planId,
      },
      include: {
        plan: true,
        shop: true,
      },
    });

    return {
      success: true,
      message: `Shop "${shop.name}" subscribed to plan "${plan.name}" successfully`,
      data: { subscription },
    };
  }

  async getShopSubscription(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException(`Shop with ID "${shopId}" not found`);
    }

    const sub = await this.prisma.shopSubscription.findUnique({
      where: { shopId },
      include: { plan: true },
    });

    const activeProductCount = await this.prisma.product.count({
      where: { shopId },
    });

    return {
      success: true,
      message: 'Shop subscription fetched successfully',
      data: {
        shopId,
        shopName: shop.name,
        verified: shop.verified,
        subscription: sub ? sub : null,
        usage: {
          planName: sub ? sub.plan.name : 'None',
          currentProducts: activeProductCount,
          productLimit: sub ? sub.plan.productLimit : 0,
          remaining: sub ? Math.max(0, sub.plan.productLimit - activeProductCount) : 0,
          canAddProduct: sub ? (sub.plan.status === 'ACTIVE' && activeProductCount < sub.plan.productLimit) : false,
        },
      },
    };
  }

  async checkProductLimit(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new ForbiddenException('Shop profile not found');
    }

    if (!shop.verified) {
      throw new ForbiddenException('Your shop account is pending Admin verification. You can upload products once Admin approves your shop.');
    }

    const sub = await this.prisma.shopSubscription.findUnique({
      where: { shopId },
      include: { plan: true },
    });

    if (!sub || !sub.plan || sub.plan.status !== 'ACTIVE') {
      throw new ForbiddenException('Your shop does not have an active subscription plan assigned. Please contact Admin to assign a subscription plan.');
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
    };
  }
}
