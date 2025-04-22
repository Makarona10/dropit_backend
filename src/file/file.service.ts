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
import { time } from 'console';

// TODO: Thumbnail will be shown on the restored files

@Injectable()
export class FileService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly folderService: FolderService,
  ) {}

  async getRecentUserFilesAndFolders(id: string) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const files = await this.prismaService.$queryRaw<
        Array<{
          id: string;
          name: string;
          size_in_kb: number;
          createdAt: Date;
          aud_duration: number | null;
          vid_duration: number | null;
          resolution: string | null;
          fps: number | null;
          fileId: string | null;
        }>
      >`
        SELECT "f"."id", "f"."name", "f"."size_in_kb", "f"."createdAt", "a"."duration" AS "aud_duration",
        "v"."duration" AS "vid_duration", "v"."resolution", "v"."fps", "i"."resolution", "fav"."fileId"
        FROM "File" "f" LEFT JOIN "Audio" "a" ON "f"."id" = "a"."fileId"
        LEFT JOIN "Video" "v" ON "f"."id" = "v"."videoId"
        LEFT JOIN "Image" "i" ON "f"."id" = "i"."imageId"
        LEFT JOIN "Favourite" "fav" ON f.id = "fav"."fileId"
        WHERE "f"."userId" = ${id}::uuid
        ORDER BY "f"."createdAt" DESC
        LIMIT 12
        `;

      const folders = await this.prismaService.folder.findMany({
        where: {
          userId: id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
      });
      return { files, folders };
    } catch (error: any) {
      console.error(error.message);
      throw new InternalServerErrorException(
        'Error happened while retrieving your files, please try again in minutes',
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

    const filePath: string = fileParent[0]?.path
      ? userUploadsPath.concat(`/${fileParent[0]?.path}/${fileParent[0]?.name}`)
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
    parentId: number,
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
      const parentDir: string = parentId
        ? await this.folderService.getFolderDir(parentId)
        : '';

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

      const filePath = `${parentDir}/${uniqueName}`;
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
      console.error(error);
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
      filter: 'images' | 'audios' | 'videos' | 'others';
      page: number;
    },
  ) {
    const offset = (args.page - 1) * 16;

    try {
      const files = await this.prismaService.$queryRaw`
      SELECT "f".* FROM "Files" "f" JOIN "Favourite" "fav"
      ON "f"."id" = "fav"."fileId"
      WHERE "fav"."userId" = ${userId}
      ORDER BY "f"."createdAt" DESC
      OFFSET ${offset}
      LIMIT 16
    `;

      return files;
    } catch (error: any) {
      console.error(error);
      throw new HttpException(
        error?.response?.message ||
          'Unknown error happened while retrieving favourite files, please try again in a minute',
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
      console.error(error);
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
