import { Module } from '@nestjs/common';
import { BinController } from './bin.controller';
import { BinService } from './bin.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageQuotaService } from 'src/storage-quota/storage-quota.service';

@Module({
  imports: [PrismaModule],
  controllers: [BinController],
  providers: [BinService, PrismaService, StorageQuotaService],
})
export class BinModule {}
