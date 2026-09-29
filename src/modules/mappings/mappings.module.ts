import { Module } from '@nestjs/common';
import { MappingsRepository } from './mappings.repository';
import { MappingsService } from './mappings.service';

@Module({
  providers: [MappingsRepository, MappingsService],
  exports: [MappingsService],
})
export class MappingsModule {}
