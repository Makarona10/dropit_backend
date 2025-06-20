import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import fs from 'fs';
import fsPromise from 'fs/promises';
import Ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import path from 'path';
import { FolderService } from 'src/folder/folder.service';

// TODO: Thumbnail will be shown on the restored files

@Injectable()
export class FileService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly folderService: FolderService,
  ) {}

  async getFile(userId: string, fileId: number) {
    if (!fileId || fileId < 1) {
      throw new BadRequestException('Invalid fileId');
    }

    try {
      const file = await this.prismaService.file.findFirst({
        where: {
          userId,
          id: fileId,
        },

        select: {
          id: true,
          createdAt: true,
          extension: true,
          name: true,
          sizeInKb: true,
          type: true,
          uniqueName: true,
          Audio: {
            select: {
              duration: true,
            },
          },
          Video: {
            select: {
              duration: true,
              fps: true,
              resolution: true,
            },
          },
          Image: {
            select: {
              resolution: true,
            },
          },
          FileParent: {
            select: {
              folder: {
                select: {
                  path: true,
                  name: true,
                },
              },
            },
          },
          userId: true,
          Favourite: {
            where: {
              userId,
            },
            select: {
              fileId: true,
            },
          },
        },
      });

      if (!file) {
        throw new BadRequestException('Oops, File not found!');
      }

      const finalFile = {
        ...file,
        duration: file.Audio?.duration || file.Video?.duration,
        resolution: file.Video?.resolution || file.Image?.resolution,
        fps: file.Video?.fps,
        isFavourite: !!file.Favourite.length,
        Favourite: undefined,
        Audio: undefined,
        Video: undefined,
        Image: undefined,
        FileParent: undefined,
        path: file?.FileParent?.folder?.path + file.FileParent?.folder?.name,
      };

      return finalFile;
    } catch (error) {
      throw new HttpException(
        error?.response?.data?.message ||
          'Error happened while retrieving file from DB',
        error?.response?.data?.statusCode || 500,
      );
    }
  }

  async getRecentUserFilesAndFolders(id: string) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const files = await this.prismaService.file.findMany({
        where: {
          DeletedFiles: null,
          userId: id,
        },

        select: {
          id: true,
          createdAt: true,
          extension: true,
          name: true,
          sizeInKb: true,
          type: true,
          Audio: {
            select: {
              duration: true,
            },
          },
          Video: {
            select: {
              duration: true,
              fps: true,
              resolution: true,
            },
          },
          Image: {
            select: {
              resolution: true,
            },
          },
          Favourite: {
            where: {
              userId: id,
            },
            select: {
              fileId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 12,
      });

      const mappedFiles = files.map((f) => ({
        ...f,
        duration: f.Audio?.duration || f.Video?.duration,
        resolution: f.Video?.resolution || f.Image?.resolution,
        fps: f.Video?.fps,
        isFavourite: !!f.Favourite.length,
        Favourite: undefined,
        Audio: undefined,
        Video: undefined,
        Image: undefined,
      }));

      const folders = await this.prismaService.folder.findMany({
        where: {
          userId: id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
      });

      return { files: mappedFiles, folders };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message ||
          'Error happened while retrieving files from DB',
        error?.response?.statusCode || 500,
      );
    }
  }

  async getVideos(
    userId: string,
    order: 'asc' | 'desc',
    extension: string | null,
    page: number,
  ) {
    try {
      const pageSize = 24;
      const skip = page > 0 ? (page - 1) * pageSize : 0;

      const videosCount = await this.prismaService.file.count({
        where: {
          userId,
          type: 'video',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
        },
      });

      const pages = videosCount === 0 ? 0 : Math.ceil(videosCount / pageSize);

      const result = await this.prismaService.file.findMany({
        where: {
          userId,
          type: 'video',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
        },
        select: {
          id: true,
          name: true,
          uniqueName: true,
          sizeInKb: true,
          type: true,
          extension: true,
          createdAt: true,
          Video: {
            select: {
              resolution: true,
              duration: true,
              fps: true,
            },
          },
          Favourite: {
            select: {
              fileId: true,
            },
            where: {
              userId,
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: order,
        },
        skip,
        take: pageSize,
      });

      const videos = result.map((file) => ({
        id: file.id,
        name: file.name,
        uniqueName: file.uniqueName,
        sizeInKb: file.sizeInKb,
        type: file.type,
        extension: file.extension,
        createdAt: file.createdAt,
        resolution: file.Video?.resolution,
        duration: file.Video?.duration,
        fps: file.Video?.fps,
        isFavourite: file.Favourite.length > 0,
      }));

      return { videos, pages };
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'Error happened while retrieving vidoes',
        error?.response?.statusCode || 500,
      );
    }
  }

  async getImages(
    userId: string,
    order: 'asc' | 'desc',
    extension: string | null,
    page: number,
  ) {
    try {
      const pageSize = 24;
      const skip = page > 0 ? (page - 1) * pageSize : 0;

      const imagesCount = await this.prismaService.file.count({
        where: {
          userId,
          type: 'image',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
        },
      });

      const pages = imagesCount === 0 ? 0 : Math.ceil(imagesCount / pageSize);

      const result = await this.prismaService.file.findMany({
        where: {
          userId,
          type: 'image',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
        },
        select: {
          id: true,
          name: true,
          uniqueName: true,
          sizeInKb: true,
          type: true,
          extension: true,
          createdAt: true,
          Image: {
            select: {
              resolution: true,
            },
          },
          Favourite: {
            select: {
              fileId: true,
            },
            where: {
              userId,
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: order,
        },
        skip,
        take: pageSize,
      });

      const images = result.map((file) => ({
        id: file.id,
        name: file.name,
        sizeInKb: file.sizeInKb,
        type: file.type,
        extension: file.extension,
        createdAt: file.createdAt,
        resolution: file.Image?.resolution,
        isFavourite: file.Favourite.length > 0,
      }));

      return { images, pages };
    } catch (error) {
      throw new HttpException(
        error?.response?.message || 'Error happened while retrieving images',
        error?.response?.statusCode || 500,
      );
    }
  }
  async getFileParentDirectory(fileId: number, userId: string) {
    // returns the complete path starting from root
    const userUploadsPath = path.join(__dirname, '../../uploads', userId);
    const fileParent = await this.prismaService.$queryRaw<
      Array<{ path: string; name: string }>
    >`
        SELECT "Folder"."path", "Folder"."name" FROM "FileParent" JOIN "Folder" ON "folderId" = "id"
        WHERE "fileId" = ${fileId}
      `;

    const filePath: string = fileParent[0]?.name
      ? path.join(userUploadsPath, fileParent[0]?.path, fileParent[0].name)
      : userUploadsPath;

    return filePath;
  }

  // saves files to the server
  async saveFileToSystem(
    file: Express.Multer.File,
    directory: string,
    uniqueName: string,
  ) {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(`${directory}/${uniqueName}`, file.buffer);
  }

  // saves files using streams
  async saveLargeFileToSystem(
    file: Express.Multer.File,
    directory: string,
    uniqueName: string,
  ) {
    fs.mkdirSync(directory, { recursive: true });
    const ws = fs.createWriteStream(directory.concat(`/${uniqueName}`), {
      encoding: 'binary',
    });

    return new Promise((resolve, reject) => {
      ws.write(file.buffer, (error: any) => {
        if (error) {
          ws.end();
          console.error(error);
          return reject(
            new InternalServerErrorException(
              `Failed to save the file, try again in a minute`,
            ),
          );
        }

        ws.end(() => {
          resolve({
            message: 'File saved successfully',
            statusCode: 201,
          });
        });
      });

      ws.on('error', (error) => {
        return reject(
          new InternalServerErrorException(`Stream error: ${error.message}`),
        );
      });
    });
  }

  async getVideoFPS(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      Ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(
            new BadRequestException(`Failed to get video FPS: ${err.message}`),
          );
        }

        const videoStream = metadata.streams.find(
          (stream: any) => stream.codec_type === 'video',
        );
        if (!videoStream) {
          return reject(
            new BadRequestException('No video stream found in the file'),
          );
        }

        const fpsFraction = videoStream.r_frame_rate;
        if (!fpsFraction) {
          return reject(
            new BadRequestException('Could not determine video FPS'),
          );
        }

        const [numerator, denominator] = fpsFraction.split('/').map(Number);
        if (!numerator || !denominator || denominator === 0) {
          return reject(
            new BadRequestException('Invalid FPS value in video metadata'),
          );
        }

        const fps = numerator / denominator;
        resolve(fps);
      });
    });
  }

  async getVideoDuration(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      Ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(
            new BadRequestException(
              `Failed to get video duration: ${err.message}`,
            ),
          );
        }

        const duration = metadata.format.duration;

        if (typeof duration !== 'number') {
          return reject(
            new BadRequestException('Could not determine video duration'),
          );
        }

        resolve(duration);
      });
    });
  }

  // save the file and its parent to fileParent table
  async saveFileAndParent(parentId: number, fileId: number): Promise<any> {
    return await this.prismaService.fileParent.create({
      data: {
        folderId: parentId,
        fileId: fileId,
      },
    });
  }

  async getMediaResolution(
    filePath: string,
    type: string,
  ): Promise<{ width: number; height: number }> {
    // Determine file type based on extension
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    if (!fileExtension) {
      throw new BadRequestException('File has no extension');
    }

    // Handle video files
    if (type === 'video') {
      return new Promise((resolve, reject) => {
        Ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            return reject(
              new BadRequestException(
                `Failed to get video resolution: ${err.message}`,
              ),
            );
          }

          // Find the video stream
          const videoStream = metadata.streams.find(
            (stream: any) => stream.codec_type === 'video',
          );
          if (!videoStream) {
            return reject(
              new BadRequestException('No video stream found in the file'),
            );
          }

          // Extract width and height
          const width = videoStream.width;
          const height = videoStream.height;

          if (typeof width !== 'number' || typeof height !== 'number') {
            return reject(
              new BadRequestException('Could not determine video resolution'),
            );
          }

          resolve({ width, height });
        });
      });
    }

    // Handle image files
    if (type === 'image') {
      try {
        const metadata = await sharp(filePath).metadata();

        if (
          typeof metadata.width !== 'number' ||
          typeof metadata.height !== 'number'
        ) {
          throw new BadRequestException('Could not determine image resolution');
        }

        return {
          width: metadata.width,
          height: metadata.height,
        };
      } catch (error) {
        throw new BadRequestException(
          `Failed to get image resolution: ${error.message}`,
        );
      }
    }

    // Unsupported file type
    throw new BadRequestException(
      `Unsupported file type for resolution extraction: ${fileExtension}`,
    );
  }

  // saves the file details to DB
  async saveFileToDB(
    userId: string,
    name: string,
    uniqueName: string,
    size_in_kb: number,
    extension: string,
    type: 'video' | 'audio' | 'image' | 'other',
    folderId: number,
  ) {
    try {
      const savedFile = await this.prismaService.file.create({
        data: {
          userId,
          name,
          uniqueName,
          sizeInKb: size_in_kb,
          extension,
          type,
        },
      });

      if (folderId) {
        await this.prismaService.fileParent.create({
          data: {
            fileId: savedFile.id,
            folderId,
          },
        });
      }
      return savedFile;
    } catch (error: any) {
      console.error(error);
      throw new HttpException(
        error?.response?.message || 'Error happened while saving file to DB',
        error?.response?.statusCode || 500,
      );
    }
  }

  // handles all the upload process
  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    parentId?: number,
  ) {
    if (!file)
      throw new BadRequestException('No file selected, please upload a file!');
    try {
      const uniqueName: string = Date.now() + file.originalname;
      const fileExtension: string = file.originalname
        .split('.')
        .pop()
        .toLowerCase();
      const fType: string = file.mimetype.split('/')[0].toLowerCase();
      let realType: 'audio' | 'video' | 'image' | 'other' = 'other';

      if (fType === 'audio') {
        realType = 'audio';
      } else if (fType === 'video') {
        realType = 'video';
      } else if (fType === 'image') {
        realType = 'image';
      }

      const userUploadsPath = path.join(__dirname, '../../uploads/', userId);
      let parentDir: string;

      if (parentId) {
        parentDir = await this.folderService.getFolderDir(parentId);
      } else {
        const mainId = await this.folderService.getUserMainFolderId(userId);
        parentDir = await this.folderService.getFolderDir(mainId);
      }

      const fullDir = path.join(userUploadsPath, parentDir);
      if (file.size >= 1024 * 1024 * 100) {
        await this.saveLargeFileToSystem(file, fullDir, uniqueName);
      } else {
        await this.saveFileToSystem(file, fullDir, uniqueName);
      }

      const savedFile = await this.saveFileToDB(
        userId,
        file.originalname,
        uniqueName,
        file.size / 1024,
        fileExtension,
        realType,
        parentId,
      );

      const filePath = `${fullDir}/${uniqueName}`;
      if (fType === 'video') {
        const duration: number = await this.getVideoDuration(filePath);
        const fps: number = await this.getVideoFPS(filePath);
        const resolution = await this.getMediaResolution(filePath, 'video');
        await this.prismaService.video.create({
          data: {
            resolution: `${resolution.width} * ${resolution.height}`,
            videoId: savedFile.id,
            duration: duration || 0,
            fps,
          },
        });
      } else if (fType === 'audio') {
        const duration = await this.getVideoDuration(filePath);
        await this.prismaService.audio.create({
          data: {
            fileId: savedFile.id,
            duration,
          },
        });
      } else if (fType === 'image') {
        const resolution = await this.getMediaResolution(filePath, 'image');
        await this.prismaService.image.create({
          data: {
            resolution: `${resolution.width} * ${resolution.height}`,
            imageId: savedFile.id,
          },
        });
      }
    } catch (error: any) {
      // TODO: Delete file from the system if error happens during the save process
      throw new HttpException(
        error?.response?.message || 'Error happened while uploading file!',
        error?.response?.statusCode || 500,
      );
    }
  }

  async getFavouriteFiles(
    userId: string,
    args: {
      order: 'asc' | 'desc' | null;
      filter: 'image' | 'audio' | 'video' | 'other' | null;
      page: number;
    },
  ) {
    const offset = (args.page - 1) * 24;

    const totalCountResult = await this.prismaService.file.count({
      where: {
        userId,
        Favourite: {
          some: {
            userId,
          },
        },
      },
    });

    const totalCount = Number(totalCountResult[0]?.count) || 0;

    const pages = Math.ceil(totalCount / 24);

    try {
      const files = await this.prismaService.file.findMany({
        where: {
          userId,
          Favourite: {
            some: {
              userId,
            },
          },
          DeletedFiles: null,
          ...(args.filter && { type: args.filter }),
        },
        select: {
          id: true,
          name: true,
          uniqueName: true,
          sizeInKb: true,
          type: true,
          extension: true,
          createdAt: true,
          Image: {
            select: {
              resolution: true,
            },
          },
          Video: {
            select: {
              resolution: true,
              duration: true,
              fps: true,
            },
          },
          Audio: {
            select: {
              duration: true,
            },
          },
          Favourite: {
            select: {
              fileId: true,
            },
            where: {
              userId,
            },
            take: 1,
          },
        },

        orderBy: {
          createdAt: args.order,
        },
        skip: offset,
        take: 24,
      });

      const theFiles = files.map((file) => ({
        id: file.id,
        name: file.name,
        uniqueName: file.uniqueName,
        sizeInKb: file.sizeInKb,
        type: file.type,
        extension: file.extension,
        createdAt: file.createdAt,
        resolution: file.Image?.resolution,
        fps: file.Video?.fps,
        duration: file.Audio?.duration,
        isFavourite: true,
      }));

      return { pages, files: theFiles };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message ||
          'Unknown error happened while retrieving favourite files, please try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }

  async getFavouriteVideos(
    userId: string,
    order: 'asc' | 'desc',
    extension: string | null,
    page: number,
  ) {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const pageSize = 24;
      const skip = (page - 1) * pageSize;

      const count = await this.prismaService.file.count({
        where: {
          userId,
          type: 'video',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
          Favourite: {
            some: {
              userId,
            },
          },
        },
      });

      const pages = count === 0 ? 0 : Math.ceil(count / pageSize);

      const videos = await this.prismaService.file.findMany({
        where: {
          userId,
          type: 'video',
          extension: extension ? extension.toLowerCase() : undefined,
          DeletedFiles: null,
          Favourite: {
            some: {
              userId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          uniqueName: true,
          sizeInKb: true,
          type: true,
          extension: true,
          createdAt: true,
          Video: {
            select: {
              resolution: true,
              duration: true,
              fps: true,
            },
          },
          Favourite: {
            select: {
              fileId: true,
            },
            where: {
              userId,
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: order,
        },
        skip,
        take: pageSize,
      });

      const vids = videos.map((file) => ({
        id: file.id,
        name: file.name,
        uniqueName: file.uniqueName,
        sizeInKb: file.sizeInKb,
        type: file.type,
        extension: file.extension,
        createdAt: file.createdAt,
        duration: file.Video?.duration,
        resolution: file.Video?.resolution,
        fps: file.Video?.fps,
        isFavourite: true,
      }));

      return { videos: vids, pages };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message || 'Error retrieving favourite videos',
        error?.response?.statusCode || 500,
      );
    }
  }

  async deleteOwnedFile(userId: string, fileId: number): Promise<any> {
    const uploadsPath = path.join(__dirname, '../../uploads', userId);
    try {
      const file = await this.prismaService.file.findFirst({
        where: {
          id: fileId,
          userId,
        },
      });
      if (!file) throw new BadRequestException('File not found!');

      const fileParent = await this.prismaService.$queryRaw<
        Array<{ path: string }>
      >`
        SELECT "Folder"."path" FROM "FileParent" JOIN "Folder" ON "folderId" = "id"
        WHERE "fileId" = ${fileId}
      `;

      let filePath: string = fileParent[0]?.path
        ? fileParent[0]?.path
        : uploadsPath;
      filePath = filePath.concat(`/${file.uniqueName}`);

      await fsPromise.unlink(filePath);

      await this.prismaService.file.delete({
        where: {
          id: fileId,
        },
      });

      return Promise.resolve();
    } catch (error: any) {
      console.error(error);
      throw new HttpException(
        error?.response?.message ||
          'Unexpected error happened, Please try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }

  async changeFileDirectory(userId: string, fileId: number, folderId: number) {
    try {
      const file = await this.prismaService.file.findFirst({
        where: {
          userId,
          id: fileId,
        },
      });

      if (!file) throw new BadRequestException('File not found!');

      const oldLocation =
        (await this.getFileParentDirectory(fileId, userId)) +
        '/' +
        file.uniqueName;
      const newLocation =
        (await this.folderService.getFolderDir(folderId)) +
        '/' +
        file.uniqueName;

      fs.rename(oldLocation, newLocation, (err) => {
        if (err) throw err;
      });

      await this.prismaService.fileParent.update({
        where: {
          fileId,
        },
        data: {
          folderId,
        },
      });

      return Promise.resolve('Directory updated successfully');
    } catch (error: any) {
      console.error(error);
      throw new HttpException(
        error?.response?.message ||
          'Unexpected error happened, try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }

  async downloadFile(userId: string, fileId: number) {
    try {
      const file = await this.prismaService.file.findFirst({
        where: {
          id: fileId,
          userId,
        },
      });

      if (!file) throw new BadRequestException('File not found!');

      const folderPath = await this.getFileParentDirectory(fileId, userId);
      const filePath = folderPath + '/' + file.uniqueName;
      try {
        await fsPromise.access(filePath);
      } catch {
        throw new BadRequestException('File not found on the server');
      }
      const readFile = fs.createReadStream(filePath);
      const stats = await fsPromise.stat(filePath);

      return {
        stream: readFile,
        stats,
        fileName: file.name,
        extension: file.extension,
      };
    } catch (error: any) {
      throw new HttpException(
        error?.response?.message ||
          'Unexpected error happened, try again in a minute',
        error?.response?.statusCode || 500,
      );
    }
  }

  async shareFile() {
    return new NotImplementedException('Coming soon ...');
  }
}
