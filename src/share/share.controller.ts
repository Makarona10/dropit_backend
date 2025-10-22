import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ShareService } from './share.service';
import { UserService } from 'src/user/user.service';
import { FileService } from 'src/file/file.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Payload } from 'src/auth/interfaces/payload.interface';
import { Request } from 'express';
import { resObj } from 'src/utils';
import { FolderService } from 'src/folder/folder.service';

@Controller('share')
export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly userService: UserService,
    private readonly fileService: FileService,
    private readonly folderService: FolderService,
  ) {}

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Post('file')
  async share(
    @Req() req: Request,
    @Body() body: { sharedWithEmail: string; fileId: string },
  ) {
    const user = req.user as Payload;
    const { sharedWithEmail, fileId } = body;
    if (user.email === sharedWithEmail)
      throw new BadRequestException('You cannot share file with yourself');
    const sharedWith = await this.userService.findUser(sharedWithEmail);
    if (!sharedWith) throw new BadRequestException('User not found');
    const file = await this.fileService.getFile(user.id, +fileId);
    if (!file) throw new BadRequestException('File not found');
    const isFileShared = await this.shareService.isFileSharedWithUser(
      sharedWith.id,
      file.id,
    );
    if (isFileShared)
      throw new BadRequestException(
        'File already shared with this user before',
      );
    await this.shareService.shareFile(sharedWith.id, file.id);
    return resObj(200, 'File shared successfully', null);
  }

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Post('folder')
  async shareFolder(
    @Req() req: Request,
    @Body() body: { sharedWithEmail: string; folderId: string },
  ) {
    const user = req.user as Payload;
    const { sharedWithEmail, folderId } = body;
    const sharedWith = await this.userService.findUser(sharedWithEmail);
    if (!sharedWith) throw new BadRequestException('User not found');
    const folder = await this.folderService.isFolderExisting(
      user.id,
      +folderId,
    );
    if (!folder) throw new BadRequestException('Folder not found');
    const isFolderShared = await this.shareService.isFolderSharedWithUser(
      sharedWith.id,
      +folderId,
    );
    if (isFolderShared)
      throw new BadRequestException(
        'Folder already shared with this user before',
      );
    await this.shareService.shareFolder(sharedWith.id, +folderId);
    return resObj(200, 'Folder shared successfully', null);
  }

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Post('stop-sharing/file')
  async stopSharing(
    @Req() req: Request,
    @Body() body: { sharedWithEmail: string; folderId: string },
  ) {
    const user = req.user as Payload;
    const { sharedWithEmail, folderId } = body;
    const sharedWith = await this.userService.findUser(sharedWithEmail);
    if (!sharedWith) throw new BadRequestException('User not found');
    const folder = await this.folderService.isFolderExisting(
      user.id,
      +folderId,
    );
    if (!folder) throw new BadRequestException('Folder not found');
    await this.shareService.stopSharingFolder(sharedWith.id, +folderId);
    return resObj(200, 'Folder shared successfully', null);
  }
}
