import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscordController } from './discord.controller';
import { DiscordService } from './discord.service';

@Module({
  imports: [ConfigModule],
  controllers: [DiscordController],
  providers: [DiscordService],
  exports: [DiscordService]
})
export class DiscordModule {}
