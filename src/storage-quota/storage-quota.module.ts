import { Module } from '@nestjs/common';
import { StorageQuotaController } from './storage-quota.controller';
import { StorageQuotaService } from './storage-quota.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [StorageQuotaController],
  providers: [StorageQuotaService, PrismaService],
  exports: [StorageQuotaService],
})
export class StorageQuotaModule {}
