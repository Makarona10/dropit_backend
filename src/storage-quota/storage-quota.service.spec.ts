import { Test, TestingModule } from '@nestjs/testing';
import { StorageQuotaService } from './storage-quota.service';

describe('StorageQuotaService', () => {
  let service: StorageQuotaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageQuotaService],
    }).compile();

    service = module.get<StorageQuotaService>(StorageQuotaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
