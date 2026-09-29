import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/config/prisma.service';
import {
  IntegrationSource,
  IntegrationTarget,
  MappingStatus,
} from '../../../common/types/integration.types';

@Injectable()
export class MappingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySourceTarget(
    source: IntegrationSource,
    sourceId: string,
    target: IntegrationTarget,
  ) {
    return this.prisma.integrationMapping.findUnique({
      where: {
        source_sourceId_target: { source, sourceId, target },
      },
    });
  }

  create(data: {
    source: IntegrationSource;
    sourceId: string;
    target: IntegrationTarget;
    targetId: string;
    readyFlag: boolean;
    status: MappingStatus;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.integrationMapping.create({ data });
  }

  update(
    id: string,
    data: {
      targetId?: string;
      status: MappingStatus;
      readyFlag: boolean;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma.integrationMapping.update({ where: { id }, data });
  }
}
