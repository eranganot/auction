'use strict';

// Hebrew labels for enum values (mirrors server-side labels).
const TRANSMISSION = [
  { value: 'AUTOMATIC', label: 'אוטומטי' },
  { value: 'MANUAL', label: 'ידני' },
  { value: 'ROBOTIC', label: 'רובוטי' },
  { value: 'UNKNOWN', label: 'לא ידוע' },
];
const OWNERSHIP = [
  { value: 'PRIVATE', label: 'פרטי' },
  { value: 'COMPANY', label: 'חברה' },
  { value: 'LEASING', label: 'ליסינג' },
  { value: 'RENTAL', label: 'השכרה' },
  { value: 'GOV', label: 'ממשלתי' },
  { value: 'UNKNOWN', label: 'לא ידוע' },
];

// Multi-column sort state: array of { field, dir }.
let sortKeys = [{ field: 'lastSeenAt', dir: 'desc' }];

const fmtInt = (n) => (n == null ? '—' : Number(n).toLocaleString('he-IL'));
const fmtPrice = (n) => (n == null ? '—' : '₪' + Number(n).toLocaleString('he-IL'));
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('he-IL') : '—');

function buildCheckboxes(containerId, options, name) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  for (const o of options) {
    const id = `${name}-${o.value}`;
    const wrap = document.createElement('label');
    wrap.className = 'flex items-center gap-2';
    wrap.innerHTML = `<input type="checkbox" name="${name}" value="${o.value}" id="${id}" /> <span>${o.label}</span>`;
    el.appendChild(wrap);
  }
}

function sortParam() {
  return sortKeys.map((k) => `${k.field}:${k.dir}`).join(',');
}

async function loadCars() {
  const body = document.getElementById('cars-body');
  try {
    const res = await fetch(`/api/cars?sort=${encodeURIComponent(sortParam())}&pageSize=200`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    renderCars(json.data);
    document.getElementById('result-count').textContent =
      `נמצאו ${fmtInt(json.total)} רכבים תואמים`;
  } catch (err) {
    body.innerHTML = `<tr><td colspan="11" class="p-6 text-center text-red-500">שגיאה בטעינת הנתונים</td></tr>`;
  }
}

function renderCars(cars) {
  const body = document.getElementById('cars-body');
  if (!cars || cars.length === 0) {
    body.innerHTML = `<tr><td colspan="11" class="p-6 text-center text-slate-400">אין רכבים תואמים</td></tr>`;
    return;
  }
  body.innerHTML = cars
    .map(
      (c) => `
      <tr class="border-t border-slate-100 hover:bg-slate-50">
        <td class="p-2 font-medium">${c.makeModel || '—'}</td>
        <td class="p-2">${c.modelYear ?? '—'}</td>
        <td class="p-2">${fmtDate(c.dateOnRoad)}</td>
        <td class="p-2">${fmtInt(c.mileage)}</td>
        <td class="p-2">${c.transmissionLabel}</td>
        <td class="p-2">${c.hand ?? '—'}</td>
        <td class="p-2">${c.ownershipLabel}</td>
        <td class="p-2">${fmtPrice(c.openingPrice)}</td>
        <td class="p-2">${fmtPrice(c.tariffPrice)}</td>
        <td class="p-2">${fmtDate(c.lastSeenAt)}</td>
        <td class="p-2"><a class="text-blue-600 underline" href="${c.lotUrl}" target="_blank" rel="noopener">צפייה</a></td>
      </tr>`,
    )
    .join('');
}

function wireSorting() {
  document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', (e) => {
      const field = th.getAttribute('data-sort');
      const existing = sortKeys.find((k) => k.field === field);
      if (e.shiftKey) {
        // Shift-click: add/toggle as secondary sort key.
        if (existing) existing.dir = existing.dir === 'asc' ? 'desc' : 'asc';
        else sortKeys.push({ field, dir: 'asc' });
      } else {
        const dir = existing && existing.dir === 'asc' ? 'desc' : 'asc';
        sortKeys = [{ field, dir }];
      }
      loadCars();
    });
  });
}

async function loadFilter() {
  const res = await fetch('/api/filters');
  const f = await res.json();
  const form = document.getElementById('filter-form');
  form.minModelYear.value = f.minModelYear ?? '';
  form.maxMileage.value = f.maxMileage ?? '';
  form.maxHand.value = f.maxHand ?? '';
  form.maxPrice.value = f.maxPrice ?? '';
  for (const cb of form.querySelectorAll('input[name="transmission"]'))
    cb.checked = (f.transmission || []).includes(cb.value);
  for (const cb of form.querySelectorAll('input[name="ownership"]'))
    cb.checked = (f.ownership || []).includes(cb.value);
}

function numOrNull(v) {
  return v === '' || v == null ? null : Number(v);
}

async function submitFilter(e) {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('filter-msg');
  const payload = {
    minModelYear: numOrNull(form.minModelYear.value),
    maxMileage: numOrNull(form.maxMileage.value),
    maxHand: numOrNull(form.maxHand.value),
    maxPrice: numOrNull(form.maxPrice.value),
    transmission: [...form.querySelectorAll('input[name="transmission"]:checked')].map(
      (c) => c.value,
    ),
    ownership: [...form.querySelectorAll('input[name="ownership"]:checked')].map((c) => c.value),
  };
  try {
    const res = await fetch('/api/filters', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    msg.textContent = 'נשמר בהצלחה';
    msg.className = 'mt-2 text-center text-sm text-green-600';
    await loadCars();
  } catch (err) {
    msg.textContent = 'שמירה נכשלה';
    msg.className = 'mt-2 text-center text-sm text-red-600';
  }
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const s = await res.json();
    const strip = document.getElementById('status-strip');
    const last = s.lastSuccessfulRun;
    if (!last) {
      strip.textContent = 'טרם בוצעה סריקה מוצלחת';
      return;
    }
    strip.innerHTML =
      `סריקה אחרונה: ${new Date(last.finishedAt || last.startedAt).toLocaleString('he-IL')} · ` +
      `רכבים: ${fmtInt(s.totals.cars)} · התראות שנשלחו: ${fmtInt(s.totals.notifications)}`;
  } catch (err) {
    /* status is non-critical */
  }
}

document.addEventListener('DOMContentLoaded', () => {
  buildCheckboxes('transmission-options', TRANSMISSION, 'transmission');
  buildCheckboxes('ownership-options', OWNERSHIP, 'ownership');
  document.getElementById('filter-form').addEventListener('submit', submitFilter);
  wireSorting();
  loadFilter();
  loadCars();
  loadStatus();
});
