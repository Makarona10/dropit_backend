import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/common/services/redis.service';
import { PasswordService } from 'src/password/password.service';
import { UserService } from 'src/user/user.service';
import * as argon from 'argon2';
import { Response } from 'express';
import { Payload } from './interfaces/payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async generateTokens(payload: Payload) {
    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: await this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRATION,
        secret: process.env.JWT_REFRESH_SECRET,
      }),
    };
  }

  async decodeToken(token: string) {
    return this.jwtService.verifyAsync(token);
  }

  async validateRefreshToken(userId: number, refreshToken: string) {
    const storedToken = await this.redisService.getValue(
      `refresh_token:${userId}`,
    );
    if (!storedToken) return false;

    return argon.verify(storedToken, refreshToken, {
      secret: Buffer.from(process.env.JWT_REFRESH_HASH_SECRET, 'base64'),
    });
  }

  async revokeToken(userId: number) {
    await this.redisService.deleteKey(`refresh_token:${userId}`);
  }

  async validateUser(credential: { email: string; password: string }) {
    const user = await this.userService.findUser(credential.email);
    if (!user) return null;

    const lastPassword = await this.passwordService.getLastPassword(user.id);

    const { hash } = lastPassword;
    const result = await this.passwordService.verifyPassword(
      hash,
      credential.password,
    );
    if (!result) return null;

    return user;
  }

  async login(user: Payload, res: Response) {
    const payload = { id: user.id, email: user.email };
    try {
      const data = await this.generateTokens(payload);

      const hashedRefreshToken = await argon.hash(data.refresh_token, {
        hashLength: 60,
        type: argon.argon2id,
        secret: Buffer.from(process.env.JWT_REFRESH_HASH_SECRET, 'base64'),
      });

      await this.redisService.setValue(
        `refresh_token:${payload.id}`,
        hashedRefreshToken,
        Number(process.env.JWT_REFRESH_EXPIRATION),
      );

      res.cookie('refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return { access_token: data.access_token };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Error happened while logging in',
      );
    }
  }

  async logout(user: Payload) {
    await this.revokeToken(user.id);
  }
}
