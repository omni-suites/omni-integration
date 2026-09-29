import { Injectable, Logger } from '@nestjs/common';
import { SyncIssueSnapshot } from '../../common/types/integration.types';
import { SquashRequirementsService } from '../integrations/squash/squash.requirements';
import { MappingsService } from '../mappings/mappings.service';

export type SyncAction =
  | 'ignored'
  | 'created'
  | 'updated'
  | 'marked_not_ready';

export interface SyncResult {
  action: SyncAction;
  reason?: string;
  squashId?: string;
  sourceId?: string;
}

@Injectable()
export class LinearToSquashSync {
  private readonly logger = new Logger(LinearToSquashSync.name);
  private readonly target = 'squash' as const;

  constructor(
    private readonly mappings: MappingsService,
    private readonly squashReqs: SquashRequirementsService,
  ) {}

  async handle(issue: SyncIssueSnapshot): Promise<SyncResult> {
    const mapping = await this.mappings.find(issue.source, issue.sourceId, this.target);

    if (issue.readyForTc) {
      if (!mapping) {
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
        this.logger.log(`Created Squash requirement ${squashId} for ${issue.identifier}`);
        return { action: 'created', squashId, sourceId: issue.sourceId };
      }

      await this.squashReqs.updateFromIssue(mapping.targetId, issue, false);
      await this.mappings.markReady(mapping.id, {
        readyFlag: true,
        status: 'ACTIVE',
        metadata: {
          identifier: issue.identifier,
          url: issue.url,
        },
      });
      this.logger.log(
        `Updated Squash requirement ${mapping.targetId} for ${issue.identifier}`,
      );
      return {
        action: 'updated',
        squashId: mapping.targetId,
        sourceId: issue.sourceId,
      };
    }

    if (mapping) {
      await this.squashReqs.updateFromIssue(mapping.targetId, issue, true);
      await this.mappings.markReady(mapping.id, {
        readyFlag: false,
        status: 'NOT_READY',
        metadata: {
          identifier: issue.identifier,
          url: issue.url,
        },
      });
      this.logger.log(
        `Marked Squash requirement ${mapping.targetId} NOT_READY for ${issue.identifier}`,
      );
      return {
        action: 'marked_not_ready',
        squashId: mapping.targetId,
        sourceId: issue.sourceId,
      };
    }

    return {
      action: 'ignored',
      reason: 'no ready-for-tc label and no existing mapping',
      sourceId: issue.sourceId,
    };
  }
}
