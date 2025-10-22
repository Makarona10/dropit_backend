import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PasswordService } from 'src/password/password.service';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './jwt-local.guard';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptors';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { Payload } from './interfaces/payload.interface';
import { FolderService } from 'src/folder/folder.service';
import { AuthGuard } from '@nestjs/passport';
import { resObj } from 'src/utils';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

interface GoogleUser {
  access_token: string;
  profile: {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
  };
}

@Controller('auth')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly folderService: FolderService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { password, ...user } = body;
    const { hash } = await this.passwordService.hashPassword(password);
    const createdUser = await this.userService.createUser(user, hash);
    await this.folderService.createFolder(createdUser.id, null, 'main');
    return { message: 'User created successfully' };
  }

  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 * 2 } })
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    const response = await this.authService.login(req.user as Payload, res);
    return res.status(200).json({
      statusCode: 200,
      message: 'User found',
      data: {
        access_token: response.access_token,
      },
    });
  }

  @HttpCode(200)
  @Post('refresh')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refresh_token = await req.cookies['refresh_token'];
    if (!refresh_token) throw new UnauthorizedException('No refresh token');
    const user = await this.authService.decodeToken(refresh_token);

    if (!user) throw new UnauthorizedException('Invalid token');

    const isValid = await this.authService.validateRefreshToken(
      user.id,
      refresh_token,
    );
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    await this.authService.revokeToken(user.id);
    const response = await this.authService.login(user, res);

    return res.status(200).json({
      statusCode: 200,
      message: 'Token refreshed',
      data: {
        access_token: response.access_token,
      },
    });
  }

  @Get('google/login')
  @UseGuards(AuthGuard('google'))
  async googleLogin(@Req() req: Request) {
    return { message: 'Google login' };
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as GoogleUser;
    try {
      const userInDB = await this.userService.findUser(user.profile.email);
      if (userInDB) {
        const { access_token } = await this.authService.login(userInDB, res);
        return res
          .status(301)
          .redirect(
            process.env.CLIENT_URL +
              '/auth/callback?access_token=' +
              access_token,
          );
      }
      const { hash } = await this.passwordService.hashPassword(
        user.profile.firstName + user.profile.lastName,
      );
      const createdUser = await this.userService.createUser(
        {
          email: user.profile.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
        },
        hash,
      );
      await this.folderService.createFolder(createdUser.id, null, 'main');
      const { access_token } = await this.authService.login(createdUser, res);
      return res
        .status(200)
        .json(
          resObj(200, 'User created successfully', { data: { access_token } }),
        );
    } catch (error: any) {
      throw new HttpException(
        error.response?.message ||
          error.message ||
          'Unexpected error happened!',
        error.statusCode || 500,
        error.response?.statusCode || 500,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    await this.authService.logout(req.user as Payload);
    return { message: 'Logout successfully' };
  }
}
