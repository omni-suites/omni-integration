import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SquashClient } from './services/squash.client';
import { SquashRequirementsService } from './services/squash.requirements.service';

@Module({
  imports: [HttpModule],
  providers: [SquashClient, SquashRequirementsService],
  exports: [SquashClient, SquashRequirementsService],
})
export class SquashModule {}
