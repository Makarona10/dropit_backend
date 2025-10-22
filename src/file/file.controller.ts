import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
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

    return resObj(201, 'Files uploaded successfully!', []);
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
    @Response({ passthrough: false }) res: Res,
  ) {
    const user = req.user as { id: string; email: string };
    const haveAccess = await this.fileService.haveAccessToFile(
      user.id,
      +fileId,
    );
    if (!haveAccess) {
      throw new ForbiddenException('You do not have access to this file');
    }
    try {
      const { stream, stats, fileName, extension } =
        await this.fileService.downloadFile(+fileId);
      const contentType = mime.lookup(extension) || 'application/octet-stream';
      const correctedName = Buffer.from(fileName, 'latin1').toString('utf8');
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=${correctedName}`,
        'Content-Length': stats.size,
        'Accept-Ranges': 'bytes', // Allows partial downloads
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
        error.message ||
          'Error happened while downloading the file, try again in a minute',
        error?.status || 500,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('shared/shared-files')
  async getSharedFiles(
    @Req() req: Request,
    @Query('name') name: string,
    @Query('type') type: 'image' | 'video' | 'audio' | 'other',
    @Query('ownerEmail') ownerEmail: number,
    @Query('order') order: string,
    @Query('page') page: number,
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.fileService.getSharedFiles({
      userId: user.id,
      name,
      type,
      ownerEmail,
      order,
      page,
    });
    return resObj(200, 'Shared files retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shared/videos')
  async getShareVideos(
    @Req() req: Request,
    @Query('name') name: string,
    @Query('ownerEmail') ownerEmail: number,
    @Query('order') order: string,
    @Query('sortBy') sortBy: string,
    @Query('page') page: number,
    @Query('extension') extension: string,
    @Query('duration') duration: number,
    @Query('sizeInKb') sizeInKb: number,
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.fileService.getSharedVideos({
      userId: user.id,
      name,
      ownerEmail,
      order,
      page,
      sizeInKb,
      duration,
      extension,
      sortBy,
    });
    return resObj(200, 'Shared videos retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shared/images')
  async getShareImages(
    @Req() req: Request,
    @Query('name') name: string,
    @Query('ownerEmail') ownerEmail: string,
    @Query('order') order: 'asc' | 'desc',
    @Query('page') page: number,
    @Query('sortBy') sortBy: 'name' | 'createdAt' | 'extension' | 'sizeInKb',
    @Query('extension') extension: string,
    @Query('sizeInKb') sizeInKb: number,
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.fileService.getSharedImages({
      userId: user.id,
      name,
      extension,
      sizeInKb: +sizeInKb,
      ownerEmail,
      order: order || 'desc',
      page: +page || 1,
      sortBy: sortBy || 'createdAt',
    });
    return resObj(200, 'Shared images retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shared/get-file/:fileId')
  async getSharedFile(@Req() req: Request, @Param('fileId') fileId: number) {
    const user = req.user as { id: string; email: string };
    const result = await this.fileService.getSharedFile(user.id, +fileId);
    return resObj(200, 'Shared file retrieved successfully', result);
  }
}
