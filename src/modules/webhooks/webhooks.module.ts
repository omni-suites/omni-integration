import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PrismaService } from '../../core/config/prisma.service';
import { WebhooksController } from './controllers/webhooks.controller';
import { LinearSyncService } from './services/linear-sync.service';
import { MappingsRepository } from './repositories/mappings.repository';

@Module({
  imports: [IntegrationsModule],
  controllers: [WebhooksController],
  providers: [
    PrismaService,
    MappingsRepository,
    LinearSyncService,
  ],
})
export class WebhooksModule {}
