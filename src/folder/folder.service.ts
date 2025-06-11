import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import fs from 'fs/promises';
import path from 'path';

@Injectable()
export class FolderService {
  constructor(private prismaService: PrismaService) {}

  async isFolderExisting(folderId: number): Promise<boolean> {
    const path = await this.prismaService.folder.findFirst({
      where: {
        id: folderId,
      },
      select: {
        path: true,
        name: true,
      },
    });

    return path ? true : false;
  }

  async getFolderDir(id: number): Promise<any> {
    const dirRes = await this.prismaService.folder.findFirst({
      where: {
        id,
      },
      select: {
        path: true,
        name: true,
      },
    });

    if (dirRes) {
      const path = dirRes?.path + '/' + dirRes?.name;

      if (typeof path === 'string' && path.length > 1) {
        return path;
      }
    }

    throw new BadRequestException("Directory doesn't exist");
  }

  async createFolder(userId: string, parentId: number | null, name: string) {
    try {
      let parentDir: string = '';
      let existed: boolean = false;
      const userUploadsPath = path.join(__dirname, '../../uploads', userId);

      if (parentId) {
        parentDir = await this.getFolderDir(parentId);
      }

      const fullPath = userUploadsPath + '/' + parentDir + '/' + name;

      try {
        await fs.access(fullPath);
        existed = true;
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          await fs.mkdir(fullPath, {
            recursive: true,
          });

          await this.prismaService.folder.create({
            data: {
              name,
              path: parentDir,
              userId,
              parentId,
            },
          });
        }
      }

      if (existed) throw new BadRequestException('Folder already exists!');
    } catch (error: any) {
      console.error(error);
      throw new HttpException(
        error?.response?.message || 'Unexpected error happened!',
        error?.response?.statusCode || 500,
      );
    }
  }

  async deleteFolder(userId: string, folderId: number) {
    throw new NotImplementedException('Not Implemented yet');
  }

  async changeFolderName(folderId: number, newName: string, userId: string) {
    try {
      const oldFolderPath: string = await this.getFolderDir(folderId);
      const folderInDb = await this.prismaService.folder.findFirst({
        where: {
          id: +folderId,
        },
      });

      if (folderInDb.userId !== userId)
        throw new UnauthorizedException(
          'You are not the owner of this folder!',
        );

      const newFolderPath = folderInDb.path + '/' + newName;
      const userUploadsPath = path.join(__dirname, '../../uploads/', userId);

      try {
        await fs.access(userUploadsPath + '/' + oldFolderPath);
      } catch (error: any) {
        if (error.message === 'ENOENT') {
          throw new BadRequestException("Folder doesn't exist");
        }
        throw new InternalServerErrorException(
          "Can't update the folder name, If the issue persists contact us",
        );
      }

      try {
        await fs.rename(
          userUploadsPath + '/' + oldFolderPath + '/',
          userUploadsPath + '/' + newFolderPath + '/',
        );

        await this.prismaService.folder.update({
          where: {
            id: folderId,
            userId,
          },
          data: {
            name: newName,
          },
        });
      } catch (error: any) {
        fs.access(userUploadsPath + '/' + newFolderPath);
        fs.rename(
          userUploadsPath + '/' + newFolderPath + '/',
          userUploadsPath + '/' + oldFolderPath + '/',
        );

        throw new BadRequestException('Failed to rename folder', {
          description: error.message,
        });
      }
    } catch (error: any) {
      console.error(error?.response?.description || error);
      throw new HttpException(
        error?.response?.message ||
          'Unexpected error happened, try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }

  async getFolderContent(userId: string, folderId: number) {
    try {
      const files = await this.prismaService.file.findMany({
        where: {
          userId,
          ...(folderId === 0 && { FileParent: { is: null } }),
          ...(folderId !== 0 && { FileParent: { folderId } }),
          DeletedFiles: {
            is: null,
          },
        },
      });

      return files;
    } catch (error: any) {
      console.error(error);
      throw new HttpException(
        error?.response?.message || 'Unexpected error happened',
        error?.response?.statusCode || 500,
      );
    }
  }
}
