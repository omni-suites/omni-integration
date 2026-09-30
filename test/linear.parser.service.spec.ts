import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LinearParser } from '../src/modules/integrations/linear/services/linear.parser.service';
import { LinearWebhookPayload } from '../src/modules/integrations/linear/types/linear.types';

describe('LinearParser', () => {
  let parser: LinearParser;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'LINEAR_READY_LABEL') return 'ready-for-tc';
        if (key === 'LINEAR_TEAM_NAME') return 'omni-suites';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinearParser,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    parser = module.get<LinearParser>(LinearParser);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(parser).toBeDefined();
  });

  describe('toSnapshot', () => {
    it('should parse an Issue webhook payload into a SyncIssueSnapshot', () => {
      const payload: LinearWebhookPayload = {
        action: 'create',
        type: 'Issue',
        data: {
          id: 'lin-issue-1',
          identifier: 'OMN-10',
          title: 'Add Login Button',
          description: '#### Requirements\n* Must be blue',
          url: 'https://linear.app/issue/OMN-10',
          team: { id: 'team-1', name: 'omni-suites', key: 'OMN' },
          labels: [{ id: 'lbl-1', name: 'ready-for-tc' }],
        },
      };

      const snapshot = parser.toSnapshot(payload);

      expect(snapshot).not.toBeNull();
      expect(snapshot?.identifier).toBe('OMN-10');
      expect(snapshot?.title).toBe('Add Login Button');
      expect(snapshot?.readyForTc).toBe(true);
      expect(snapshot?.teamName).toBe('omni-suites');
    });

    it('should return null if payload has no issue id', () => {
      const payload: any = { action: 'update', type: 'Comment', data: {} };
      expect(parser.toSnapshot(payload)).toBeNull();
    });

    it('should set readyForTc to false if ready label is missing', () => {
      const payload: LinearWebhookPayload = {
        action: 'update',
        type: 'Issue',
        data: {
          id: 'lin-issue-2',
          identifier: 'OMN-11',
          title: 'WIP task',
          labels: [{ id: 'lbl-2', name: 'bug' }],
        },
      };

      const snapshot = parser.toSnapshot(payload);
      expect(snapshot?.readyForTc).toBe(false);
    });
  });

  describe('matchesConfiguredTeam', () => {
    it('should return true when teamName matches configured LINEAR_TEAM_NAME', () => {
      const snapshot: any = { teamName: 'omni-suites' };
      expect(parser.matchesConfiguredTeam(snapshot)).toBe(true);
    });

    it('should return false when teamName does not match', () => {
      const snapshot: any = { teamName: 'other-team' };
      expect(parser.matchesConfiguredTeam(snapshot)).toBe(false);
    });
  });
});
