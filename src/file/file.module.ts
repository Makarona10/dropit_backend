import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FolderService } from 'src/folder/folder.service';
import { AuthModule } from 'src/auth/auth.module';
import { StorageQuotaService } from 'src/storage-quota/storage-quota.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FileController],
  providers: [FileService, FolderService, StorageQuotaService],
})
export class FileModule {}
