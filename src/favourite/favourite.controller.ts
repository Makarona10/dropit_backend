import {
  Controller,
  Delete,
  NotImplementedException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FavouriteService } from './favourite.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('favourite')
export class FavouriteController {
  constructor(private readonly favouriteService: FavouriteService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add-file/:userId')
  async addFileToFavourites(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    await this.favouriteService.addFileToFavourite(userId, fileId);

    return {
      message: 'File added to favourites successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('remove-file/:userId')
  async removeFileFromFavourite(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    await this.favouriteService.removeFileFromFavourites(userId, fileId);

    return {
      message: 'File removed from favourites',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-folder/:userId')
  async addFolderToFavourites(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('folderId', new ParseIntPipe()) folderId: number,
  ) {
    throw new NotImplementedException('Coming soon...');
  }
}
