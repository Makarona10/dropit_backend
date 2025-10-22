import { Module } from '@nestjs/common';
import { FolderController } from './folder.controller';
import { FolderService } from './folder.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LoggerModule } from 'src/logger/winston.logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [FolderController],
  providers: [FolderService],
})
export class FolderModule {}
