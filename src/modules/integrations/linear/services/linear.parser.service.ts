import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SyncIssueSnapshot } from '../../../../common/types/integration.types';
import { LinearWebhookPayload } from '../types/linear.types';

@Injectable()
export class LinearParser {
  constructor(private readonly config: ConfigService) {}

  private readyLabel(): string {
    return this.config.get<string>('LINEAR_READY_LABEL', 'ready-for-tc');
  }

  /**
   * Normalize Issue / IssueLabel webhook payloads into a sync snapshot.
   * Returns null when the payload is not an issue-shaped event we can sync.
   */
  toSnapshot(payload: LinearWebhookPayload): SyncIssueSnapshot | null {
    const issue =
      payload.data?.issue ??
      (payload.data?.id && (payload.type === 'Issue' || !payload.data?.issueId)
        ? payload.data
        : null);

    if (!issue?.id) {
      return null;
    }

    const labels = (issue.labels ?? []).map((l) => l.name).filter(Boolean);
    const readyLabel = this.readyLabel();
    const readyForTc = labels.some(
      (name) => name.toLowerCase() === readyLabel.toLowerCase(),
    );

    return {
      source: 'linear',
      sourceId: issue.id,
      identifier: issue.identifier ?? issue.id,
      title: issue.title?.trim() || issue.identifier || issue.id,
      description: issue.description ?? '',
      url: issue.url ?? '',
      projectId: issue.project?.id ?? issue.projectId,
      projectName: issue.project?.name,
      labelNames: labels,
      readyForTc,
    };
  }

  matchesConfiguredProject(snapshot: SyncIssueSnapshot): boolean {
    const projectId = this.config.get<string>('LINEAR_PROJECT_ID')?.trim();
    const projectName = this.config.get<string>('LINEAR_PROJECT_NAME')?.trim();

    if (!projectId && !projectName) {
      return true;
    }

    if (projectId && snapshot.projectId === projectId) {
      return true;
    }

    if (
      projectName &&
      snapshot.projectName?.toLowerCase() === projectName.toLowerCase()
    ) {
      return true;
    }

    return false;
  }
}
