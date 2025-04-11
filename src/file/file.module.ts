import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FolderService } from 'src/folder/folder.service';

@Module({
  imports: [PrismaModule],
  controllers: [FileController],
  providers: [FileService, FolderService],
})
export class FileModule {}
