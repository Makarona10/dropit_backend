import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Tag } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUserTags(
    userId: string,
    page: number,
  ): Promise<{ tags: Tag[]; pages: number }> {
    const offset = (page - 1) * 24;

    try {
      const tagsCount = await this.prismaService.tag.count({
        where: {
          userId,
        },
      });

      const pages = Math.ceil(tagsCount / 24);
      const tags = await this.prismaService.tag.findMany({
        where: {
          userId,
        },
        skip: offset,
        take: 24,
      });

      return { tags, pages };
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
    fileName?: string,
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
          DeletedFiles: null,
          ...(fileName && {
            name: { contains: fileName, mode: 'insensitive' },
          }),
        },
      });

      const pagesCount: number =
        filesCount === 0 ? 0 : Math.ceil(filesCount / 24);

      const files = await this.prismaService.file.findMany({
        where: {
          userId,
          FilesTags: {
            some: {
              tagId,
            },
          },
          DeletedFiles: null,
          ...(fileName && {
            name: { contains: fileName, mode: 'insensitive' },
          }),
        },
        select: {
          userId: true,
          name: true,
          id: true,
          createdAt: true,
          extension: true,
          sizeInKb: true,
          type: true,
          uniqueName: true,
          Favourite: {
            select: {
              fileId: true,
            },
          },
          Audio: {
            select: {
              duration: true,
            },
          },
          Image: {
            select: {
              resolution: true,
              thumbnail: true,
            },
          },
          Video: {
            select: {
              thumbnail: true,
              fps: true,
              resolution: true,
              duration: true,
            },
          },
        },
        orderBy: {
          createdAt: arrange,
        },
        skip: (page - 1) * 24,
        take: 24,
      });

      const finalFiles = files.map((f) => ({
        ...f,
        duration: f.Audio?.duration || f.Video?.duration,
        resolution: f.Video?.resolution || f.Image?.resolution,
        thumbnail: f.Image?.thumbnail || f.Video?.thumbnail,
        fps: f.Video?.fps,
        isFavourite: !!f.Favourite.length,
        Favourite: undefined,
        Audio: undefined,
        Video: undefined,
        Image: undefined,
      }));

      return { pagesCount, files: finalFiles };
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

  async removeFileFromTag(userId: string, fileId: number, tagId: number) {
    if (!fileId && !tagId) {
      throw new BadRequestException(
        'Both file id and tag id must be provided!',
      );
    }

    const file = await this.prismaService.filesTags.delete({
      where: {
        fileId_tagId: {
          fileId,
          tagId,
        },
        file: {
          userId,
        },
      },
    });

    if (!file) throw new BadRequestException("File doesn't exist!");

    return Promise.resolve();
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
