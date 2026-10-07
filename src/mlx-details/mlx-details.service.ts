import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMlxDetailsDto } from './dto/update-mlx-details.dto';

export const DEFAULT_MLX_DETAILS = {
  platformName: 'MLX Used Gadgets Directory',
  website: 'https://mlxmarket.in',
  supportPhone: '+91 7902613259',
  supportEmail: 'support@mlxmarket.in',
  address: 'Kochi, Kerala, India',
};

@Injectable()
export class MlxDetailsService {
  private readonly logger = new Logger(MlxDetailsService.name);

  constructor(private prisma: PrismaService) {}

  async getDetails() {
    let details = await this.prisma.mlxDetails.findFirst();
    if (!details) {
      details = await this.prisma.mlxDetails.create({
        data: DEFAULT_MLX_DETAILS,
      });
      this.logger.log('Created default MLX platform details record');
    }

    return {
      success: true,
      data: {
        id: details.id,
        platformName: details.platformName || DEFAULT_MLX_DETAILS.platformName,
        website: details.website || DEFAULT_MLX_DETAILS.website,
        websiteLink: details.website || DEFAULT_MLX_DETAILS.website,
        supportPhone: details.supportPhone || DEFAULT_MLX_DETAILS.supportPhone,
        phone: details.supportPhone || DEFAULT_MLX_DETAILS.supportPhone,
        supportEmail: details.supportEmail || DEFAULT_MLX_DETAILS.supportEmail,
        email: details.supportEmail || DEFAULT_MLX_DETAILS.supportEmail,
        address: details.address || DEFAULT_MLX_DETAILS.address,
        createdAt: details.createdAt,
        updatedAt: details.updatedAt,
      },
    };
  }

  async updateDetails(dto: UpdateMlxDetailsDto) {
    let existing = await this.prisma.mlxDetails.findFirst();

    const website = dto.website ?? dto.websiteLink;
    const supportPhone = dto.supportPhone ?? dto.phone;
    const supportEmail = dto.supportEmail ?? dto.email;

    const dataToSave: any = {};
    if (dto.platformName !== undefined) dataToSave.platformName = dto.platformName.trim();
    if (website !== undefined) dataToSave.website = website.trim();
    if (supportPhone !== undefined) dataToSave.supportPhone = supportPhone.trim();
    if (supportEmail !== undefined) dataToSave.supportEmail = supportEmail.trim();
    if (dto.address !== undefined) dataToSave.address = dto.address.trim();

    let details;
    if (existing) {
      details = await this.prisma.mlxDetails.update({
        where: { id: existing.id },
        data: dataToSave,
      });
    } else {
      details = await this.prisma.mlxDetails.create({
        data: {
          ...DEFAULT_MLX_DETAILS,
          ...dataToSave,
        },
      });
    }

    return {
      success: true,
      message: 'MLX platform details updated successfully',
      data: {
        id: details.id,
        platformName: details.platformName,
        website: details.website,
        websiteLink: details.website,
        supportPhone: details.supportPhone,
        phone: details.supportPhone,
        supportEmail: details.supportEmail,
        email: details.supportEmail,
        address: details.address,
        createdAt: details.createdAt,
        updatedAt: details.updatedAt,
      },
    };
  }
}
