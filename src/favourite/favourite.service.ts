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

  async getFavouriteFiles(
    userId: string,
    args: {
      order: 'asc' | 'desc';
      type: 'image' | 'audio' | 'video' | 'other';
      page: number;
      sortBy: 'name' | 'extension' | 'sizeInKb' | 'createdAt';
    },
  ) {
    const offset = (args.page - 1) * 24;

    const totalCountResult = await this.prismaService.file.count({
      where: {
        userId,
        Favourite: {
          some: {
            userId,
          },
        },
        ...(args.type && { type: args.type }),
      },
    });

    const totalCount = totalCountResult || 0;

    const pages = Math.ceil(totalCount / 24);

    try {
      const files = await this.prismaService.file.findMany({
        where: {
          userId,
          Favourite: {
            some: {
              userId,
            },
          },
          DeletedFiles: null,
          ...(args.type && { type: args.type }),
        },
        select: {
          id: true,
          name: true,
          userId: true,
          uniqueName: true,
          sizeInKb: true,
          type: true,
          extension: true,
          createdAt: true,
          Image: {
            select: {
              resolution: true,
              thumbnail: true,
            },
          },
          Video: {
            select: {
              resolution: true,
              duration: true,
              fps: true,
              thumbnail: true,
            },
          },
          Audio: {
            select: {
              duration: true,
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
          [args.sortBy || 'createdAt']: args.order || 'desc',
        },
        skip: offset,
        take: 24,
      });

      const theFiles = files.map((file) => ({
        ...file,
        resolution: file.Image?.resolution,
        fps: file.Video?.fps,
        duration: file.Audio?.duration,
        thumbnail: file.Image?.thumbnail || file.Video?.thumbnail,
        isFavourite: true,
      }));

      return { pages, files: theFiles };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message ||
          'Unknown error happened while retrieving favourite files, please try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }

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
          userId: true,
          Image: {
            select: {
              resolution: true,
              thumbnail: true,
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
        ...file,
        resolution: file.Image?.resolution,
        isFavourite: true,
        thumbnail: file.Image?.thumbnail,
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

  async getFavouriteVideos(
    userId: string,
    order: 'asc' | 'desc',
    extension: string | null,
    sortBy: 'name' | 'sizeInKb' | 'createdAt' | 'extension',
    duration: number,
    page: number,
  ) {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const pageSize = 24;
      const skip = (page - 1) * pageSize;

      const count = await this.prismaService.file.count({
        where: {
          userId,
          type: 'video',
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

      const videos = await this.prismaService.file.findMany({
        where: {
          userId,
          type: 'video',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
          Favourite: {
            some: {
              userId,
            },
          },
          ...(duration && { Video: { duration: { gte: +duration } } }),
        },
        select: {
          id: true,
          userId: true,
          name: true,
          uniqueName: true,
          sizeInKb: true,
          type: true,
          extension: true,
          createdAt: true,
          Video: {
            select: {
              resolution: true,
              duration: true,
              fps: true,
              thumbnail: true,
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
          ...(sortBy
            ? { [sortBy]: order || 'desc' }
            : { createdAt: order || 'desc' }),
        },
        skip,
        take: pageSize,
      });

      const vids = videos.map((file) => ({
        id: file.id,
        name: file.name,
        userId: file.userId,
        uniqueName: file.uniqueName,
        sizeInKb: file.sizeInKb,
        type: file.type,
        extension: file.extension,
        createdAt: file.createdAt,
        duration: file.Video?.duration,
        resolution: file.Video?.resolution,
        fps: file.Video?.fps,
        isFavourite: true,
        thumbnail: file.Video?.thumbnail,
      }));

      return { videos: vids, pages };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Error retrieving favourite videos',
        error?.response?.statusCode || 500,
      );
    }
  }
}
