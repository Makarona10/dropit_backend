import { Test, TestingModule } from '@nestjs/testing';
import { StorageQuotaController } from './storage-quota.controller';

describe('StorageQuotaController', () => {
  let controller: StorageQuotaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageQuotaController],
    }).compile();

    controller = module.get<StorageQuotaController>(StorageQuotaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
