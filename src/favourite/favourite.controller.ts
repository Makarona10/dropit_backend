import {
  Controller,
  Delete,
  NotImplementedException,
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
  @Post('add-folder')
  async addFolderToFavourites(
    @Req() req: Request,
    @Query('folderId', new ParseIntPipe()) folderId: number,
  ) {
    throw new NotImplementedException('Coming soon...');
  }
}
