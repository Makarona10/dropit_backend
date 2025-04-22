import {
  Controller,
  Delete,
  Get,
  NotImplementedException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BinService } from './bin.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('bin')
export class BinController {
  constructor(private readonly binService: BinService) {}

  @UseGuards(JwtAuthGuard)
  @Post('move-file-to-bin/:userId')
  async moveFileToBin(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    return this.binService.moveFileToBin(userId, fileId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('move-folder-to-bin/:userId')
  async moveFolderToBin(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('folderId', new ParseIntPipe()) fileId: number,
  ) {
    throw new NotImplementedException('Not Implemented yet');
  }

  @UseGuards(JwtAuthGuard)
  @Post('clean-bin/:userId')
  async cleanBin(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('folderId', new ParseIntPipe()) fileId: number,
  ) {
    throw new NotImplementedException('Coming soon...');
  }

  // @UseGuards(JwtAuthGuard)
  @Get('deleted-files/:userId')
  async getDeletedFiles(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('order_by_date') order: 'desc' | 'asc',
    @Query('type')
    type: 'image' | 'video' | 'audio' | 'other',
  ) {
    const files = await this.binService.getDeletedFiles(
      userId,
      order || 'desc',
      type,
    );

    return files;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete-file-permanently/:userId')
  async deleteFilePermanently(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    await this.binService.deleteFilePermanently(fileId, userId);

    return {
      message: 'File deleted successfully!',
    };
  }
}
