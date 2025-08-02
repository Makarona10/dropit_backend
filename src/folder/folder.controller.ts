import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FolderService } from './folder.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';
import { resObj } from 'src/utils';

@Controller('folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @UseGuards(JwtAuthGuard)
  @Get('/')
  async getUserFolders(
    @Req() req: Request,
    @Query('page', new ParseIntPipe()) page: number,
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.folderService.getUserFolders(user.id, +page);
    return resObj(200, 'Folders retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createFolder(
    @Req() req: Request,
    @Body('parentId') parentId: number | null,
    @Body('name') name: string,
  ) {
    if (!name || typeof name != 'string')
      throw new BadRequestException('Folder must have a name');

    const user = req.user as { id: string; email: string };
    await this.folderService.createFolder(user.id, +parentId, name);
    return resObj(201, 'Folder created successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:folderId')
  async deleteFolder(
    @Req() req: Request,
    @Param('folderId', new ParseIntPipe()) folderId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.folderService.deleteFolder(user.id, +folderId);
    return resObj(200, 'Folder deleted successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-name')
  async changeFolderName(
    @Req() req: Request,
    @Query('folderId', new ParseIntPipe()) folderId: number,
    @Query('newName') newName: string,
  ) {
    const user = req.user as { id: string; email: string };
    await this.folderService.changeFolderName(+folderId, newName, user.id);
    return resObj(200, 'Folder name updated successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Get('folder-content/:folderId')
  async getFolderContent(
    @Req() req: Request,
    @Param('folderId', new ParseIntPipe()) folderId: number,
    @Query('page', new ParseIntPipe()) page: number,
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.folderService.getFolderContent(
      user.id,
      +folderId,
      page,
    );
    return resObj(200, 'Folder content retrieved successfully', result);
  }
}
