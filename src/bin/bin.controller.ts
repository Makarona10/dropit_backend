import {
  Controller,
  Delete,
  Get,
  Param,
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
  @Post('move-file-to-bin/:fileId')
  async moveFileToBin(
    @Req() req: Request,
    @Param('fileId', new ParseIntPipe()) fileId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.binService.moveFileToBin(user.id, fileId);
    return resObj(200, 'File moved to trash successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('clean-bin')
  async cleanBin(@Req() req: Request) {
    const user = req.user as { id: string; email: string };
    await this.binService.cleanBin(user.id);
    console.log('Bin cleaned successfully!');
    return resObj(200, 'Bin cleaned successfully!', []);
  }

  @UseGuards(JwtAuthGuard)
  @Get('deleted-files')
  async getDeletedFiles(
    @Req() req: Request,
    @Query('page') page: number,
    @Query('order') order: 'desc' | 'asc',
    @Query('type')
    type: 'image' | 'video' | 'audio' | 'other',
  ) {
    const user = req.user as { id: string; email: string };
    const files = await this.binService.getDeletedFiles(
      user.id,
      +page,
      order || 'desc',
      type,
    );

    return resObj(200, 'Deleted files retrieved successfully', files);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete-file-permanently/:fileId')
  async deleteFilePermanently(
    @Req() req: Request,
    @Param('fileId', new ParseIntPipe()) fileId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.binService.deleteFilePermanently(fileId, user.id);

    return resObj(200, 'File deleted successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Post('restore-file/:fileId')
  async restoreDeletedFile(
    @Req() req: Request,
    @Param('fileId', new ParseIntPipe()) fileId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.binService.restoreDeletedFile(fileId, user.id);

    return resObj(200, 'Deleted file restored successfully', []);
  }
}
