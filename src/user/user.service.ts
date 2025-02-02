import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(user: User, password: { hash: string; salt: string }) {
    return this.prisma.user.create({
      data: { ...user, passwords: { create: { ...password } } },
    });
  }
}
