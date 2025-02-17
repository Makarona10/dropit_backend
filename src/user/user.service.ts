import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from './interfaces/user.interface';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(user: User, hash: string) {
    return this.prisma.user.create({
      data: { ...user, passwords: { create: { hash } } },
    });
  }

  async findUser(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
