import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { FileService } from 'src/file/file.service';
import { FolderService } from 'src/folder/folder.service';
import { WinstonLogger } from 'src/logger/winston.logger';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageQuotaModule } from 'src/storage-quota/storage-quota.module';
import { UserModule } from 'src/user/user.module';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [UserModule, StorageQuotaModule],
  controllers: [ShareController],
  providers: [
    UserService,
    ShareService,
    WinstonLogger,
    PrismaService,
    FileService,
    FolderService,
  ],
})
export class ShareModule {}
