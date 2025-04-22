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
      const row = this.prismaService.favourite.findFirst({
        where: { userId, fileId },
      });
      if (!row)
        await this.prismaService.favourite.create({
          data: {
            userId,
            fileId,
          },
        });
      Promise.resolve();
    } catch (error: any) {
      console.error(error);
      throw new HttpException('Unexpected error happened!', 500);
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
}
