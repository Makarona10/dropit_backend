import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { File } from '@prisma/client';
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
    order: 'desc' | 'asc',
    type?: 'image' | 'video' | 'audio' | 'other',
  ): Promise<File[]> {
    try {
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
      });

      return files;
    } catch (error: any) {
      console.error(error);
      throw new InternalServerErrorException('Unexpected error happened!');
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
      console.error(error);
      throw new HttpException(
        error?.response?.message || "File doesn't exist",
        error?.response?.statusCode || 500,
      );
    }
  }
}
