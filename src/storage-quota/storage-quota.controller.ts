import {
  Controller,
  Get,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StorageQuotaService } from './storage-quota.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('storage-quota')
export class StorageQuotaController {
  constructor(private readonly storageQuotaService: StorageQuotaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getUserQuota(@Req() req: Request) {
    const user = req.user as { id: string; email: string };
    return this.storageQuotaService.getUserQuota(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('upgrade')
  async upgradeQuota(@Param('userId', new ParseUUIDPipe()) userId: string) {
    throw new NotImplementedException('Will be available soon!');
  }
}
