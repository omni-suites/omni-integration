import { Module } from '@nestjs/common';
import { LinearModule } from './linear/linear.module';
import { SquashModule } from './squash/squash.module';

@Module({
  imports: [LinearModule, SquashModule],
  exports: [LinearModule, SquashModule],
})
export class IntegrationsModule {}
