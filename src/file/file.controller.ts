import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  NotImplementedException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Response,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileService } from './file.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response as Res } from 'express';
import * as mime from 'mime-types';
import { resObj } from 'src/utils';
import { FolderService } from 'src/folder/folder.service';

@Controller('file')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly folderService: FolderService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-file')
  @UseInterceptors(FilesInterceptor('files', 20))
  async saveFile(
    @Req() req: Request,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Query('parentId') parentId: number,
  ) {
    const user = req.user as { id: string; email: string };
    const fixedFiles = files.map((f) => {
      const correctedName = Buffer.from(f.originalname, 'latin1').toString(
        'utf8',
      );
      return { ...f, originalname: correctedName };
    });

    if (parentId) {
      await Promise.all(
        fixedFiles.map((f) =>
          this.fileService.uploadFile(user.id, f, +parentId),
        ),
      );
    } else {
      const mainFolderId = await this.folderService.getUserMainFolderId(
        user.id,
      );
      await Promise.all(
        fixedFiles.map((f) =>
          this.fileService.uploadFile(user.id, f, mainFolderId),
        ),
      );
    }

    return resObj(201, 'Video uploaded successfully!', []);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-file/:fileId')
  async getFile(@Req() req: Request, @Param('fileId') fileId: number) {
    const user = req.user as { id: string; email: string };

    const result = await this.fileService.getFile(user.id, +fileId);
    return resObj(200, 'File retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recently-uploaded/')
  async getRecentUserFilesAndFolders(@Req() req: Request) {
    const user = req.user as { id: string; email: string };

    const result = await this.fileService.getRecentUserFilesAndFolders(user.id);
    return resObj(200, 'Files and folders retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-videos')
  async getVideos(
    @Req() req: Request,
    @Query('order') order: 'asc' | 'desc',
    @Query('extension') extension: string,
    @Query('duration') duration: number,
    @Query('sortBy') sortBy: string,
    @Query('page') page: number,
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.fileService.getVideos(
      user.id,
      order || 'desc',
      extension,
      duration || 0,
      sortBy,
      +page,
    );

    return resObj(200, 'Videos retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-images')
  async getImage(
    @Req() req: Request,
    @Query('order') order: 'asc' | 'desc',
    @Query('extension') extension: string,
    @Query('page') page: number,
    @Query('sortBy') sortBy: 'name' | 'createdAt' | 'extension' | 'sizeInKb',
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.fileService.getImages(
      user.id,
      order || 'desc',
      extension,
      +page,
      sortBy,
    );

    return resObj(200, 'Images retrieved successfully', result);
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
  @Get('download/:fileId')
  async downloadFile(
    @Req() req: Request,
    @Param('fileId', new ParseIntPipe()) fileId: number,
    @Response() res: Res,
  ) {
    const user = req.user as { id: string; email: string };
    try {
      const { stream, stats, fileName, extension } =
        await this.fileService.downloadFile(user.id, fileId);
      const contentType = mime.lookup(extension) || 'application/octet-stream';
      const correctedName = Buffer.from(fileName, 'latin1').toString('utf8');
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=${correctedName}`,
        'Content-Length': stats.size,
      });
      res.status(200);

      stream.pipe(res);

      stream.on('error', (err) => {
        if (!res.headersSent) {
          res.status(500).send({
            message: `Failed to download file:${fileName} (${err.message})`,
          });
        }
        stream.destroy();
      });

      res.on('close', () => {
        stream.destroy();
      });
      res.on('end', () => {
        stream.destroy();
      });
      res.on('abort', () => {
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
