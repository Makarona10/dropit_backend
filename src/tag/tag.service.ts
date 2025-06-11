import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { File, Tag } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUserTags(userId: string, page: number): Promise<Tag[]> {
    const offset = (page - 1) * 20;

    try {
      const tags = await this.prismaService.tag.findMany({
        where: {
          userId,
        },
        skip: offset,
        take: 20,
      });

      return tags;
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to load tags!', {
        description: error?.message,
      });
    }
  }

  async getTagFiles(
    userId: string,
    tagId: number,
    orderBy: 'name' | 'createdAt',
    arrange: 'desc' | 'asc',
  ): Promise<File[]> {
    try {
      const tag = await this.prismaService.tag.findFirst({
        where: { id: tagId, userId },
      });

      if (!tag) throw new BadRequestException('Tag not found');

      const files = await this.prismaService.$queryRaw<File[]>`
        SELECT "File".* FROM "File" JOIN "FilesTags"
        ON "FilesTags"."fileId" = "File"."id"
        WHERE "FilesTags"."tagId" = ${tagId} AND "File"."userId" = ${userId}::uuid
        ORDER BY "File"."${orderBy}" ${arrange.toUpperCase()}
      `;

      return files;
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Error happened while retrieving files',
        error?.response?.statusCode || 500,
      );
    }
  }

  async addTag(userId: string, name: string) {
    try {
      await this.prismaService.tag.create({
        data: {
          name,
          userId,
        },
      });

      return;
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'Error happened while creating tag',
        error?.response?.statusCode || 500,
      );
    }
  }

  async deleteTag(tagId: number, userId: string): Promise<string> {
    try {
      const tagToDelete = await this.prismaService.tag.findFirst({
        where: { userId, id: tagId },
      });

      if (!tagId) throw new BadRequestException('Tag not found!');

      await this.prismaService.tag.delete({
        where: { userId: tagToDelete.userId, id: tagToDelete.id },
      });

      return Promise.resolve('Tag deleted successfully');
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Error happened while deleting tag',
        error?.response?.statusCode || 500,
      );
    }
  }

  async searchTagsByName(name: string, userId: string): Promise<Tag[]> {
    try {
      const result = await this.prismaService.tag.findMany({
        where: {
          name: {
            contains: `%${name}%`,
            mode: 'insensitive',
          },
          userId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      return result;
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Error happened while deleting tag',
        error?.response?.statusCode || 500,
        { description: error?.message },
      );
    }
  }

  async renameTag(
    tagId: number,
    userId: string,
    newName: string,
  ): Promise<string> {
    try {
      const tag = await this.prismaService.tag.findFirst({
        where: {
          id: tagId,
          userId,
        },
      });

      if (!tag) throw new BadRequestException('Tag not found!');

      await this.prismaService.tag.update({
        where: {
          id: tag.id,
          userId: tag.userId,
        },
        data: {
          name: newName,
        },
      });

      return Promise.resolve('Tag name has been updated!');
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message ||
          'Unexpected error happened while renaming the tag!',
        error?.response?.statusCode || 500,
      );
    }
  }

  async isTagExisted(name: string, userId: string) {
    try {
      const tag = await this.prismaService.tag.findFirst({
        where: {
          userId,
          name,
        },
      });

      if (tag) return true;
      return false;
    } catch (error) {
      throw new HttpException(
        error?.response?.message ||
          'Unexpected error happened while finding the tag!',
        error?.response?.statusCode || 500,
      );
    }
  }
}
