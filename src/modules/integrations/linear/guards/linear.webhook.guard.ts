import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class LinearWebhookGuard implements CanActivate {
  private readonly logger = new Logger(LinearWebhookGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('LINEAR_WEBHOOK_SECRET')?.trim();
    if (!secret) {
      // PoC convenience: allow when secret not configured (local only).
      this.logger.warn(
        'LINEAR_WEBHOOK_SECRET is not configured; skipping signature verification (local development mode)',
      );
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const signature = req.header('linear-signature') ?? req.header('Linear-Signature');
    if (!signature) {
      this.logger.warn('Linear webhook rejected: Missing Linear-Signature header');
      throw new UnauthorizedException('Missing Linear-Signature header');
    }

    const raw =
      req.rawBody ??
      (typeof req.body === 'string'
        ? Buffer.from(req.body)
        : Buffer.from(JSON.stringify(req.body ?? {})));

    const digest = createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(digest);
    const b = Buffer.from(signature);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      this.logger.warn('Linear webhook rejected: Invalid Linear webhook signature');
      throw new UnauthorizedException('Invalid Linear webhook signature');
    }

    this.logger.debug('Linear webhook signature verified successfully');
    return true;
  }
}
