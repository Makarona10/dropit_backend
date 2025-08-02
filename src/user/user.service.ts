import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from './interfaces/user.interface';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(user: User, hash: string) {
    return this.prisma.$transaction(async (tx) => {
      const _user = await tx.user.create({
        data: { ...user, passwords: { create: { hash } } },
      });
      await tx.storageQuota.create({
        data: {
          userId: _user.id,
          totalQuota: 1024 * 1024 * 20,
          usedQuota: 0,
        },
      });

      return _user;
    });
  }

  async findUser(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getUserInfo(userId: string) {
    if (!userId) throw new BadRequestException('user id must be provided!');

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          firstName: true,
          lastName: true,
          updatedAt: true,
          StorageQuota: {
            select: {
              totalQuota: true,
              usedQuota: true,
            },
          },
        },
      });

      const images = await this.prisma.file.aggregate({
        _sum: {
          sizeInKb: true,
        },
        _count: {
          id: true,
        },
        where: {
          userId,
          type: 'image',
        },
      });
      const videos = await this.prisma.file.aggregate({
        _sum: {
          sizeInKb: true,
        },

        _count: {
          id: true,
        },
        where: {
          userId,
          type: 'video',
        },
      });
      const audios = await this.prisma.file.aggregate({
        _sum: {
          sizeInKb: true,
        },
        _count: {
          id: true,
        },
        where: {
          userId,
          type: 'audio',
        },
      });
      const others = await this.prisma.file.aggregate({
        _sum: {
          sizeInKb: true,
        },
        _count: {
          id: true,
        },
        where: {
          userId,
          type: 'other',
        },
      });

      const mappedUser = {
        ...user,
        totalQuota: user.StorageQuota.totalQuota,
        usedQuota: user.StorageQuota.usedQuota,
        images: {
          count: images._count.id || 0,
          size: images._sum.sizeInKb || 0,
        },
        videos: {
          count: videos?._count?.id || 0,
          size: videos?._sum?.sizeInKb || 0,
        },
        audios: {
          count: audios?._count?.id || 0,
          size: audios?._sum?.sizeInKb || 0,
        },
        others: {
          count: others?._count?.id || 0,
          size: others?._sum?.sizeInKb || 0,
        },
        totalFiles:
          images._count.id +
          audios._count.id +
          others._count.id +
          videos._count.id,
        StorageQuota: undefined,
      };

      return mappedUser;
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'unexpected error happened!',
        error?.response?.statusCode || 500,
      );
    }
  }
}
