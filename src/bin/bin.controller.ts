import {
  Controller,
  Delete,
  Get,
  NotImplementedException,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BinService } from './bin.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';
import { resObj } from 'src/utils';

@Controller('bin')
export class BinController {
  constructor(private readonly binService: BinService) {}

  @UseGuards(JwtAuthGuard)
  @Post('move-file-to-bin')
  async moveFileToBin(
    @Req() req: Request,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.binService.moveFileToBin(user.id, fileId);
    return resObj(200, 'File moved to trash successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Post('move-folder-to-bin')
  async moveFolderToBin(
    @Req() req: Request,
    @Query('folderId', new ParseIntPipe()) fileId: number,
  ) {
    throw new NotImplementedException('Not Implemented yet');
  }

  @UseGuards(JwtAuthGuard)
  @Post('clean-bin')
  async cleanBin(
    @Req() req: Request,
    @Query('folderId', new ParseIntPipe()) fileId: number,
  ) {
    throw new NotImplementedException('Coming soon...');
  }

  @UseGuards(JwtAuthGuard)
  @Get('deleted-files')
  async getDeletedFiles(
    @Req() req: Request,
    @Query('order_by_date') order: 'desc' | 'asc',
    @Query('type')
    type: 'image' | 'video' | 'audio' | 'other',
  ) {
    const user = req.user as { id: string; email: string };
    const files = await this.binService.getDeletedFiles(
      user.id,
      order || 'desc',
      type,
    );

    return resObj(200, 'Deleted files retrieved successfully', files);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete-file-permanently')
  async deleteFilePermanently(
    @Req() req: Request,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.binService.deleteFilePermanently(fileId, user.id);

    return resObj(200, 'File deleted successfully', []);
  }
}
