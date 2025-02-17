import {
  Body,
  Controller,
  Post,
  Req,
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

@Controller('auth')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { password, ...user } = body;
    const { hash } = await this.passwordService.hashPassword(password);
    await this.userService.createUser(user, hash);
    return { message: 'User created successfully' };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, res: Response) {
    return this.authService.login(req.user as Payload, res);
  }

  @Post('refresh')
  async refreshToken(@Req() req: Request, res: Response) {
    const refresh_token = req.cookies['refresh_token'];

    const user = await this.authService.decodeToken(refresh_token);
    if (!user) throw new UnauthorizedException('Invalid token');

    const isValid = await this.authService.validateRefreshToken(
      user.id,
      refresh_token,
    );
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    await this.authService.revokeToken(user.id);
    return this.authService.login(user, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    await this.authService.logout(req.user as Payload);
    return { message: 'Logout successfully' };
  }
}
