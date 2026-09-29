import { Injectable, Logger } from '@nestjs/common';
import { SyncIssueSnapshot } from '../../../common/types/integration.types';
import { SquashRequirementsService } from '../../integrations/squash/services/squash.requirements.service';
import { MappingsRepository } from '../repositories/mappings.repository';
import { SyncResult } from '../types/sync.types';

@Injectable()
export class LinearSyncService {
  private readonly logger = new Logger(LinearSyncService.name);
  private readonly target = 'squash' as const;

  constructor(
    private readonly mappings: MappingsRepository,
    private readonly squashReqs: SquashRequirementsService,
  ) {}

  async handle(issue: SyncIssueSnapshot): Promise<SyncResult> {
    this.logger.log(
      `Processing issue ${issue.identifier} ("${issue.title}") | readyForTc=${issue.readyForTc}`,
    );

    const mapping = await this.mappings.findBySourceTarget(
      issue.source,
      issue.sourceId,
      this.target,
    );

    if (mapping) {
      this.logger.debug(
        `Found existing mapping: Linear ${issue.identifier} -> Squash ID ${mapping.targetId} (status: ${mapping.status})`,
      );
    } else {
      this.logger.debug(`No existing mapping found for Linear ${issue.identifier}`);
    }

    if (issue.readyForTc) {
      if (!mapping) {
        this.logger.log(
          `Creating new Squash requirement for Linear issue ${issue.identifier}...`,
        );
        const created = await this.squashReqs.createFromIssue(issue);
        const squashId = String(created.id);
        await this.mappings.create({
          source: issue.source,
          sourceId: issue.sourceId,
          target: this.target,
          targetId: squashId,
          readyFlag: true,
          status: 'ACTIVE',
          metadata: {
            identifier: issue.identifier,
            url: issue.url,
          },
        });
        this.logger.log(`Created Squash requirement ID ${squashId} for ${issue.identifier}`);
        return { action: 'created', squashId, sourceId: issue.sourceId };
      }

      this.logger.log(
        `Updating existing Squash requirement ID ${mapping.targetId} for ${issue.identifier}...`,
      );
      await this.squashReqs.updateFromIssue(mapping.targetId, issue, false);
      await this.mappings.update(mapping.id, {
        readyFlag: true,
        status: 'ACTIVE',
        metadata: {
          identifier: issue.identifier,
          url: issue.url,
        },
      });
      this.logger.log(
        `Updated Squash requirement ID ${mapping.targetId} for ${issue.identifier}`,
      );
      return {
        action: 'updated',
        squashId: mapping.targetId,
        sourceId: issue.sourceId,
      };
    }

    if (mapping) {
      this.logger.log(
        `Marking Squash requirement ID ${mapping.targetId} as NOT_READY (label removed for ${issue.identifier})...`,
      );
      await this.squashReqs.updateFromIssue(mapping.targetId, issue, true);
      await this.mappings.update(mapping.id, {
        readyFlag: false,
        status: 'NOT_READY',
        metadata: {
          identifier: issue.identifier,
          url: issue.url,
        },
      });
      this.logger.log(
        `Marked Squash requirement ID ${mapping.targetId} as NOT_READY for ${issue.identifier}`,
      );
      return {
        action: 'marked_not_ready',
        squashId: mapping.targetId,
        sourceId: issue.sourceId,
      };
    }

    this.logger.log(
      `Ignored issue ${issue.identifier}: no ready-for-tc label and no existing Squash mapping`,
    );
    return {
      action: 'ignored',
      reason: 'no ready-for-tc label and no existing mapping',
      sourceId: issue.sourceId,
    };
  }
}
