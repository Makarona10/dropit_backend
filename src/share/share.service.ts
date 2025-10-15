import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { WinstonLogger } from 'src/logger/winston.logger';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLogger,
  ) {}

  async shareFile(sharedWithId: string, fileId: number) {
    try {
      await this.prisma.share.create({
        data: {
          sharedWithId,
          fileId,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Error happened while sharing file, try again in seconds',
      );
    }
  }

  async shareFolder(sharedWithId: string, folderId: number) {
    try {
      await this.prisma.share.create({
        data: {
          sharedWithId,
          folderId,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Error happened while sharing folder, try again in seconds',
      );
    }
  }

  async stopSharingFile(sharedWithId: string, ownerId: string, fileId: number) {
    try {
      await this.prisma.share.deleteMany({
        where: {
          sharedWithId,
          fileId,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Error happened while stopping sharing file, try again in seconds',
      );
    }
  }

  async stopSharingFolder(sharedWithId: string, folderId: number) {
    try {
      await this.prisma.share.deleteMany({
        where: {
          sharedWithId,
          folderId,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Error happened while stopping sharing folder, try again in seconds',
      );
    }
  }

  async isFileSharedWithUser(sharedWithId: string, fileId: number) {
    try {
      return await this.prisma.share.findFirst({
        where: {
          sharedWithId,
          fileId,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Error happened while getting shared files, try again in seconds',
      );
    }
  }

  async isFolderSharedWithUser(sharedWithId: string, folderId: number) {
    try {
      return await this.prisma.share.findFirst({
        where: {
          sharedWithId,
          folderId,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Error happened while getting shared files, try again in seconds',
      );
    }
  }
}
