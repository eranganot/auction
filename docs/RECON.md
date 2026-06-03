# RECON — Bidspirit Cars API (Phase 0 findings)

**Date:** 2026-06-03. Verified by live capture (curl + Playwright network sniff).

## TL;DR — extraction strategy

The site is an Angular SPA, but **all data is available from clean public JSON endpoints
(no auth, no cookies required)**. The scraper is therefore **pure HTTP/JSON** — no headless
browser needed at runtime. Playwright is kept only as a documented fallback if the JSON
API changes. This is faster, cheaper, and far more robust than DOM scraping.

## API host

```
https://bidspirit-portal.global.ssl.fastly.net
```
(Fastly-cached. A few calls also hit `https://cars.bidspirit.com/services/...` but the
portal host serves everything we need.)

Common query params: `cdnSubDomain=cars`, `lang=he`. Cache-busting params
(`cdnCacheVersion`, `cacheVersion`) are optional and can be omitted.

Send a normal browser `User-Agent`.

---

## 1. Discovery — list all auctions/catalogs

```
GET /services/portal/getHomePageData?cdnSubDomain=cars&content=CARS&lang=he&region=IL
```

Response shape (top keys): `auctionsLists`, `houses`, `shops`, `promotions`, ...

**`auctionsLists` is pre-bucketed by status — this IS the archive filter:**

| Bucket | Meaning | Action |
|---|---|---|
| `auctionsLists.UPCOMING` | live / upcoming (states `PENDING`, `READY`, `RUNNING`) | **SCRAPE** |
| `auctionsLists.ENDED` | finished | **SKIP** |

Each auction object — fields we use:

| Field | Example | Notes |
|---|---|---|
| `intKey` | `68321` | **stable auction id** → use as `catalogKey` and unique key |
| `houseCode` | `cflaw` | auction house slug (for building lot URLs) |
| `name` | `עשרות רכבים מכונס יוני חלק א` | auction title |
| `state` | `RUNNING` / `READY` / `PENDING` / `ENDED` | live status |
| `contentType` | `CARS` | **filter to `CARS`** — UPCOMING also contains `MACHINES`/`ART` |
| `date`, `time` | `2026-06-10`, `10:00` | start date/time |
| `startTimeMillis` | `1780470000000` | epoch ms — authoritative start time |
| `hidden` | `false` | skip if `true` |

**Worker discovery rule:** take `auctionsLists.UPCOMING`, keep
`contentType === 'CARS' && hidden === false`. (We intentionally ignore `ENDED`.)

---

## 2. Lots — all cars in a catalog (one call)

```
GET /services/catalogs/getItems?catalogKey={intKey}&allowEro=true&allowHidden=false&cdnSubDomain=cars&lang=he
```

Returns a **JSON array** of item objects (all lots in the catalog — no pagination needed).
Each item that is a car has a populated `carInfo` object.

Item-level fields we use:

| Field | Notes |
|---|---|
| `idInApp` | **stable lot id** (also `carInfo.lotId`) |
| `auctionIdInApp` | internal auction id (differs from `intKey`; `intKey` is the URL key) |
| `startPrice` | **opening price** — often `null` in the feed (see note below) |
| `estimatedPrice` | sometimes used |
| `imagesList`, `imagesBase` | photos |

`carInfo` fields → our schema:

| Our field (Hebrew) | `carInfo` key | Example | Normalization |
|---|---|---|---|
| יצרן ודגם | `manufacturer` + `model` | `צ'רי` + `טיגו 8 פרו` | concatenate |
| שנת מודל | `modelYear` | `2025` | already int |
| עליה לכביש | `dateOnRoad` | often `""` | parse date; nullable |
| קילומטראז' | `mileage` | `27373` | **already numeric int** |
| תיבת הילוכים | `gear` | `אוטומטי` / `ידני` / `""` | enum map |
| יד | `hand` | `שנייה` (ordinal word!) | map ordinal→int |
| בעלות נוכחית | `ownership` | `""` / `פרטי` | enum map |
| מחיר מחירון | `carInfo.tariffPrice` | often `null` | numeric; nullable |
| מחיר פתיחה | item `startPrice` | often `null` | numeric; nullable |

Direct lot URL (built, not from feed):
```
https://cars.bidspirit.com/ui/lotPage/{houseCode}/source/catalog/auction/{intKey}/lot/{idInApp}/?lang=he
```

### 2b. Single lot detail (optional / fallback)
```
GET /services/catalogs/getLotItemInfo?catalogKey={intKey}&idInApp={idInApp}&cdnSubDomain=cars&lang=he
```
Same item shape as one element of `getItems`. We generally don't need per-lot calls
because `getItems` already contains full `carInfo`.

### 2c. Auction metadata (optional)
```
GET /services/portal/getAuctionPageData?intKey={intKey}&withHouseData=true&cdnSubDomain=cars&lang=he
```
Returns `{house, auction, houseIncrements}`. `auction.state`, `auction.startTimeMillis`
corroborate discovery data.

---

## 3. Real-world value distributions (from 107 live cars, 6 catalogs)

These drive the **defensive enum/normalization dictionaries**:

- **gear** (`תיבת הילוכים`): `אוטומטי` (86%), `ידני` (1), `""` (13%) →
  `אוטומטי*`→AUTOMATIC, `ידני*`→MANUAL, `רובוטי*`→ROBOTIC, empty/other→UNKNOWN.
- **hand** (`יד`): Hebrew **ordinal words**, not digits:
  `ראשונה`=1, `שנייה`=2, `שלישית`=3, `רביעית`=4, `חמישית`=5, `שישית`=6, also `""`.
  Map words→int; unknown→null.
- **ownership** (`בעלות`): mostly `""`; seen `פרטי` (note: **`פרטי`, not `פרטית`**).
  Map `פרטי*`→PRIVATE, `חברה*`→COMPANY, `ליסינג*`→LEASING, `השכרה*`→RENTAL, empty/other→UNKNOWN.
  Trim whitespace + strip RTL/hidden control chars before matching.
- **dateOnRoad**: empty ~62% of the time → must be nullable.
- **prices**: in the sampled (pre-live) catalogs, `tariffPrice` and `startPrice` were
  **null/0 for nearly all lots**. They appear closer to / during the live auction.
  **Implication:** the matching engine must treat a null price as *unknown* and NOT
  exclude the car on a `maxPrice` filter (otherwise we'd hide everything). Document and
  unit-test this behavior.

---

## 4. Saved fixtures (for tests — no live dependency)

Under `apps/worker/test/fixtures/`:
- `getHomePageData.sample.json` — trimmed UPCOMING (mixed states + a non-CARS) + ENDED.
- `getItems.sample.json` — 3 full car items incl. `carInfo`.
- `getLotItemInfo.sample.json` — one full lot detail.

---

## 5. Decisions locked from recon

1. **Primary extraction = JSON endpoints** (`getHomePageData` → `getItems`). No browser at runtime.
2. **Archive filtering = use `auctionsLists.UPCOMING` only**, filter `contentType==='CARS'`, `hidden===false`.
3. **Stable keys:** auction `intKey`; lot `idInApp`. Lot URL built deterministically.
4. **Null-price handling:** unknown price never fails a max-price filter.
5. **Hand is ordinal Hebrew text** → dedicated mapping.
6. Keep Playwright as fallback module only; not on the hot path.
