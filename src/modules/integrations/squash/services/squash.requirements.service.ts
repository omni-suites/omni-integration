import { Injectable } from '@nestjs/common';
import { SyncIssueSnapshot } from '../../../../common/types/integration.types';
import { SquashClient } from './squash.client';
import { SquashRequirement, SquashRequirementPayload } from '../types/squash.types';

const NOT_READY_PREFIX = '[Not ready] ';

@Injectable()
export class SquashRequirementsService {
  constructor(private readonly client: SquashClient) {}

  private buildDescription(issue: SyncIssueSnapshot, notReady = false): string {
    const parts = [
      issue.description?.trim() || '(no description)',
      '',
      '---',
      `Linear: ${issue.identifier}`,
      issue.url ? `URL: ${issue.url}` : null,
      notReady ? 'Status: NOT READY (ready-for-tc label removed)' : 'Status: READY FOR TC',
    ].filter(Boolean);

    return parts.join('\n');
  }

  private buildName(issue: SyncIssueSnapshot, notReady = false): string {
    const base = issue.title.replace(/^\[Not ready\]\s*/i, '').trim();
    return notReady ? `${NOT_READY_PREFIX}${base}` : base;
  }

  async createFromIssue(issue: SyncIssueSnapshot): Promise<SquashRequirement> {
    const projectId = await this.client.resolveProjectId();
    const payload: SquashRequirementPayload = {
      _type: 'requirement',
      name: this.buildName(issue, false),
      description: this.buildDescription(issue, false),
      reference: issue.identifier,
      status: 'WORK_IN_PROGRESS',
      parent: {
        _type: 'project',
        id: projectId,
      },
    };

    return this.client.createRequirement(payload);
  }

  async updateFromIssue(
    squashId: string,
    issue: SyncIssueSnapshot,
    notReady = false,
  ): Promise<SquashRequirement> {
    const payload = {
      _type: 'requirement',
      name: this.buildName(issue, notReady),
      description: this.buildDescription(issue, notReady),
      reference: issue.identifier,
    };

    return this.client.updateRequirement(squashId, payload);
  }
}
