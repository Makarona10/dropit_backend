import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { File, Prisma, Tag } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

interface FileWithFavourite extends File {
  isFavourite: boolean;
}

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
    page: number,
  ): Promise<any> {
    try {
      const tag = await this.prismaService.tag.findFirst({
        where: { id: tagId, userId },
      });

      if (!tag) throw new BadRequestException('Tag not found');

      const filesCount: number = await this.prismaService.file.count({
        where: {
          userId,
          FilesTags: {
            some: {
              tagId,
            },
          },
        },
      });

      const pagesCount: number =
        filesCount === 0 ? 0 : Math.ceil(filesCount / 24);

      const files = await this.prismaService.$queryRaw<
        FileWithFavourite[]
      >(Prisma.sql`
        SELECT 
          "File".*,
          CASE 
            WHEN "Favourite"."fileId" IS NOT NULL THEN true 
            ELSE false 
          END AS "isFavourite"
        FROM "File"
        JOIN "FilesTags"
          ON "FilesTags"."fileId" = "File"."id"
        LEFT JOIN "Favourite"
          ON "Favourite"."fileId" = "File"."id"
          AND "Favourite"."userId" = ${userId}::uuid
        WHERE "FilesTags"."tagId" = ${tagId} 
          AND "File"."userId" = ${userId}::uuid
        ORDER BY "File"."${Prisma.raw(orderBy)}" ${Prisma.raw(arrange.toUpperCase())}
        OFFSET ${(page - 1) * 24}
        LIMIT 24
`);

      return { pagesCount, files };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Error happened while retrieving files',
        error?.response?.statusCode || 500,
      );
    }
  }

  async addFileToTag(userId: string, fileId: number, tagId: number) {
    if (!fileId && !tagId) {
      throw new BadRequestException(
        'Both file id and tag id must be provided!',
      );
    }

    const file = await this.prismaService.file.findFirst({
      where: {
        userId,
        id: fileId,
      },
    });

    if (!file) throw new BadRequestException("File doesn't exist!");

    const tag = await this.prismaService.tag.findFirst({
      where: {
        userId,
        id: tagId,
      },
    });

    if (!tag) throw new BadRequestException("Tag doesn't exist");

    await this.prismaService.filesTags.create({
      data: {
        fileId,
        tagId,
      },
    });
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
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'This file is already tagged with this tag1',
        );
      }
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
