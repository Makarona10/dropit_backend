import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FavouriteService {
  constructor(private readonly prismaService: PrismaService) {}

  async addFileToFavourite(userId: string, fileId: number): Promise<any> {
    try {
      const row = await this.prismaService.favourite.findFirst({
        where: { userId, fileId },
      });
      if (!row) {
        await this.prismaService.favourite.create({
          data: {
            userId,
            fileId,
          },
        });
      }
      Promise.resolve();
    } catch (error: any) {
      throw new HttpException(
        error?.response?.data?.message || 'Unexpected error happened!',
        error?.response?.data?.statusCode || 500,
      );
    }
  }

  async removeFileFromFavourites(userId: string, fileId: number) {
    try {
      await this.prismaService.favourite.delete({
        where: {
          fileId_userId: {
            userId,
            fileId,
          },
        },
      });
      Promise.resolve();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'P2025')
        throw new BadRequestException('File is not favourite');
      throw new InternalServerErrorException('Unexpected error happened!');
    }
  }

  async getFavouriteImages(
    userId: string,
    order: 'desc' | 'asc',
    extension: string,
    page: number,
  ) {
    try {
      const pageSize = 24;
      const skip = (page - 1) * pageSize;

      const count = await this.prismaService.file.count({
        where: {
          userId,
          type: 'image',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
          Favourite: {
            some: {
              userId,
            },
          },
        },
      });
      const pages = count === 0 ? 0 : Math.ceil(count / pageSize);

      const images = await this.prismaService.file.findMany({
        where: {
          userId,
          type: 'image',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
          Favourite: {
            some: {
              userId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          uniqueName: true,
          sizeInKb: true,
          type: true,
          extension: true,
          createdAt: true,
          Image: {
            select: {
              resolution: true,
            },
          },
          Favourite: {
            select: {
              fileId: true,
            },
            where: {
              userId,
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: order,
        },
        skip,
        take: pageSize,
      });

      const imgs = images.map((file) => ({
        id: file.id,
        name: file.name,
        uniqueName: file.uniqueName,
        sizeInKb: file.sizeInKb,
        type: file.type,
        extension: file.extension,
        createdAt: file.createdAt,
        resolution: file.Image?.resolution,
        isFavourite: true,
      }));

      return { images: imgs, pages };
    } catch (error) {
      throw new HttpException(
        error?.response?.message ||
          error?.message ||
          'Error happened while retrieving images, try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }
}
