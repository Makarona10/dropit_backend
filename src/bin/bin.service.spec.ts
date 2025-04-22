import { Test, TestingModule } from '@nestjs/testing';
import { BinService } from './bin.service';

describe('BinService', () => {
  let service: BinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BinService],
    }).compile();

    service = module.get<BinService>(BinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
