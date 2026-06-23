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
  const showInactive = document.getElementById('show-inactive');
  const inactiveParam = showInactive && showInactive.checked ? '&includeInactive=1' : '';
  const withinEl = document.getElementById('within-days');
  const withinParam = withinEl ? `&withinDays=${encodeURIComponent(withinEl.value)}` : '';
  try {
    const res = await fetch(
      `/api/cars?sort=${encodeURIComponent(sortParam())}&pageSize=200${inactiveParam}${withinParam}`,
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    renderCars(json.data);
    document.getElementById('result-count').textContent =
      `נמצאו ${fmtInt(json.total)} רכבים תואמים`;
  } catch (err) {
    body.innerHTML = `<tr><td colspan="12" class="p-6 text-center text-red-500">שגיאה בטעינת הנתונים</td></tr>`;
  }
}

function renderCars(cars) {
  const body = document.getElementById('cars-body');
  if (!cars || cars.length === 0) {
    body.innerHTML = `<tr><td colspan="12" class="p-6 text-center text-slate-400">אין רכבים תואמים</td></tr>`;
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
        <td class="p-2">${fmtDate(c.auctionStartsAt)}</td>
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
  const showInactive = document.getElementById('show-inactive');
  if (showInactive) showInactive.addEventListener('change', loadCars);
  const withinDays = document.getElementById('within-days');
  if (withinDays) withinDays.addEventListener('change', loadCars);
  wireTabs();
  loadFilter();
  loadCars();
  loadStatus();
  loadChanges();
  initPush();
  initPwa();
});

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
function showTab(name) {
  document.getElementById('tab-cars').classList.toggle('hidden', name !== 'cars');
  document.getElementById('tab-changes').classList.toggle('hidden', name !== 'changes');
  for (const b of document.querySelectorAll('.tab-btn')) {
    const active = b.dataset.tab === name;
    b.classList.toggle('border-blue-600', active);
    b.classList.toggle('text-blue-600', active);
    b.classList.toggle('border-transparent', !active);
    b.classList.toggle('text-slate-500', !active);
  }
  if (name === 'changes') loadChanges();
}

function wireTabs() {
  for (const b of document.querySelectorAll('.tab-btn')) {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  }
}

// ---------------------------------------------------------------------------
// Daily changes panel
// ---------------------------------------------------------------------------
const CHANGE_REASON = {
  AUCTION_ENDED: 'המכירה הסתיימה',
  NOT_SEEN: 'הוסר מהרשימה',
  NO_LONGER_MATCHES: 'כבר לא תואם',
};

async function loadChanges() {
  const box = document.getElementById('changes-list');
  if (!box) return;
  try {
    const res = await fetch('/api/changes?limit=50');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    renderChanges(json.changes);
  } catch (err) {
    box.innerHTML = '<p class="text-red-500">שגיאה בטעינת השינויים</p>';
  }
}

function renderChanges(changes) {
  const box = document.getElementById('changes-list');
  if (!changes || changes.length === 0) {
    box.innerHTML = '<p class="text-slate-400">אין שינויים אחרונים</p>';
    return;
  }
  // Group by day (he-IL date).
  const groups = {};
  for (const c of changes) {
    const day = new Date(c.detectedAt).toLocaleDateString('he-IL');
    (groups[day] = groups[day] || []).push(c);
  }
  box.innerHTML = Object.entries(groups)
    .map(([day, items]) => {
      const rows = items
        .map((c) => {
          const isNew = c.type === 'NEW';
          const badge = isNew
            ? '<span class="rounded bg-green-100 px-1.5 text-green-700">חדש</span>'
            : '<span class="rounded bg-red-100 px-1.5 text-red-700">הוסר</span>';
          const reason = !isNew && c.reason ? ` · ${CHANGE_REASON[c.reason] || ''}` : '';
          return `<div class="flex items-start gap-2">
            ${badge}
            <a class="text-blue-600 hover:underline" href="${c.lotUrl}" target="_blank" rel="noopener">${c.makeModel || '—'}</a>
            <span class="text-slate-400">${reason}</span>
          </div>`;
        })
        .join('');
      return `<div><div class="mb-1 font-semibold text-slate-500">${day}</div>${rows}</div>`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Web push subscription
// ---------------------------------------------------------------------------
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function wireTestPush() {
  const t = document.getElementById('test-push');
  if (!t || t.dataset.wired) return;
  t.dataset.wired = '1';
  t.classList.remove('hidden');
  t.addEventListener('click', async () => {
    t.disabled = true;
    const original = t.textContent;
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.sent > 0) t.textContent = '✓ נשלחה התראת בדיקה';
      else if (res.ok && j.subscribers === 0) t.textContent = 'אין מנויים — הפעל התראות קודם';
      else t.textContent = 'שליחה נכשלה';
    } catch (_e) {
      t.textContent = 'שליחה נכשלה';
    }
    setTimeout(() => {
      t.textContent = original;
      t.disabled = false;
    }, 3000);
  });
}

async function initPush() {
  const btn = document.getElementById('enable-push');
  if (!btn) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  let vapid;
  try {
    const res = await fetch('/api/push/vapid');
    vapid = await res.json();
  } catch (_e) {
    return;
  }
  if (!vapid || !vapid.enabled || !vapid.publicKey) return; // push not configured server-side
  if (Notification.permission === 'denied') return;

  const keyBytes = urlBase64ToUint8Array(vapid.publicKey);

  async function doSubscribe(reg) {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes,
    });
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sub),
    });
    return res.ok;
  }

  // Inspect any existing subscription; if it was made with a different VAPID key
  // (keys were rotated) it can never receive pushes (403), so drop and recreate.
  let reg;
  try {
    reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register('/sw.js'));
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      const cur = new Uint8Array(existing.options.applicationServerKey || new ArrayBuffer(0));
      const matches = cur.length === keyBytes.length && cur.every((b, i) => b === keyBytes[i]);
      if (matches) {
        wireTestPush();
        return;
      }
      await existing.unsubscribe(); // stale key — remove and re-subscribe below
    }
    // No valid subscription. If permission is already granted, re-subscribe silently.
    if (Notification.permission === 'granted') {
      if (await doSubscribe(reg)) {
        wireTestPush();
        return;
      }
    }
  } catch (_e) {
    /* fall through to the manual enable button */
  }

  btn.classList.remove('hidden');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      reg = reg || (await navigator.serviceWorker.register('/sw.js'));
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        btn.disabled = false;
        return;
      }
      if (await doSubscribe(reg)) {
        btn.textContent = '✓ התראות מופעלות';
        setTimeout(() => btn.classList.add('hidden'), 2500);
        wireTestPush();
      } else {
        btn.disabled = false;
      }
    } catch (_e) {
      btn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
// PWA: register the service worker + handle the "Install app" button
// ---------------------------------------------------------------------------
function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  let deferredPrompt = null;
  const btn = document.getElementById('install-app');
  window.addEventListener('beforeinstallprompt', (e) => {
    // Chrome fires this when the app is installable; capture it for our button.
    e.preventDefault();
    deferredPrompt = e;
    if (btn) btn.classList.remove('hidden');
  });
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      btn.disabled = true;
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (_e) {
        /* ignore */
      }
      deferredPrompt = null;
      btn.classList.add('hidden');
    });
  }
  window.addEventListener('appinstalled', () => {
    if (btn) btn.classList.add('hidden');
  });
}
