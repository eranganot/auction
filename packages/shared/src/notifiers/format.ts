import { ownershipLabelHe, transmissionLabelHe } from '../enums';
import type { NotifiableCar } from './types';

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
