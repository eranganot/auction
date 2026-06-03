import { buildTelegramMessage } from './format';
import type { NotifiableCar, Notifier, NotifyResult } from './types';

export interface TelegramConfig {
  botToken: string | undefined;
  chatIds: string[];
  /** Injected fetch (defaults to global fetch) — eases unit testing. */
  fetchImpl?: typeof fetch;
  apiBase?: string;
}

/**
 * Telegram Bot API notifier. Sends one Hebrew HTML message (with direct lot
 * links) to every configured chat id. Never throws — failures are reported in
 * the NotifyResult so the pipeline can continue.
 */
export class TelegramNotifier implements Notifier {
  public readonly channel = 'TELEGRAM' as const;
  private readonly token: string | undefined;
  private readonly chatIds: string[];
  private readonly fetchImpl: typeof fetch;
  private readonly apiBase: string;

  constructor(cfg: TelegramConfig) {
    this.token = cfg.botToken;
    this.chatIds = cfg.chatIds;
    this.fetchImpl = cfg.fetchImpl ?? globalThis.fetch;
    this.apiBase = cfg.apiBase ?? 'https://api.telegram.org';
  }

  public isEnabled(): boolean {
    return Boolean(this.token && this.chatIds.length > 0);
  }

  public async notify(cars: NotifiableCar[]): Promise<NotifyResult> {
    if (!this.isEnabled()) {
      return { channel: this.channel, ok: false, skipped: true, detail: 'Telegram not configured' };
    }
    if (cars.length === 0) {
      return { channel: this.channel, ok: true, skipped: true, detail: 'No cars to notify' };
    }

    const text = buildTelegramMessage(cars);
    const url = `${this.apiBase}/bot${this.token}/sendMessage`;
    const failures: string[] = [];

    for (const chatId of this.chatIds) {
      try {
        const res = await this.fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });
        if (!res.ok) {
          const body = await safeText(res);
          failures.push(`chat ${chatId}: HTTP ${res.status} ${body}`);
        }
      } catch (err) {
        failures.push(`chat ${chatId}: ${(err as Error).message}`);
      }
    }

    if (failures.length > 0) {
      return {
        channel: this.channel,
        ok: false,
        skipped: false,
        detail: `Sent to ${this.chatIds.length - failures.length}/${this.chatIds.length} chats`,
        error: failures.join('; '),
      };
    }
    return {
      channel: this.channel,
      ok: true,
      skipped: false,
      detail: `Sent ${cars.length} cars to ${this.chatIds.length} chat(s)`,
    };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '';
  }
}
