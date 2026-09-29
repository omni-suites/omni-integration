export type IntegrationSource = 'linear' | string;
export type IntegrationTarget = 'squash' | string;

export type MappingStatus = 'ACTIVE' | 'NOT_READY';

export interface SyncIssueSnapshot {
  source: IntegrationSource;
  sourceId: string;
  identifier: string;
  title: string;
  description: string;
  url: string;
  projectId?: string;
  projectName?: string;
  labelNames: string[];
  readyForTc: boolean;
}
