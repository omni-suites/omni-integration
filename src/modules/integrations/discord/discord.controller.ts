import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DiscordService } from './discord.service';

@Controller('api/discord')
export class DiscordController {
  private readonly logger = new Logger(DiscordController.name);

  constructor(private readonly discordService: DiscordService) {}

  @Post('interactions')
  async handleInteractions(@Req() req: Request, @Res() res: Response) {
    // 1. Discord requires us to verify every single interaction request using Ed25519 signatures
    const isValid = await this.discordService.verifyRequest(req);
    if (!isValid) {
      this.logger.warn('Invalid signature received on /interactions');
      return res.status(HttpStatus.UNAUTHORIZED).send('Bad request signature');
    }

    // 2. If valid, process the interaction and return the correct response object
    try {
      const interaction = req.body;
      const responseBody = await this.discordService.handleInteraction(interaction);
      return res.status(HttpStatus.OK).json(responseBody);
    } catch (error) {
      this.logger.error('Error handling Discord interaction', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error');
    }
  }

  @Post('test-results')
  async handleTestResults(@Req() req: Request, @Res() res: Response) {
    try {
      this.logger.log(`Received test results notification for suite: ${req.body?.suite}, status: ${req.body?.status}`);
      await this.discordService.publishTestResult(req.body);
      return res.status(HttpStatus.OK).json({ ok: true });
    } catch (error: any) {
      this.logger.error('Error publishing test results to Discord', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}

