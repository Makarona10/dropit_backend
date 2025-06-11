import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';
import { resObj } from 'src/utils';

@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @UseGuards(JwtAuthGuard)
  @Get('list-tags')
  async getTags(
    @Req() req: Request,
    @Query('page', new ParseIntPipe()) page: number,
  ) {
    const user = req.user as { id: string; email: string };
    const tags = await this.tagService.getUserTags(user.id, +page);

    return resObj(200, 'Tags retrieved successfully', tags);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tag-files')
  async getTagFiles(
    @Req() req: Request,
    @Query('tagId', new ParseIntPipe()) tagId: number,
    @Body('orderBy') orderBy: 'name' | 'createdAt',
    @Body('arrange') arrange: 'asc' | 'desc',
  ) {
    const user = req.user as { id: string; email: string };
    const files = await this.tagService.getTagFiles(
      user.id,
      +tagId,
      orderBy || 'createdAt',
      arrange || 'desc',
    );

    return resObj(200, 'Tag files retrieved successfully', files);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @Post('create')
  async createTag(@Req() req: Request, @Body('name') name: string) {
    const user = req.user as { id: string; email: string };
    if (!name || name.length === 0) {
      throw new BadRequestException('Please pick a name for the tag');
    }

    const tagExisted = await this.tagService.isTagExisted(name, user.id);

    if (tagExisted) {
      throw new BadRequestException(
        'Tag already exists, please choose another name',
      );
    }

    await this.tagService.addTag(user.id, name);

    return resObj(201, 'Tag created successfully', []);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete')
  async deleteTag(
    @Req() req: Request,
    @Query('tagId', new ParseIntPipe()) tagId: number,
  ) {
    const user = req.user as { id: string; email: string };
    await this.tagService.deleteTag(+tagId, user.id);

    return { message: 'Tag delete successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchTag(@Req() req: Request, @Query('name') name: string) {
    const user = req.user as { id: string; email: string };
    if (!name) throw new BadRequestException('Please provide a search string');
    return await this.tagService.searchTagsByName(name, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('rename')
  async renameTag(
    @Req() req: Request,
    @Query('tagId', new ParseIntPipe()) tagId: string,
    @Query('newName') newName: string,
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.tagService.renameTag(+tagId, user.id, newName);

    return { message: result };
  }
}
