import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IntegrationSource,
  IntegrationTarget,
  MappingStatus,
} from '../../common/types/integration.types';
import { MappingsRepository } from './mappings.repository';

@Injectable()
export class MappingsService {
  constructor(private readonly repo: MappingsRepository) {}

  find(source: IntegrationSource, sourceId: string, target: IntegrationTarget) {
    return this.repo.findBySourceTarget(source, sourceId, target);
  }

  create(input: {
    source: IntegrationSource;
    sourceId: string;
    target: IntegrationTarget;
    targetId: string;
    readyFlag: boolean;
    status: MappingStatus;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.repo.create(input);
  }

  markReady(
    id: string,
    opts: {
      targetId?: string;
      status: MappingStatus;
      readyFlag: boolean;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return this.repo.update(id, opts);
  }
}
