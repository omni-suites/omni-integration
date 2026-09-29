import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { LinearParser } from '../integrations/linear/linear.parser';
import { LinearWebhookGuard } from '../integrations/linear/linear.webhook.guard';
import type { LinearWebhookPayload } from '../integrations/linear/linear.types';
import { LinearToSquashSync } from '../sync/linear-to-squash.sync';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly linearParser: LinearParser,
    private readonly sync: LinearToSquashSync,
  ) {}

  @Post('linear')
  @HttpCode(200)
  @UseGuards(LinearWebhookGuard)
  async handleLinear(@Body() body: Record<string, unknown>) {
    const payload = body as LinearWebhookPayload;
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
