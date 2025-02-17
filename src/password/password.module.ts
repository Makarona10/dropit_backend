import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [PasswordService, PrismaService],
})
export class PasswordModule {}
