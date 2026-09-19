import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Req,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Generic Single Image Upload
   * POST /api/upload/single?folder=shops|categories|products|brands
   * Field name: "file" or "image"
   */
  @Post('single')
  @UseInterceptors(AnyFilesInterceptor())
  uploadSingle(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image file was uploaded. Please provide a file in the form-data.');
    }
    const file = files[0];
    const data = this.uploadService.formatFileResponse(file, req, folder || 'general');

    return {
      success: true,
      message: 'Image uploaded successfully',
      data,
    };
  }

  /**
   * Generic Multiple Images Upload (e.g. up to 10 product images)
   * POST /api/upload/multiple?folder=products
   * Field names: "files" or "images"
   */
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files were uploaded. Please provide files in the form-data.');
    }
    const data = this.uploadService.formatMultipleFilesResponse(files, req, folder || 'products');

    return {
      success: true,
      message: `${files.length} images uploaded successfully`,
      data,
    };
  }

  /**
   * Shop Profile Image Upload
   * POST /api/upload/shop
   * Field name: "file" or "image"
   */
  @Post('shop')
  @UseInterceptors(AnyFilesInterceptor())
  uploadShopImage(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please provide a shop image file in the form-data.');
    }
    const file = files[0];
    const data = this.uploadService.formatFileResponse(file, req, 'shops');

    return {
      success: true,
      message: 'Shop profile image uploaded successfully',
      data,
    };
  }

  /**
   * Product Images Upload (Single or Multiple, up to 10)
   * POST /api/upload/product
   * Field names: "files", "images", "file", or "image"
   */
  @Post('product')
  @UseInterceptors(AnyFilesInterceptor())
  uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please provide product image file(s) in the form-data.');
    }

    if (files.length === 1) {
      const data = this.uploadService.formatFileResponse(files[0], req, 'products');
      return {
        success: true,
        message: 'Product image uploaded successfully',
        data: {
          ...data,
          urls: [data.url],
        },
      };
    }

    const data = this.uploadService.formatMultipleFilesResponse(files, req, 'products');
    return {
      success: true,
      message: `${files.length} product images uploaded successfully`,
      data,
    };
  }

  /**
   * Category Image / Banner Upload
   * POST /api/upload/category
   * Field name: "file" or "image"
   */
  @Post('category')
  @UseInterceptors(AnyFilesInterceptor())
  uploadCategoryImage(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please provide a category image file in the form-data.');
    }
    const file = files[0];
    const data = this.uploadService.formatFileResponse(file, req, 'categories');

    return {
      success: true,
      message: 'Category image uploaded successfully',
      data,
    };
  }

  /**
   * Brand Logo Upload
   * POST /api/upload/brand
   * Field name: "file" or "image"
   */
  @Post('brand')
  @UseInterceptors(AnyFilesInterceptor())
  uploadBrandLogo(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please provide a brand logo file in the form-data.');
    }
    const file = files[0];
    const data = this.uploadService.formatFileResponse(file, req, 'brands');

    return {
      success: true,
      message: 'Brand logo uploaded successfully',
      data,
    };
  }
}
