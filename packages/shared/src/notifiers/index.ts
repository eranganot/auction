export * from './types';
export * from './format';
export { TelegramNotifier, type TelegramConfig } from './telegram';
export { EmailNotifier, type EmailConfig } from './email';

import type { AppConfig } from '../config';
import { EmailNotifier } from './email';
import { TelegramNotifier } from './telegram';
import type { Notifier } from './types';

/** Build the full set of notifiers from app config (only enabled ones act). */
export function buildNotifiers(config: AppConfig): Notifier[] {
  return [
    new TelegramNotifier({ botToken: config.telegram.botToken, chatIds: config.telegram.chatIds }),
    new EmailNotifier({
      host: config.email.host,
      port: config.email.port,
      user: config.email.user,
      pass: config.email.pass,
      from: config.email.from,
      recipients: config.email.recipients,
    }),
  ];
}
