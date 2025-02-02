import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { PasswordModule } from 'src/password/password.module';
import { PasswordService } from 'src/password/password.service';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [UserModule, PasswordModule,PrismaModule],
  providers: [AuthService, PasswordService, UserService,],
  controllers: [AuthController],
})
export class AuthModule {}
