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
  Req,
  Response,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response as Res } from 'express';
import { lookup } from 'mime-type';
import { resObj } from 'src/utils';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-file')
  @UseInterceptors(FileInterceptor('file'))
  async saveFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Query('parentId') parentId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.fileService.uploadFile(user.id, file, +parentId);
    return resObj(201, 'File uploaded successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recently-uploaded/')
  async getRecentUserFilesAndFolders(@Req() req: Request) {
    const user = req.user as { id: string; email: string };

    const result = await this.fileService.getRecentUserFilesAndFolders(user.id);
    return resObj(200, 'Files and folders retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-files')
  async getFiles(
    @Req() req: Request,
    @Body('order') order: 'asc' | 'desc' | null,
    @Body('filter') filter: 'images' | 'videos' | 'audios' | null,
    @Body('page') page: number | null,
  ) {
    throw new NotImplementedException();
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-favourite')
  async getFavouriteFiles(
    @Req() req: Request,
    @Body('order') order: 'asc' | 'desc' | null,
    @Body('filter') filter: 'images' | 'videos' | 'audios' | null,
    @Body('page') page: number | null,
  ) {
    const user = req.user as { id: string; email: string };
    const _page: number = page ? page : 1;
    const result = await this.fileService.getFavouriteFiles(user.id, {
      order,
      filter,
      page: _page,
    });

    return resObj(200, 'Favourite files retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete')
  async deleteFilePermanently(
    @Req() req: Request,
    @Body('fileId', new ParseIntPipe()) fileId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.fileService.deleteOwnedFile(user.id, fileId);

    return resObj(200, 'File deleted permanently', []);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-directory')
  async changeFileDirectory(
    @Req() req: Request,
    @Body('fileId', new ParseIntPipe()) fileId: number,
    @Body('folderId', new ParseIntPipe()) folderId: number,
  ) {
    const user = req.user as { id: string; email: string };

    await this.fileService.changeFileDirectory(user.id, fileId, folderId);

    return resObj(200, 'Directory changed successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Get('download')
  async downloadFile(
    @Req() req: Request,
    @Query('fileId', new ParseIntPipe()) fileId: number,
    @Response() res: Res,
  ) {
    const user = req.user as { id: string; email: string };
    try {
      const { stream, stats, fileName, extension } =
        await this.fileService.downloadFile(user.id, fileId);
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
  @Get('share')
  async shareFile(
    @Req() req: Request,
    @Query('fileId', new ParseIntPipe()) fileId: number,
  ) {
    throw new NotImplementedException('Coming soon...');
    const user = req.user as { id: string; email: string };
    return this.fileService.shareFile();
  }
}
