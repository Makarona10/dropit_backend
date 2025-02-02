import { Body, Controller, Post } from '@nestjs/common';
import { PasswordService } from 'src/password/password.service';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    const { password, ...user } = body;
    const hashAndSaltObj = await this.passwordService.hashPassword(password);
    return this.userService.createUser(user, hashAndSaltObj);
  }
}
