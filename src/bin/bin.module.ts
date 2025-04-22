import { Module } from '@nestjs/common';
import { BinController } from './bin.controller';
import { BinService } from './bin.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BinController],
  providers: [BinService],
})
export class BinModule {}
