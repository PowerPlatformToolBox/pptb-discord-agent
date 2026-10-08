import type { NotificationConfig } from '../config/notifications';
import type { PptbEvent } from '../types/pptbEvents';

export const samplePptbEvent = (overrides: Partial<PptbEvent> = {}): PptbEvent =>
  ({
    id: 'intake:abc-123:pending_review',
    category: 'toolSubmission',
    event: 'New',
    occurredAt: '2026-10-07T06:00:00.000Z',
    subject: { type: 'intake', id: 'abc-123' },
    tool: { name: 'FetchXML Builder', url: 'https://www.powerplatformtoolbox.com/tools/abc' },
    developer: 'Jane Dev',
    ...overrides,
  }) as PptbEvent;

export const testNotificationConfig = (): NotificationConfig => ({
  defaultChannelId: '100000000000000001',
  mentions: {
    toolIntake: { type: 'role', id: '200000000000000001' },
    toolVerification: { type: 'role', id: '200000000000000002' },
    maintainer: { type: 'user', id: '300000000000000001' },
    notYetCreated: { type: 'role' },
  },
  categories: {
    toolSubmission: {
      events: {
        New: { mention: 'toolIntake' },
        Approved: {},
        Rejected: {},
        ChangesRequested: {},
        Revoked: { enabled: false },
      },
    },
    tool: {
      channelId: '100000000000000002',
      events: {
        UpdateCategories: {},
        Deprecated: {},
        Deleted: {},
        Update: {},
        ManualUpdate: {},
        UpdateFailed: { channelId: '100000000000000003', mention: 'toolIntake' },
      },
    },
    verify: {
      events: {
        Requested: { mention: 'toolVerification' },
        Assigned: { mention: 'maintainer' },
        Approved: { mention: 'notYetCreated' },
        Rejected: {},
        Revoked: {},
      },
    },
    vscode: { channelId: '100000000000000004' },
  },
});
