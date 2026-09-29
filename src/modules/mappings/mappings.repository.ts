import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class MappingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySourceTarget(source: string, sourceId: string, target: string) {
    return this.prisma.integrationMapping.findUnique({
      where: {
        source_sourceId_target: { source, sourceId, target },
      },
    });
  }

  create(data: {
    source: string;
    sourceId: string;
    target: string;
    targetId: string;
    readyFlag: boolean;
    status: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.integrationMapping.create({ data });
  }

  update(
    id: string,
    data: {
      targetId?: string;
      readyFlag?: boolean;
      status?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma.integrationMapping.update({
      where: { id },
      data,
    });
  }
}
