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
    this.logger.log(
      `Received Linear webhook: type=${payload?.type} action=${payload?.action}`,
    );

    const snapshot = this.linearParser.toSnapshot(payload);
    if (!snapshot) {
      this.logger.warn(
        `Ignored Linear webhook: unsupported payload shape (type=${payload?.type}, action=${payload?.action})`,
      );
      return { ok: true, action: 'ignored', reason: 'unsupported payload shape' };
    }

    if (!this.linearParser.matchesConfiguredTeam(snapshot)) {
      this.logger.log(
        `Ignored Linear webhook for "${snapshot.identifier}": team "${snapshot.teamName || snapshot.teamKey || 'unknown'}" does not match configured filter`,
      );
      return {
        ok: true,
        action: 'ignored',
        reason: 'team filter mismatch',
        sourceId: snapshot.sourceId,
      };
    }

    const result = await this.sync.handle(snapshot);
    this.logger.log(
      `Completed Linear webhook for "${snapshot.identifier}": action=${result.action}${result.squashId ? ` (Squash ID: ${result.squashId})` : ''}`,
    );
    return { ok: true, ...result };
  }
}
