import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from 'src/prisma/prisma.service';

const randomBytesAsync = promisify(randomBytes);

@Injectable()
export class PasswordService {
  constructor(private readonly prismaService: PrismaService) {}
  private readonly saltLength = 13;

  async getLastPassword(userId: string) {
    return this.prismaService.password.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async hashPassword(pass: string) {
    let salt = await randomBytesAsync(this.saltLength);

    const hashedPassword = await hash(pass, {
      salt,
      secret: Buffer.from(process.env.PASSWORD_SECRET, 'base64'),
      type: argon2id,
      timeCost: 3,
      parallelism: 1,
      hashLength: 100,
      memoryCost: 10 * 1024,
    });
    return { hash: hashedPassword };
  }

  async verifyPassword(hash: string, password: string) {
    return verify(hash, password, {
      secret: Buffer.from(process.env.PASSWORD_SECRET, 'base64'),
    });
  }
}
