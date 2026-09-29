import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MappingsModule } from '../mappings/mappings.module';
import { LinearToSquashSync } from './linear-to-squash.sync';

@Module({
  imports: [IntegrationsModule, MappingsModule],
  providers: [LinearToSquashSync],
  exports: [LinearToSquashSync],
})
export class SyncModule {}
