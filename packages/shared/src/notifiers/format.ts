import { ownershipLabelHe, transmissionLabelHe } from '../enums';
import type { DigestPayload, NotifiableCar } from './types';

/** Format a number with thousands separators, or "—" when null. */
function num(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('he-IL');
}

function priceHe(car: NotifiableCar): string {
  const p = car.openingPrice ?? car.tariffPrice;
  return p === null ? 'לא פורסם' : `₪${num(p)}`;
}

/** HTML-escape for the email body. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Single-car Telegram block (HTML parse mode). */
export function telegramCarBlock(car: NotifiableCar): string {
  const lines = [
    `🚗 <b>${esc(car.makeModel)}</b>${car.modelYear ? ` (${car.modelYear})` : ''}`,
    `קילומטראז': ${num(car.mileage)}`,
    `יד: ${car.hand ?? '—'} | גיר: ${transmissionLabelHe(car.transmission)} | בעלות: ${ownershipLabelHe(car.ownership)}`,
    `מחיר פתיחה: ${priceHe(car)}`,
  ];
  if (car.auctionTitle) lines.push(`מכירה: ${esc(car.auctionTitle)}`);
  lines.push(`<a href="${esc(car.lotUrl)}">לצפייה בפריט »</a>`);
  return lines.join('\n');
}

/** Full Telegram message for a batch. */
export function buildTelegramMessage(cars: NotifiableCar[]): string {
  const header = `🔔 <b>נמצאו ${cars.length} רכבים חדשים שתואמים את הסינון</b>`;
  return [header, '', ...cars.map(telegramCarBlock)].join('\n\n');
}

/** Email subject. */
export function buildEmailSubject(count: number): string {
  return `🔔 ${count} רכבים חדשים תואמים — Bidspirit`;
}

/** RTL Hebrew HTML email body. */
export function buildEmailHtml(cars: NotifiableCar[]): string {
  const rows = cars
    .map(
      (car) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          <a href="${esc(car.lotUrl)}" style="font-weight:bold;color:#0a58ca;text-decoration:none;">
            ${esc(car.makeModel)}${car.modelYear ? ` (${car.modelYear})` : ''}
          </a>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${num(car.mileage)} ק"מ</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">יד ${car.hand ?? '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${transmissionLabelHe(car.transmission)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${ownershipLabelHe(car.ownership)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${priceHe(car)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;color:#222;">
  <h2>🔔 נמצאו ${cars.length} רכבים חדשים שתואמים את הסינון</h2>
  <table style="border-collapse:collapse;width:100%;max-width:760px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;text-align:right;">רכב</th>
        <th style="padding:8px;text-align:right;">קילומטראז'</th>
        <th style="padding:8px;text-align:right;">יד</th>
        <th style="padding:8px;text-align:right;">גיר</th>
        <th style="padding:8px;text-align:right;">בעלות</th>
        <th style="padding:8px;text-align:right;">מחיר פתיחה</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#888;font-size:12px;margin-top:16px;">הודעה אוטומטית ממערכת ניטור מכירות הרכב.</p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Daily change digest (new + removed) — Telegram, Email, and Web Push bodies.
// ---------------------------------------------------------------------------

const REMOVED_REASON_HE: Record<string, string> = {
  AUCTION_ENDED: 'המכירה הסתיימה',
  NOT_SEEN: 'הפריט הוסר מהרשימה',
  NO_LONGER_MATCHES: 'כבר לא תואם את הסינון',
};

function reasonHe(reason: string | null | undefined): string {
  return (reason && REMOVED_REASON_HE[reason]) || 'הוסר';
}

/** One summary line: "סה״כ N רכבים תואמים (+X חדשים, −Y הוסרו)". */
export function digestSummaryHe(digest: {
  added: unknown[];
  removed: unknown[];
  totalMatches: number;
}): string {
  return `סה״כ ${digest.totalMatches.toLocaleString('he-IL')} רכבים תואמים (+${digest.added.length} חדשים, −${digest.removed.length} הוסרו)`;
}

/** Telegram HTML digest message. */
export function buildTelegramDigest(digest: DigestPayload): string {
  const parts: string[] = [`🔔 <b>שינויים יומיים ברשימת ההתאמות</b>`, digestSummaryHe(digest)];
  if (digest.added.length) {
    parts.push(
      '',
      `🆕 <b>נוספו (${digest.added.length})</b>`,
      ...digest.added.map(telegramCarBlock),
    );
  }
  if (digest.removed.length) {
    parts.push(
      '',
      `❌ <b>הוסרו (${digest.removed.length})</b>`,
      ...digest.removed.map(
        (r) => `• <a href="${esc(r.lotUrl)}">${esc(r.makeModel)}</a> — ${esc(reasonHe(r.reason))}`,
      ),
    );
  }
  return parts.join('\n\n');
}

export function buildDigestEmailSubject(digest: DigestPayload): string {
  return `🔔 שינויים יומיים: +${digest.added.length} / −${digest.removed.length} — Bidspirit`;
}

/** RTL Hebrew HTML email digest body. */
export function buildDigestEmailHtml(digest: DigestPayload): string {
  const addedTable = digest.added.length
    ? `<h3>🆕 נוספו (${digest.added.length})</h3>
    <table style="border-collapse:collapse;width:100%;max-width:760px;">
      <thead><tr style="background:#f5f5f5;">
        <th style="padding:8px;text-align:right;">רכב</th>
        <th style="padding:8px;text-align:right;">קילומטראז'</th>
        <th style="padding:8px;text-align:right;">יד</th>
        <th style="padding:8px;text-align:right;">גיר</th>
        <th style="padding:8px;text-align:right;">מחיר פתיחה</th>
      </tr></thead>
      <tbody>${digest.added
        .map(
          (car) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;"><a href="${esc(car.lotUrl)}" style="font-weight:bold;color:#0a58ca;text-decoration:none;">${esc(car.makeModel)}${car.modelYear ? ` (${car.modelYear})` : ''}</a></td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${num(car.mileage)} ק"מ</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">יד ${car.hand ?? '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${transmissionLabelHe(car.transmission)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${priceHe(car)}</td>
      </tr>`,
        )
        .join('')}</tbody>
    </table>`
    : '';

  const removedList = digest.removed.length
    ? `<h3>❌ הוסרו (${digest.removed.length})</h3><ul>${digest.removed
        .map(
          (r) =>
            `<li><a href="${esc(r.lotUrl)}" style="color:#0a58ca;text-decoration:none;">${esc(r.makeModel)}</a> — ${esc(reasonHe(r.reason))}</li>`,
        )
        .join('')}</ul>`
    : '';

  return `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;color:#222;">
  <h2>🔔 שינויים יומיים ברשימת ההתאמות</h2>
  <p style="color:#444;">${esc(digestSummaryHe(digest))}</p>
  ${addedTable}
  ${removedList}
  <p style="color:#888;font-size:12px;margin-top:16px;">הודעה אוטומטית ממערכת ניטור מכירות הרכב.</p>
</body>
</html>`;
}

/** Compact JSON-able payload for a Web Push notification. */
export function buildWebPushPayload(digest: DigestPayload): {
  title: string;
  body: string;
  url: string;
} {
  const bits: string[] = [];
  if (digest.added.length) bits.push(`+${digest.added.length} חדשים`);
  if (digest.removed.length) bits.push(`−${digest.removed.length} הוסרו`);
  const firstUrl = digest.added[0]?.lotUrl ?? digest.removed[0]?.lotUrl ?? '/';
  return {
    title: '🔔 שינויים יומיים ברכבים',
    body: `${bits.join(' · ')} · סה״כ ${digest.totalMatches} תואמים`,
    url: firstUrl,
  };
}
