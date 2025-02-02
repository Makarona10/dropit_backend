import { Injectable } from '@nestjs/common';
import { argon2id, hash } from 'argon2';

@Injectable()
export class PasswordService {
  private readonly saltLength = 13;

  async hashPassword(pass: string) {
    const { randomBytes } = await import('node:crypto');
    let salt: string;
    randomBytes(this.saltLength, (err, buffer) => {
      if (err) throw err;
      salt = buffer.toString('hex');
    });

    const hashedPassword = await hash(pass + salt, {
      type: argon2id,
      timeCost: 3,
      parallelism: 1,
      hashLength: 100,
      memoryCost: 10 * 1024,
    });

    return { hash: hashedPassword, salt };
  }
}
