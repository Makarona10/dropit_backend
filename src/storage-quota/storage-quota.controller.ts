import {
  Controller,
  Get,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { StorageQuotaService } from './storage-quota.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('storage-quota')
export class StorageQuotaController {
  constructor(private readonly storageQuotaService: StorageQuotaService) {}

  // @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async getUserQuota(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.storageQuotaService.getUserQuota(userId);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('upgrade/:userId')
  async upgradeQuota(@Param('userId', new ParseUUIDPipe()) userId: string) {
    throw new NotImplementedException('Will be available soon!');
  }
}
