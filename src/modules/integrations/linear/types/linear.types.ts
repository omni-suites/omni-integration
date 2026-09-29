export interface LinearWebhookPayload {
  action: 'create' | 'update' | 'remove';
  type: string;
  data: {
    id?: string;
    issueId?: string;
    title?: string;
    description?: string;
    url?: string;
    identifier?: string;
    teamId?: string;
    team?: { id?: string; name?: string; key?: string };
    projectId?: string;
    project?: { id?: string; name?: string };
    labels?: Array<{ id?: string; name: string }>;
    issue?: {
      id?: string;
      title?: string;
      description?: string;
      url?: string;
      identifier?: string;
      teamId?: string;
      team?: { id?: string; name?: string; key?: string };
      projectId?: string;
      project?: { id?: string; name?: string };
      labels?: Array<{ id?: string; name: string }>;
    };
  };
}
