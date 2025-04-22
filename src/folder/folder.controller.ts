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
  UseGuards,
} from '@nestjs/common';
import { FolderService } from './folder.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create/:userId')
  async createFolder(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('parentId', new ParseIntPipe()) parentId: string,
    @Query('name') name: string,
  ) {
    if (!name || typeof name != 'string')
      throw new BadRequestException('Folder must have a name');

    await this.folderService.createFolder(userId, +parentId, name);
    return {
      message: 'Folder created successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:userId')
  async deleteFolder(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('folderId', new ParseIntPipe()) folderId: number,
  ) {
    await this.folderService.deleteFolder(+folderId);
    return {
      message: 'Folder deleted successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-name/:userId')
  async changeFolderName(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('folderId', new ParseIntPipe()) folderId: number,
    @Query('newName') newName: string,
  ) {
    await this.folderService.changeFolderName(+folderId, newName, userId);
    return {
      message: 'Folder name updated successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('file-content/:userId')
  /**
   * If folderId = 0 -> API will return root directory files
   *
   * If folderId > 0 -> API will return the intended folder files
   */
  async getFolderContent(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('folderId', new ParseIntPipe()) folderId: number,
  ) {
    return await this.folderService.getFolderContent(userId, +folderId);
  }
}
