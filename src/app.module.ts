import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PasswordModule } from './password/password.module';
import { WinstonLogger } from './logger/winston.logger';
import { GlobalExceptionFilter } from './common/exceptions/global.exception.filter';
import { RedisService } from './common/services/redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    PasswordModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    WinstonLogger,
    {
      provide: Logger,
      useClass: WinstonLogger,
    },
    GlobalExceptionFilter,
    RedisService,
  ],
  exports: [RedisService],
})
export class AppModule {}
