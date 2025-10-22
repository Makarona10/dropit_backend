import {
  BadRequestException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageQuotaService } from 'src/storage-quota/storage-quota.service';
import fs from 'fs/promises';
import path from 'path';

@Injectable()
export class BinService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly quotaService: StorageQuotaService,
  ) {}

  async moveFileToBin(userId: string, fileId: number): Promise<any> {
    try {
      const file = await this.prismaService.file.findFirst({
        where: {
          userId,
          id: fileId,
        },
      });

      if (file) {
        await this.prismaService.deletedFiles.create({
          data: {
            fileId,
          },
        });
        return Promise.resolve();
      }

      throw new BadRequestException("File doesn't exist !");
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Unexpected error happened !',
        error?.response?.statusCode || 500,
      );
    }
  }

  async getDeletedFiles(
    userId: string,
    page: number,
    order: 'desc' | 'asc',
    type?: 'image' | 'video' | 'audio' | 'other',
  ): Promise<{
    pages: number;
    files: Array<any>;
  }> {
    try {
      const deletedFilesCount = await this.prismaService.deletedFiles.count({
        where: {
          file: {
            userId: userId,
            ...(type && { type }),
          },
        },
      });

      const itemsPerPage = 24;
      const pages =
        deletedFilesCount === 0 ? 0 : Math.ceil(deletedFilesCount / 24);

      const files = await this.prismaService.file.findMany({
        where: {
          DeletedFiles: {
            isNot: null,
          },
          userId,
          ...(type && { type }),
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          Favourite: true,
          type: true,
          extension: true,
          sizeInKb: true,
          uniqueName: true,
          userId: true,
          Image: {
            select: {
              thumbnail: true,
              resolution: true,
            },
          },
          Video: {
            select: {
              resolution: true,
              thumbnail: true,
              duration: true,
              fps: true,
            },
          },
          Audio: {
            select: {
              duration: true,
            },
          },
        },
        orderBy: {
          DeletedFiles: {
            deletedAt: order,
          },
        },
        skip: (page - 1) * itemsPerPage,
        take: itemsPerPage,
      });

      const finalRes = files.map((f) => ({
        ...f,
        deleted: true,
        thumbnail: f.Video?.thumbnail || f.Image?.thumbnail,
        duration: f.Video?.duration || f.Audio?.duration,
        resolution: f.Video?.resolution || f.Image?.resolution,
        fps: f.Video?.fps,
      }));

      return { pages, files: finalRes };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || "File doesn't exist",
        error?.response?.statusCode || 500,
      );
    }
  }

  async deleteFilePermanently(fileId: number, userId: string) {
    try {
      const file = await this.prismaService.file.findFirst({
        where: {
          id: fileId,
          userId,
        },
        select: {
          id: true,
          name: true,
          sizeInKb: true,
          uniqueName: true,
          userId: true,
          FileParent: {
            select: {
              folder: {
                select: {
                  path: true,
                  name: true,
                },
              },
            },
          },
          Image: {
            select: {
              thumbnail: true,
            },
          },
          Video: {
            select: {
              thumbnail: true,
            },
          },
        },
      });

      if (!file) return;

      await this.prismaService.file.delete({ where: { id: file.id } });
      await this.quotaService.decreaseConsumedQuota(userId, file.sizeInKb);

      const fullPath = path.join(
        __dirname,
        '../../uploads',
        file?.userId,
        file?.FileParent?.folder?.path || '',
        file?.FileParent?.folder?.name || '',
        file?.uniqueName,
      );

      const thumbnail = file?.Video?.thumbnail || file?.Image?.thumbnail || '';

      const thumbnailPath = path.join(
        __dirname,
        '../../uploads',
        file?.userId,
        'thumbnails',
        thumbnail,
      );

      await fs.unlink(fullPath);
      await fs.unlink(thumbnailPath);
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || "File doesn't exist",
        error?.response?.statusCode || 500,
      );
    }
  }

  async restoreDeletedFile(fileId: number, userId: string) {
    if (!fileId || fileId < 1) {
      throw new BadRequestException('Invalid file id!');
    }

    try {
      const file = await this.prismaService.file.findFirst({
        where: {
          userId,
          id: fileId,
          DeletedFiles: {
            fileId: fileId,
          },
        },
      });

      if (!file) throw new BadRequestException('File not found!');

      await this.prismaService.deletedFiles.delete({
        where: {
          fileId: file.id,
        },
      });

      return Promise.resolve();
    } catch (error) {
      throw new HttpException(
        error?.response?.message || "File doesn't exist",
        error?.response?.statusCode || 500,
      );
    }
  }

  async cleanBin(userId: string) {
    if (!userId)
      throw new UnauthorizedException(
        'You are unauthrized, please signup or login if you have an account!',
      );

    try {
      const deletedFiles = await this.prismaService.file.findMany({
        where: {
          userId,
          DeletedFiles: {
            fileId: {
              not: 0,
            },
          },
        },
      });

      await Promise.all(
        deletedFiles.map(async (file) => {
          this.deleteFilePermanently(file.id, userId);
        }),
      );
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Error happened!',
        error?.response?.statusCode || 500,
      );
    }
  }
}
