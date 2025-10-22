import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { PasswordModule } from 'src/password/password.module';
import { PasswordService } from 'src/password/password.service';
import { UserService } from 'src/user/user.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from 'src/common/services/redis.service';
import { RefreshTokenRateLimitMiddleware } from 'src/common/middlewares/rate-limit.middleware';
import { PassportModule } from '@nestjs/passport';
import { FolderModule } from 'src/folder/folder.module';
import { FolderService } from 'src/folder/folder.service';
import { LoggerModule } from 'src/logger/winston.logger.module';
import { GoogleStrategy } from './strategy/google.strategy';

@Module({
  imports: [
    PassportModule,
    UserModule,
    PasswordModule,
    PrismaModule,
    PasswordModule,
    FolderModule,
    LoggerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '24d'),
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    PasswordService,
    UserService,
    LocalStrategy,
    JwtStrategy,
    RedisService,
    FolderService,
    GoogleStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RefreshTokenRateLimitMiddleware).forRoutes('auth/refresh');
  }
}
