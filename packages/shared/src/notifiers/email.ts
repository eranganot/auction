import nodemailer, { type Transporter } from 'nodemailer';
import { buildEmailHtml, buildEmailSubject } from './format';
import type { NotifiableCar, Notifier, NotifyResult } from './types';

export interface EmailConfig {
  host: string | undefined;
  port: number;
  user: string | undefined;
  pass: string | undefined;
  from: string | undefined;
  recipients: string[];
  /** Injected transporter (for tests). When absent, an SMTP transport is built. */
  transport?: Transporter;
}

/**
 * SMTP email notifier (Nodemailer). Sends one Hebrew RTL HTML summary to all
 * recipients. Never throws — failures surface in the NotifyResult.
 */
export class EmailNotifier implements Notifier {
  public readonly channel = 'EMAIL' as const;
  private readonly cfg: EmailConfig;
  private transporter: Transporter | undefined;

  constructor(cfg: EmailConfig) {
    this.cfg = cfg;
    this.transporter = cfg.transport;
  }

  public isEnabled(): boolean {
    return Boolean(this.cfg.host && this.cfg.recipients.length > 0);
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    this.transporter = nodemailer.createTransport({
      host: this.cfg.host,
      port: this.cfg.port,
      secure: this.cfg.port === 465,
      auth: this.cfg.user ? { user: this.cfg.user, pass: this.cfg.pass } : undefined,
    });
    return this.transporter;
  }

  public async notify(cars: NotifiableCar[]): Promise<NotifyResult> {
    if (!this.isEnabled()) {
      return { channel: this.channel, ok: false, skipped: true, detail: 'Email not configured' };
    }
    if (cars.length === 0) {
      return { channel: this.channel, ok: true, skipped: true, detail: 'No cars to notify' };
    }

    try {
      await this.getTransporter().sendMail({
        from: this.cfg.from ?? this.cfg.user,
        to: this.cfg.recipients.join(', '),
        subject: buildEmailSubject(cars.length),
        html: buildEmailHtml(cars),
      });
      return {
        channel: this.channel,
        ok: true,
        skipped: false,
        detail: `Emailed ${cars.length} cars to ${this.cfg.recipients.length} recipient(s)`,
      };
    } catch (err) {
      return {
        channel: this.channel,
        ok: false,
        skipped: false,
        detail: 'Email send failed',
        error: (err as Error).message,
      };
    }
  }
}
