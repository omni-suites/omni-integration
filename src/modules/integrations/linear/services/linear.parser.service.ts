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
    // If it's an IssueLabel event without embedded issue, skip it (Linear sends companion Issue update)
    if (payload.type === 'IssueLabel' && !payload.data?.issue) {
      return null;
    }

    const issue =
      payload.data?.issue ??
      (payload.type === 'Issue' ? payload.data : null);

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
      teamId: issue.team?.id ?? issue.teamId,
      teamName: issue.team?.name,
      teamKey: issue.team?.key,
      labelNames: labels,
      readyForTc,
    };
  }

  matchesConfiguredTeam(snapshot: SyncIssueSnapshot): boolean {
    const configuredTeamId = this.config.get<string>('LINEAR_TEAM_ID')?.trim();
    const configuredTeamName = this.config.get<string>('LINEAR_TEAM_NAME')?.trim();
    const configuredTeamKey = this.config.get<string>('LINEAR_TEAM_KEY')?.trim();

    // If nothing configured, match all issues
    if (!configuredTeamId && !configuredTeamName && !configuredTeamKey) {
      return true;
    }

    if (configuredTeamId && snapshot.teamId === configuredTeamId) {
      return true;
    }

    if (
      configuredTeamName &&
      snapshot.teamName?.toLowerCase() === configuredTeamName.toLowerCase()
    ) {
      return true;
    }

    if (
      configuredTeamKey &&
      snapshot.teamKey?.toLowerCase() === configuredTeamKey.toLowerCase()
    ) {
      return true;
    }

    return false;
  }
}
