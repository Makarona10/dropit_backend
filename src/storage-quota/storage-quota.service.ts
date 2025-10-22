import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { StorageQuota } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StorageQuotaService {
  constructor(private readonly prismaService: PrismaService) {}

  //TODO: Logging errors will be done using the logger

  async getUserQuota(userId: string): Promise<StorageQuota> {
    try {
      const quota = await this.prismaService.storageQuota.findFirst({
        where: {
          userId,
        },
      });
      return Promise.resolve(quota);
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Error happened while retrieving quota!',
        error?.response?.statusCode || 500,
        { description: error?.message },
      );
    }
  }

  async checkAllowedToAdd(userId: string, sizeInKb: number) {
    if (!userId) throw new BadRequestException('user id must be provided!');

    try {
      const quota = await this.prismaService.storageQuota.findFirst({
        where: {
          userId,
        },
      });

      return quota.usedQuota + sizeInKb > quota.totalQuota ? false : true;
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'Error happened while updating quota!',
        error?.response?.statusCode || 500,
      );
    }
  }

  async increaseConsumedQuota(userId: string, sizeInKb: number) {
    if (!userId) throw new BadRequestException('user id must be provided!');
    try {
      await this.prismaService.storageQuota.update({
        where: {
          userId,
        },
        data: {
          usedQuota: {
            increment: sizeInKb,
          },
        },
      });
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'Error happened while updating quota!',
        error?.response?.statusCode || 500,
      );
    }
  }

  async decreaseConsumedQuota(userId: string, sizeInKb: number) {
    if (!userId) throw new BadRequestException('user id must be provided!');

    try {
      await this.prismaService.storageQuota.update({
        where: {
          userId,
        },
        data: {
          usedQuota: {
            decrement: sizeInKb,
          },
        },
      });
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'Error happened while updating quota!',
        error?.response?.statusCode || 500,
      );
    }
  }
}
