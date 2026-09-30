import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';
import type { Request } from 'express';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly publicKey: string;

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.configService.get<string>('DISCORD_PUBLIC_KEY') || '';
  }

  async verifyRequest(req: Request): Promise<boolean> {
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;
    const rawBody = (req as any).rawBody;

    if (!signature || !timestamp || !rawBody) {
      this.logger.warn('Missing signature headers or rawBody');
      return false;
    }

    try {
      return await verifyKey(rawBody, signature, timestamp, this.publicKey);
    } catch (err) {
      this.logger.error('Signature verification error', err);
      return false;
    }
  }

  async handleInteraction(interaction: any): Promise<any> {
    // Discord Verification Ping
    if (interaction.type === InteractionType.PING) {
      return { type: InteractionResponseType.PONG };
    }

    // Slash Commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data?.name;
      this.logger.log(`Received slash command: ${commandName}`);
      
      if (commandName === 'run-tests') {
         // Later we will parse interaction.data.options and trigger GitHub Actions
         return {
           type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
           data: {
             content: `⏳ Acknowledged \`/run-tests\`. Processing parameters...`
           }
         };
      }
    }

    // Fallback response
    return { 
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, 
      data: { content: 'Unknown command.' } 
    };
  }
}
