/**
 * Notification definition contracts
 */

import type { z } from 'zod';
import type { MessagePayload } from '../discord/format';
import type { ChannelAlias } from './channels';

export type NotificationCategory =
  'Tool Submission' | 'Tool' | 'Verify' | 'PPTB' | 'VSCODE' | 'GitHub';

/**
 * Who is allowed to trigger the notification:
 * - `platform`: POST /api/events (pptb-web, tool-management)
 * - `github`:   GitHub webhooks or the stars cron
 */
export type NotificationSource = 'platform' | 'github';

/** What the dispatcher does with the rendered output. */
export type Delivery =
  | { kind: 'message'; message: MessagePayload }
  | { kind: 'thread'; threadName: string; dedupeKey: string; message: MessagePayload }
  | { kind: 'channel-name'; name: string };

type DeliveryRenderer<T> =
  | { kind: 'message'; render: (data: T) => MessagePayload }
  | {
      kind: 'thread';
      render: (data: T) => { threadName: string; dedupeKey: string; message: MessagePayload };
    }
  | { kind: 'channel-name'; render: (data: T) => string };

interface NotificationMeta<K extends string> {
  /** Stable identifier used by producers, DISABLED_NOTIFICATIONS and NOTIFICATION_ROUTES. */
  key: K;
  category: NotificationCategory;
  /** Event name as listed in the notification catalogue. */
  event: string;
  description: string;
  /** Code-level switch. DISABLED_NOTIFICATIONS can additionally turn it off at runtime. */
  enabled: boolean;
  /** Default destination; override per event with NOTIFICATION_ROUTES. */
  channel: ChannelAlias;
  source: NotificationSource;
}

export interface NotificationSpec<K extends string, T> extends NotificationMeta<K> {
  schema: z.ZodType<T>;
  delivery: DeliveryRenderer<T>;
  /** Representative payload; used by tests and documentation. */
  example: T;
}

export interface Notification<K extends string = string> extends NotificationMeta<K> {
  /** Validate untrusted input (throws ZodError) and render it. */
  build(input: unknown): Delivery;
  example: unknown;
}

/**
 * Bundle schema + renderer into a type-erased notification the dispatcher can run.
 */
export function defineNotification<K extends string, T>(
  spec: NotificationSpec<K, T>
): Notification<K> {
  const { schema, delivery, ...meta } = spec;
  return {
    ...meta,
    build(input: unknown): Delivery {
      const data = schema.parse(input);
      switch (delivery.kind) {
        case 'message':
          return { kind: 'message', message: delivery.render(data) };
        case 'thread':
          return { kind: 'thread', ...delivery.render(data) };
        case 'channel-name':
          return { kind: 'channel-name', name: delivery.render(data) };
      }
    },
  };
}
