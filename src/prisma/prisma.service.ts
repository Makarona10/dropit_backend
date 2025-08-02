import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      transactionOptions: {
        timeout: 3_600_000, // 1 hour  -- Will be updated after finishing debugging process
        maxWait: 5_000,
      },
    });
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
