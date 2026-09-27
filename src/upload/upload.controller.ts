import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Req,
  BadRequestException,
  Query,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Generic Single Image Upload (Supports S3 Cloud Upload)
   * POST /api/upload/single?folder=shops|categories|products|brands
   * Field name: "file" or "image"
   */
  @Post('single')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadSingle(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image file was uploaded. Please provide a file in the form-data.');
    }
    const file = files[0];
    const data = await this.uploadService.formatFileResponseAsync(file, req, folder || 'general');

    return {
      success: true,
      message: 'Image uploaded successfully',
      data,
    };
  }

  /**
   * Direct Base64 Image Upload to S3 Endpoint
   * POST /api/upload/base64
   * Body: { image: "data:image/jpeg;base64,...", folder: "products" }
   */
  @Post('base64')
  async uploadBase64(
    @Body('image') image: string,
    @Body('folder') folder?: string,
    @Body('images') images?: string[],
  ) {
    if (Array.isArray(images) && images.length > 0) {
      const urls = await Promise.all(
        images.map((img) => this.uploadService.uploadBase64Image(img, folder || 'products')),
      );
      return {
        success: true,
        message: `${urls.length} Base64 images converted & uploaded to AWS S3 successfully`,
        data: { urls, url: urls[0] },
      };
    }

    if (!image) {
      throw new BadRequestException('No Base64 image payload provided.');
    }

    const url = await this.uploadService.uploadBase64Image(image, folder || 'general');
    return {
      success: true,
      message: 'Base64 image converted & uploaded to AWS S3 successfully',
      data: { url, urls: [url] },
    };
  }

  /**
   * Generic Multiple Images Upload (e.g. up to 10 product images to S3)
   * POST /api/upload/multiple?folder=products
   * Field names: "files" or "images"
   */
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files were uploaded. Please provide files in the form-data.');
    }
    const data = await this.uploadService.formatMultipleFilesResponseAsync(files, req, folder || 'products');

    return {
      success: true,
      message: `${files.length} images uploaded successfully`,
      data,
    };
  }

  /**
   * Shop Profile Image Upload
   * POST /api/upload/shop
   */
  @Post('shop')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadShopImage(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please provide a shop image file in the form-data.');
    }
    const file = files[0];
    const data = await this.uploadService.formatFileResponseAsync(file, req, 'shops');

    return {
      success: true,
      message: 'Shop profile image uploaded successfully',
      data,
    };
  }

  /**
   * Product Images Upload
   * POST /api/upload/product
   */
  @Post('product')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please provide product image file(s) in the form-data.');
    }

    if (files.length === 1) {
      const data = await this.uploadService.formatFileResponseAsync(files[0], req, 'products');
      return {
        success: true,
        message: 'Product image uploaded successfully',
        data: {
          ...data,
          urls: [data.url],
        },
      };
    }

    const data = await this.uploadService.formatMultipleFilesResponseAsync(files, req, 'products');
    return {
      success: true,
      message: `${files.length} product images uploaded successfully`,
      data,
    };
  }

  /**
   * Category Image Upload
   * POST /api/upload/category
   */
  @Post('category')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadCategoryImage(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please provide a category image file in the form-data.');
    }
    const file = files[0];
    const data = await this.uploadService.formatFileResponseAsync(file, req, 'categories');

    return {
      success: true,
      message: 'Category image uploaded successfully',
      data,
    };
  }

  /**
   * Brand Logo Upload
   * POST /api/upload/brand
   */
  @Post('brand')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadBrandLogo(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please provide a brand logo file in the form-data.');
    }
    const file = files[0];
    const data = await this.uploadService.formatFileResponseAsync(file, req, 'brands');

    return {
      success: true,
      message: 'Brand logo uploaded successfully',
      data,
    };
  }
}
