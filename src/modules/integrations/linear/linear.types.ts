export interface LinearLabel {
  id?: string;
  name: string;
}

export interface LinearProject {
  id?: string;
  name?: string;
}

export interface LinearIssueData {
  id: string;
  title?: string;
  description?: string | null;
  url?: string;
  identifier?: string;
  labels?: LinearLabel[];
  labelIds?: string[];
  project?: LinearProject | null;
  projectId?: string;
}

export interface LinearWebhookPayload {
  action?: string;
  type?: string;
  createdAt?: string;
  organizationId?: string;
  webhookTimestamp?: number;
  data?: LinearIssueData & {
    issueId?: string;
    labelId?: string;
    issue?: LinearIssueData;
    label?: LinearLabel;
  };
  updatedFrom?: Record<string, unknown>;
}
