import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['log', 'error', 'warn', 'debug'],
  });
  app.enableCors();
  const port = parseInt(process.env.PORT || '3003', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`Omni-integration service listening on port ${port}`);
  logger.log(`Health endpoint: http://localhost:${port}/health`);
  logger.log(`Linear webhook endpoint: http://localhost:${port}/webhooks/linear`);
}
bootstrap();
