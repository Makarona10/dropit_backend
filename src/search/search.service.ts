import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prismaService: PrismaService) {}

  async searchForFile(userId: string, fileName: string, page: number) {
    if (!fileName) throw new BadRequestException('Enter a valid file name');

    const pageItems = 16;

    try {
      const filesCount = await this.prismaService.file.count({
        where: {
          name: {
            contains: fileName,
            mode: 'insensitive',
          },
          userId,
          DeletedFiles: null,
        },
      });

      const pages = Math.ceil(filesCount / pageItems);

      const files = await this.prismaService.file.findMany({
        where: {
          name: {
            contains: fileName,
            mode: 'insensitive',
          },
          userId,
          DeletedFiles: null,
        },
        select: {
          id: true,
          name: true,
          Favourite: {
            select: {
              fileId: true,
              userId: true,
            },
          },
          sizeInKb: true,
          createdAt: true,
          extension: true,
          Video: {
            select: {
              duration: true,
              fps: true,
              resolution: true,
            },
          },
          Image: {
            select: {
              resolution: true,
            },
          },
          Audio: {
            select: {
              duration: true,
            },
          },
        },
        skip: (page - 1) * pageItems,
        take: pageItems,
      });

      const mappedFiles = files.map((f) => ({
        ...f,
        duration: f.Audio?.duration || f.Video?.duration,
        resolution: f.Video?.resolution || f.Image?.resolution,
        fps: f.Video?.fps,
        isFavourite: !!f.Favourite.length,
        Favourite: undefined,
        Audio: undefined,
        Video: undefined,
        Image: undefined,
      }));

      return { files: mappedFiles, pages };
    } catch (error) {
      throw new InternalServerErrorException('Error happened!');
    }
  }
}
