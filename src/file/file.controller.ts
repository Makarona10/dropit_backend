import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  NotImplementedException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Response,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response as Res } from 'express';
import { lookup } from 'mime-type';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-file/:userId')
  @UseInterceptors(FileInterceptor('file'))
  async saveFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('directory', new ParseIntPipe()) parentId: number,
  ) {
    await this.fileService.uploadFile(userId, file, parentId);
    return {
      message: 'File upload successfully',
      statusCode: 201,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('recently-uploaded/:userId')
  async getRecentUserFilesAndFolders(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    const result = await this.fileService.getRecentUserFilesAndFolders(userId);
    return {
      data: result,
      statusCode: 200,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-favourite/:userId')
  async getFavouriteFiles(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('order') order: 'asc' | 'desc' | null,
    @Body('filter') filter: 'images' | 'videos' | 'audios' | null,
    @Body('page') page: number | null,
  ) {
    const _page: number = page ? page : 1;
    const result = await this.fileService.getFavouriteFiles(userId, {
      order,
      filter,
      page: _page,
    });

    return {
      data: result,
      message: 'Favourite files retrieved successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:userId')
  async deleteFilePermanently(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('fileId', new ParseIntPipe()) fileId: number,
  ) {
    await this.fileService.deleteOwnedFile(userId, fileId);

    return {
      message: 'File deleted permanently',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-directory/:userId')
  async changeFileDirectory(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('fileId', new ParseIntPipe()) fileId: number,
    @Body('folderId', new ParseIntPipe()) folderId: number,
  ) {
    return await this.fileService.changeFileDirectory(userId, fileId, folderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('download/:userId')
  async downloadFile(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('fileId', new ParseIntPipe()) fileId: number,
    @Response() res: Res,
  ) {
    try {
      const { stream, stats, fileName, extension } =
        await this.fileService.downloadFile(userId, fileId);
      const contentType = lookup(extension) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Length', stats.size);

      stream.pipe(res);

      stream.on('error', (err) => {
        if (!res.headersSent) {
          res.status(500).json({
            message: `Failed to download file:${fileName} (${err.message})`,
          });
        }
      });

      res.on('close', () => {
        stream.destroy();
      });
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message ||
          error?.message ||
          'Error happened while downloading the file, try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('share/:userId')
  async shareFile(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    return this.fileService.shareFile();
  }
}
