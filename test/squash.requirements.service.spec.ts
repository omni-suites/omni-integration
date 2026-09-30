import { Test, TestingModule } from '@nestjs/testing';
import { SquashRequirementsService } from '../src/modules/integrations/squash/services/squash.requirements.service';
import { SquashClient } from '../src/modules/integrations/squash/services/squash.client';
import { SyncIssueSnapshot } from '../src/common/types/integration.types';

describe('SquashRequirementsService', () => {
  let service: SquashRequirementsService;
  let client: jest.Mocked<SquashClient>;

  const mockSnapshot: SyncIssueSnapshot = {
    source: 'linear',
    sourceId: 'lin-1',
    identifier: 'OMN-101',
    title: 'Order Certificate Upload',
    description: '#### High-Level AC\n* Must support `.pdf` files',
    url: 'https://linear.app/issue/OMN-101',
    readyForTc: true,
  };

  beforeEach(async () => {
    const mockClient = {
      resolveProjectId: jest.fn().mockResolvedValue('proj-1'),
      createRequirement: jest.fn().mockImplementation((payload) => Promise.resolve({ id: 'squash-1', ...payload })),
      updateRequirement: jest.fn().mockImplementation((id, payload) => Promise.resolve({ id, ...payload })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SquashRequirementsService,
        { provide: SquashClient, useValue: mockClient },
      ],
    }).compile();

    service = module.get<SquashRequirementsService>(SquashRequirementsService);
    client = module.get(SquashClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFromIssue', () => {
    it('should compile markdown into HTML and send requirement payload to Squash', async () => {
      const result = await service.createFromIssue(mockSnapshot);

      expect(client.resolveProjectId).toHaveBeenCalled();
      expect(client.createRequirement).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'requirement',
          current_version: expect.objectContaining({
            name: 'Order Certificate Upload',
            reference: 'OMN-101',
            status: 'WORK_IN_PROGRESS',
            description: expect.stringContaining('<h4>High-Level AC</h4>'),
          }),
        }),
      );
      expect(client.createRequirement.mock.calls[0][0].current_version.description).toContain('<code>.pdf</code>');
      expect(client.createRequirement.mock.calls[0][0].current_version.description).toContain('READY FOR TC');
      expect(result.id).toBe('squash-1');
    });
  });

  describe('updateFromIssue', () => {
    it('should add [Not ready] prefix to title and update status when notReady is true', async () => {
      await service.updateFromIssue('squash-1', mockSnapshot, true);

      expect(client.updateRequirement).toHaveBeenCalledWith(
        'squash-1',
        expect.objectContaining({
          current_version: expect.objectContaining({
            name: '[Not ready] Order Certificate Upload',
            description: expect.stringContaining('NOT READY'),
          }),
        }),
      );
    });
  });
});
