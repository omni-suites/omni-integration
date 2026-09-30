import { Module } from '@nestjs/common';
import { LinearModule } from './linear/linear.module';
import { SquashModule } from './squash/squash.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [LinearModule, SquashModule, DiscordModule],
  exports: [LinearModule, SquashModule, DiscordModule],
})
export class IntegrationsModule {}
