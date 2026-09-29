import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SyncModule } from '../sync/sync.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [IntegrationsModule, SyncModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
