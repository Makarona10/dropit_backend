import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  // @UseGuards(JwtAuthGuard)
  @Get('list-tags/:userId')
  async getTags(@Param('userId', new ParseUUIDPipe()) userId: string) {
    const tags = await this.tagService.getUserTags(userId);

    return {
      message: 'Tags retrieved successfully',
      data: tags,
    };
  }

  // @UseGuards(JwtAuthGuard)
  @Get('tag-files/:userId')
  async getTagFiles(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('tagId', new ParseIntPipe()) tagId: number,
    @Body('orderBy') orderBy: 'name' | 'createdAt',
    @Body('arrange') arrange: 'asc' | 'desc',
  ) {
    const files = await this.tagService.getTagFiles(
      userId,
      +tagId,
      orderBy || 'createdAt',
      arrange || 'desc',
    );

    return files;
  }

  // @UseGuards(JwtAuthGuard)
  @Delete('delete/:userId')
  async deleteTag(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('tagId', new ParseIntPipe()) tagId: number,
  ) {
    await this.tagService.deleteTag(+tagId, userId);

    return { message: 'Tag delete successfully' };
  }

  // @UseGuards(JwtAuthGuard)
  @Get('search/:userId')
  async searchTag(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('name') name: string,
  ) {
    if (!name) throw new BadRequestException('Please provide a search string');
    return await this.tagService.searchTagsByName(name, userId);
  }

  // @UseGuards(JwtAuthGuard)
  @Patch('rename/:userId')
  async renameTag(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('tagId', new ParseIntPipe()) tagId: string,
    @Query('newName') newName: string,
  ) {
    const result = await this.tagService.renameTag(+tagId, userId, newName);

    return { message: result };
  }
}
