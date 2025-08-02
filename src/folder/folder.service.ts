import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import fs from 'fs/promises';
import path from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class FolderService {
  constructor(private prismaService: PrismaService) {}

  async getUserMainFolderId(userId: string): Promise<number> {
    try {
      const row = await this.prismaService.folder.findFirst({
        where: {
          userId,
        },
        orderBy: {
          id: 'asc',
        },
      });

      if (!row) {
        throw new BadRequestException('No folders found for this user!');
      }

      return row.id;
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'Unexpected error happened!',
        error?.response?.statusCode || 500,
      );
    }
  }

  async getUserFolders(userId: string, page: number) {
    try {
      const pageFoldersCount = 24;

      const totalUserFolders = await this.prismaService.folder.count({
        where: {
          userId,
        },
      });
      const pages = Math.ceil(totalUserFolders / pageFoldersCount);
      const folders = await this.prismaService.folder.findMany({
        where: {
          userId,
          name: {
            not: 'main',
          },
          parent: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageFoldersCount,
        take: pageFoldersCount,
      });

      return { folders, pages };
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'Unexpected error happened!',
        error?.response?.statusCode || 500,
      );
    }
  }

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
      throw new HttpException(
        error?.response?.message || 'Unexpected error happened!',
        error?.response?.statusCode || 500,
      );
    }
  }

  async deleteFolder(userId: string, folderId: number) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await this.deleteFolderRecursive(userId, folderId, tx);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  private async deleteFolderRecursive(
    userId: string,
    folderId: number,
    tx: Prisma.TransactionClient,
  ) {
    const folder = await tx.folder.findFirst({
      where: {
        id: folderId,
        userId,
      },
      include: {
        children: true,
        FileParent: {
          include: {
            file: {
              include: {
                Audio: true,
                Video: true,
                Image: true,
                Favourite: true,
                FilesTags: true,
                DeletedFiles: true,
              },
            },
          },
        },
        DeletedFolders: true,
      },
    });

    if (!folder) {
      throw new BadRequestException(
        'Folder not found or does not belong to user',
      );
    }

    for (const childFolder of folder.children) {
      await this.deleteFolderRecursive(userId, childFolder.id, tx);
    }

    let totalSizeKb = 0;

    for (const fileParent of folder.FileParent) {
      const file = fileParent.file;
      totalSizeKb += file.sizeInKb;

      const filePath = path.join(
        __dirname,
        '../../uploads',
        userId,
        folder.path,
        folder.name,
        file.uniqueName,
      );

      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Failed to delete file ${filePath}:`, error);
      }

      await tx.file.delete({ where: { id: file.id } });
    }

    const folderPath = path.join(
      __dirname,
      '../../uploads',
      userId,
      folder.path,
      folder.name,
    );

    try {
      await fs.rm(folderPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to delete folder ${folderPath}:`, error);
    }

    await tx.storageQuota.update({
      where: { userId },
      data: {
        usedQuota: {
          decrement: totalSizeKb / 1000,
        },
      },
    });

    await tx.folder.delete({
      where: { id: folderId },
    });
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
      throw new HttpException(
        error?.response?.message ||
          'Unexpected error happened, try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }

  async getFolderContent(userId: string, folderId: number, page: number) {
    const itemsPerPage = 10;
    if (page < 1)
      throw new BadRequestException('Page should be a positive number');
    if (!folderId || folderId < 0)
      throw new BadRequestException('Invalid folderId!');

    try {
      const filesCount = await this.prismaService.file.count({
        where: {
          userId,
          FileParent: {
            folderId,
          },
        },
      });
      const foldersCount = await this.prismaService.folder.count({
        where: {
          userId,
          parentId: folderId,
        },
      });

      const totalItems = filesCount > foldersCount ? filesCount : foldersCount;
      const totalPages =
        totalItems === 0 ? 0 : Math.ceil(totalItems / itemsPerPage);

      const files = await this.prismaService.file.findMany({
        where: {
          userId,
          FileParent: {
            folderId,
          },
          DeletedFiles: {
            is: null,
          },
        },
        select: {
          id: true,
          name: true,
          sizeInKb: true,
          type: true,
          extension: true,
          createdAt: true,
          userId: true,
          Favourite: {
            where: {
              userId,
            },
            select: {
              fileId: true,
            },
          },
          Video: {
            select: {
              duration: true,
              resolution: true,
              thumbnail: true,
              fps: true,
            },
          },
          Image: {
            select: {
              resolution: true,
              thumbnail: true,
            },
          },
          Audio: {
            select: {
              duration: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * itemsPerPage,
        take: itemsPerPage,
      });

      const formattedFiles = files.map((file) => ({
        ...file,
        isFavourite: file.Favourite.length > 0,
        Favourite: undefined,
        duration: file?.Audio?.duration || file?.Video?.duration,
        resolution: file?.Video?.resolution || file?.Image?.resolution,
        fps: file?.Video?.fps,
        thumbnail: file?.Video?.thumbnail || file?.Image?.thumbnail,
      }));

      const folders = await this.prismaService.folder.findMany({
        where: {
          parentId: folderId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * itemsPerPage,
        take: itemsPerPage,
      });

      return { files: formattedFiles, folders, pages: totalPages };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Unexpected error happened',
        error?.response?.statusCode || 500,
      );
    }
  }
}
