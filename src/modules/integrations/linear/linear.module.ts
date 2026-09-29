import { Module } from '@nestjs/common';
import { LinearParser } from './linear.parser';
import { LinearWebhookGuard } from './linear.webhook.guard';

@Module({
  providers: [LinearParser, LinearWebhookGuard],
  exports: [LinearParser, LinearWebhookGuard],
})
export class LinearModule {}
