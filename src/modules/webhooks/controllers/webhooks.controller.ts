import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { LinearParser } from '../../integrations/linear/services/linear.parser.service';
import { LinearWebhookGuard } from '../../integrations/linear/guards/linear.webhook.guard';
import type { LinearWebhookPayload } from '../../integrations/linear/types/linear.types';
import { LinearSyncService } from '../services/linear-sync.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly linearParser: LinearParser,
    private readonly sync: LinearSyncService,
  ) {}

  @Post('linear')
  @HttpCode(200)
  @UseGuards(LinearWebhookGuard)
  async handleLinear(@Body() body: Record<string, unknown>) {
    const payload = body as unknown as LinearWebhookPayload;
    this.logger.debug(
      `Linear webhook type=${payload.type} action=${payload.action}`,
    );

    const snapshot = this.linearParser.toSnapshot(payload);
    if (!snapshot) {
      return { ok: true, action: 'ignored', reason: 'unsupported payload shape' };
    }

    if (!this.linearParser.matchesConfiguredProject(snapshot)) {
      return {
        ok: true,
        action: 'ignored',
        reason: 'project filter mismatch',
        sourceId: snapshot.sourceId,
      };
    }

    const result = await this.sync.handle(snapshot);
    return { ok: true, ...result };
  }
}
