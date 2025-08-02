import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotImplementedException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { FavouriteService } from './favourite.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { resObj } from 'src/utils';

@Controller('favourite')
export class FavouriteController {
  constructor(private readonly favouriteService: FavouriteService) {}

  @UseGuards(JwtAuthGuard)
  @Get('get-favourite')
  async getFavouriteFiles(
    @Req() req: Request,
    @Query('order') order: 'asc' | 'desc' | null,
    @Query('sortBy') sortBy: 'name' | 'extension' | 'sizeInKb' | 'createdAt',
    @Query('type') type: 'image' | 'video' | 'audio' | 'other',
    @Query('page') page: number,
  ) {
    if (+page < 1)
      return new BadRequestException('page number must me greater than 0');
    const user = req.user as { id: string; email: string };
    const _page: number = page ? page : 1;
    const result = await this.favouriteService.getFavouriteFiles(user.id, {
      order,
      sortBy,
      type,
      page: _page,
    });

    return resObj(200, 'Favourite files retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-file')
  async addFileToFavourites(
    @Req() req: Request,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.favouriteService.addFileToFavourite(user.id, fileId);

    return {
      message: 'File added to favourites successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('remove-file')
  async removeFileFromFavourite(
    @Req() req: Request,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.favouriteService.removeFileFromFavourites(user.id, fileId);

    return resObj(200, 'File removed successfully from favourites', []);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-images')
  async getFavouriteImages(
    @Req() req: Request,
    @Param('order') order: 'asc' | 'desc' | null,
    @Param('extension') extension: string | null,
    @Query('page') page: number,
  ) {
    if (+page < 1)
      return new BadRequestException('page number must me greater than 0');
    const user = req.user as { id: string; email: string };
    const result = await this.favouriteService.getFavouriteImages(
      user.id,
      order,
      extension,
      page || 1,
    );

    return resObj(200, 'Favourite images retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-folder')
  async addFolderToFavourites(
    @Req() req: Request,
    @Query('folderId', new ParseIntPipe()) folderId: number,
  ) {
    throw new NotImplementedException('Coming soon...');
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-favourite-videos')
  async getFavouriteVideos(
    @Req() req: Request,
    @Query('order') order: 'asc' | 'desc',
    @Query('sortBy') sortBy: 'name' | 'sizeInKb' | 'createdAt' | 'extension',
    @Query('extension') extension: string,
    @Query('duration') duration: number,
    @Query('page') page: number,
  ) {
    if (+page < 1)
      return new BadRequestException('page number must me greater than 0');

    const user = req.user as { id: string; email: string };
    const result = await this.favouriteService.getFavouriteVideos(
      user.id,
      order,
      extension,
      sortBy,
      duration,
      page,
    );

    return resObj(200, 'Favourite videos retrieved successfully', result);
  }
}
