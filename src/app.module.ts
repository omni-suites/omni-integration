import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MappingsModule } from './modules/mappings/mappings.module';
import { SyncModule } from './modules/sync/sync.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    CoreModule,
    IntegrationsModule,
    MappingsModule,
    SyncModule,
    WebhooksModule,
  ],
})
export class AppModule {}
