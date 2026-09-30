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
    this.logger.log(`DISCORD_PUBLIC_KEY loaded: ${this.publicKey ? `yes (${this.publicKey.length} chars)` : 'NO — EMPTY!'}`);
  }

  async verifyRequest(req: Request): Promise<boolean> {
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;
    
    // In NestJS, rawBody is buffered if enabled in main.ts
    const rawBody = (req as any).rawBody;

    this.logger.debug(`Verify check — sig: ${!!signature}, ts: ${!!timestamp}, rawBody: ${!!rawBody} (type: ${typeof rawBody}), pubKey length: ${this.publicKey.length}`);

    if (!signature || !timestamp || !rawBody) {
      this.logger.warn(`Missing fields — sig: ${!!signature}, ts: ${!!timestamp}, rawBody: ${!!rawBody}`);
      return false;
    }

    try {
      const result = await verifyKey(rawBody, signature, timestamp, this.publicKey);
      this.logger.debug(`verifyKey result: ${result}`);
      return result;
    } catch (err) {
      this.logger.error('Signature verification threw an error', err);
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
