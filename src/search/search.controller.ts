import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SearchService } from './search.service';
import { resObj } from 'src/utils';
import { UserService } from 'src/user/user.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('files/:name')
  async searchForFile(
    @Req() req: Request,
    @Param('name') name: string,
    @Query('page', new ParseIntPipe()) page: number,
    @Query('order') order: 'asc' | 'desc',
    @Query('type') fType: 'video' | 'image' | 'other' | 'audio',
  ) {
    const user = req.user as { id: string; email: string };
    const result = await this.searchService.searchForFile(
      user.id,
      name,
      +page,
      order || 'desc',
      fType,
    );

    return resObj(200, 'Search result retrieved successfully', result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/:email')
  async searchForUser(@Param('email') email: string) {
    const result = await this.userService.findUsersByEmail(email);

    return resObj(200, 'Users retrieved successfully', result);
  }
}
