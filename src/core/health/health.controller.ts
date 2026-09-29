import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get(['/', 'health'])
  getHealth(): object {
    return {
      service: 'omni-integration',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
