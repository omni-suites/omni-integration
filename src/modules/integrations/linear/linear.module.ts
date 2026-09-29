import { Module } from '@nestjs/common';
import { LinearParser } from './services/linear.parser.service';
import { LinearWebhookGuard } from './guards/linear.webhook.guard';

@Module({
  providers: [LinearParser, LinearWebhookGuard],
  exports: [LinearParser, LinearWebhookGuard],
})
export class LinearModule {}
