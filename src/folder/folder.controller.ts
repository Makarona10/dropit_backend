import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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
  @Post('create')
  async createFolder(
    @Req() req: Request,
    @Query('parentId', new ParseIntPipe()) parentId: string,
    @Query('name') name: string,
  ) {
    if (!name || typeof name != 'string')
      throw new BadRequestException('Folder must have a name');

    const user = req.user as { id: string; email: string };
    await this.folderService.createFolder(user.id, +parentId, name);
    return {
      message: 'Folder created successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete')
  async deleteFolder(
    @Req() req: Request,
    @Query('folderId', new ParseIntPipe()) folderId: number,
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
  @Get('file-content')
  /**
   * If folderId = 0 -> API will return root directory files
   *
   * If folderId > 0 -> API will return the intended folder files
   */
  async getFolderContent(
    @Req() req: Request,
    @Query('folderId', new ParseIntPipe()) folderId: number,
  ) {
    const user = req.user as { id: string; email: string };
    return await this.folderService.getFolderContent(user.id, +folderId);
  }
}
