import {
  HttpException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { StorageQuota } from '@prisma/client';
import { WinstonLogger } from 'src/logger/winston.logger';
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
}
