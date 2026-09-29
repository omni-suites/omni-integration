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
