import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    CoreModule,
    IntegrationsModule,
    WebhooksModule,
  ],
})
export class AppModule {}
