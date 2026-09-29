import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SquashClient } from './squash.client';
import { SquashRequirementsService } from './squash.requirements';

@Module({
  imports: [HttpModule],
  providers: [SquashClient, SquashRequirementsService],
  exports: [SquashClient, SquashRequirementsService],
})
export class SquashModule {}
