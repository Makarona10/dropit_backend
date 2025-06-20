import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BinService {
  constructor(private readonly prismaService: PrismaService) {}

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
      console.error(error);
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
        orderBy: {
          DeletedFiles: {
            deletedAt: order,
          },
        },
        skip: (page - 1) * itemsPerPage,
        take: itemsPerPage,
      });

      return { pages, files };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || "File doesn't exist",
        error?.response?.statusCode || 500,
      );
    }
  }

  async deleteFilePermanently(fileId: number, userId: string) {
    try {
      await this.prismaService.file.delete({
        where: {
          userId,
          id: fileId,
        },
      });
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || "File doesn't exist",
        error?.response?.statusCode || 500,
      );
    }
  }
}
