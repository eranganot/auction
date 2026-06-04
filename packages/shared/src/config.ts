import { z } from 'zod';

/**
 * Centralized, typed, fail-fast configuration. Loaded from environment
 * variables (see PLAN.md §7 + .env.example).
 *
 * Design notes:
 * - DATABASE_URL is the only hard requirement for every process.
 * - Notification credentials are OPTIONAL at config-load time; each notifier
 *   reports itself "not configured" and is skipped rather than crashing a run.
 *   This lets the dashboard and a credential-less worker boot cleanly.
 */

const csv = (val: string | undefined): string[] =>
  (val ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const intWithDefault = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number().int());

const ConfigSchema = z.object({
  // Core
  PORT: intWithDefault(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.string().default('development'),

  // Scraper behaviour
  SCRAPER_HEADLESS: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  SCRAPER_TIMEOUT: intWithDefault(30_000),
  SCRAPER_DELAY_MIN: intWithDefault(800),
  SCRAPER_DELAY_MAX: intWithDefault(2_500),
  SCRAPER_CRON: z.string().default('0 6 * * *'),
  SCRAPER_TZ: z.string().default('Asia/Jerusalem'),
  SCRAPER_MAX_RETRIES: intWithDefault(3),
  RUN_ONCE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  // In persistent scheduled mode, also run a single cycle immediately on boot
  // (so a fresh deploy populates the DB without waiting for the next cron tick).
  RUN_ON_START: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  // Bidspirit
  BIDSPIRIT_REGION: z.string().default('IL'),
  BIDSPIRIT_CONTENT: z.string().default('CARS'),

  // Telegram (optional)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_IDS: z.string().optional(),

  // Email / SMTP (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  NOTIFICATION_EMAILS: z.string().optional(),
});

export type RawConfig = z.infer<typeof ConfigSchema>;

export interface AppConfig {
  port: number;
  databaseUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  nodeEnv: string;
  scraper: {
    headless: boolean;
    timeoutMs: number;
    delayMinMs: number;
    delayMaxMs: number;
    cron: string;
    timezone: string;
    maxRetries: number;
    runOnce: boolean;
    runOnStart: boolean;
  };
  bidspirit: {
    region: string;
    content: string;
  };
  telegram: {
    botToken: string | undefined;
    chatIds: string[];
    enabled: boolean;
  };
  email: {
    host: string | undefined;
    port: number;
    user: string | undefined;
    pass: string | undefined;
    from: string | undefined;
    recipients: string[];
    enabled: boolean;
  };
}

let cached: AppConfig | undefined;

/** Parse + validate env. Throws a clear aggregated error on misconfiguration. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  const c = parsed.data;

  const chatIds = csv(c.TELEGRAM_CHAT_IDS);
  const recipients = csv(c.NOTIFICATION_EMAILS);

  return {
    port: c.PORT,
    databaseUrl: c.DATABASE_URL,
    logLevel: c.LOG_LEVEL,
    nodeEnv: c.NODE_ENV,
    scraper: {
      headless: c.SCRAPER_HEADLESS,
      timeoutMs: c.SCRAPER_TIMEOUT,
      delayMinMs: c.SCRAPER_DELAY_MIN,
      delayMaxMs: c.SCRAPER_DELAY_MAX,
      cron: c.SCRAPER_CRON,
      timezone: c.SCRAPER_TZ,
      maxRetries: c.SCRAPER_MAX_RETRIES,
      runOnce: c.RUN_ONCE,
      runOnStart: c.RUN_ON_START,
    },
    bidspirit: {
      region: c.BIDSPIRIT_REGION,
      content: c.BIDSPIRIT_CONTENT,
    },
    telegram: {
      botToken: c.TELEGRAM_BOT_TOKEN,
      chatIds,
      enabled: Boolean(c.TELEGRAM_BOT_TOKEN && chatIds.length > 0),
    },
    email: {
      host: c.SMTP_HOST,
      port: c.SMTP_PORT ? Number(c.SMTP_PORT) : 587,
      user: c.SMTP_USER,
      pass: c.SMTP_PASS,
      from: c.SMTP_FROM ?? c.SMTP_USER,
      recipients,
      enabled: Boolean(c.SMTP_HOST && recipients.length > 0),
    },
  };
}

/** Memoized config for the common case. */
export function getConfig(): AppConfig {
  if (!cached) cached = loadConfig();
  return cached;
}

/** Test helper — clears the memoized config. */
export function resetConfigCache(): void {
  cached = undefined;
}
