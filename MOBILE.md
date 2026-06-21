# Car Auctions — mobile app

There are two ways to get the dashboard onto a phone. **The PWA (Option A) is the
recommended one** — it's how `job-hunter` does it: no APK, no Android Studio, you
just install it from the web page. The Capacitor APK (Option B) is kept as an
optional alternative.

Both load the live site, so anything you ship to the web dashboard shows up on the
phone automatically:

> https://auction-production-a608.up.railway.app

---

## Option A — Install as a PWA (recommended, like job-hunter)

The dashboard is now an installable Progressive Web App: web manifest +
icons + service worker, served over HTTPS by Railway. Chrome on Android then
offers to install it to the home screen, where it runs full-screen like a native
app.

### One-time: deploy the PWA

The PWA files live in `apps/dashboard/public/` (`manifest.webmanifest`,
`icons/`, updated `index.html` / `app.js` / `sw.js`). Just deploy as usual:

```bash
git add -A
git commit -m "Add installable PWA (manifest, icons, service worker)"
git push        # Railway auto-deploys
```

No build step or extra dependency is required for the PWA — these are static
files Express already serves.

### On your Pixel

1. Open **Chrome** and go to
   `https://auction-production-a608.up.railway.app`.
2. Either tap the **📲 התקן אפליקציה** (Install app) button that appears in the
   header, **or** open Chrome's **⋮ menu → Install app / Add to Home screen**.
3. Confirm. "מכרזי רכב" lands on your home screen with the car icon and opens
   full-screen (no browser chrome).

That's the whole flow — same as job-hunter. To update the app later, just deploy
the web app; the PWA refreshes itself (it's network-first, with an offline
fallback).

> If the install option doesn't appear: make sure you're on **https** (not the
> Railway preview over http), do a hard refresh, and confirm
> `…/manifest.webmanifest` and `…/sw.js` load in the browser. Chrome only offers
> install once it has seen the manifest + a registered service worker.

### Changing the PWA branding

Replace the icons in `apps/dashboard/public/icons/` (`icon-192.png`,
`icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`) and the colours
in `manifest.webmanifest` (`theme_color` / `background_color`), then redeploy.
The current icons are **placeholders** (amber car on slate) pending the real
Figma branding.

---

## Option B — Capacitor APK (optional)

A Capacitor 6 Android project also exists (`capacitor.config.ts` + `android/`),
producing a thin native WebView APK you sideload. Same architecture as
`adaptivefit-mobile`. **You don't need this if you're using the PWA** — it's here
if you ever want a real APK / Play Store path. If you don't want it, you can
delete `android/`, `assets/`, and `capacitor.config.ts` and remove the
`@capacitor/*` / `cap:*` entries from `package.json`.

### Prerequisites

Android Studio (Android SDK + `adb`), JDK 17, `npm install`.

### Build & install

```bash
npm run cap:sync        # bakes the production URL into the project
npm run cap:open        # opens Android Studio → pick device → Run ▶
# or from android/: ./gradlew assembleDebug  (gradlew.bat on Windows)
npm run android:install-debug   # adb install the debug APK
```

The debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`.

### Dev mode (point the APK at your laptop)

```bash
npm run dev:dashboard                 # Express dev server on :3000
CAPACITOR_DEV=1 npm run cap:sync      # or set CAPACITOR_DEV_URL=http://<lan-ip>:3000
npm run cap:open
```

Also set your LAN IP in `android/app/src/main/res/xml/network_security_config.xml`.
Switch back to production with `npm run cap:sync`.

---

## Notes

- **Android only**, per request (the PWA also installs on desktop Chrome/Edge and,
  in a lighter form, on iOS Safari via "Add to Home Screen").
- **Web push** already exists in the app and works the same inside the installed
  PWA (it uses the same service worker).
- The PWA changes are additive to `apps/dashboard/public/`; no API or backend
  code was modified.

## Troubleshooting (PWA)

| Symptom | Fix |
|---|---|
| No "Install" option in Chrome | Must be HTTPS; hard-refresh; verify `/manifest.webmanifest` and `/sw.js` load; check DevTools → Application → Manifest for errors. |
| Old UI after a deploy | The service worker is network-first, so a refresh while online pulls the latest. If stuck, bump `CACHE` in `sw.js` (e.g. `-v2`) and redeploy. |
| Icon looks wrong/cropped | Replace the icons in `public/icons/` (use the `-maskable` one for the adaptive shape) and redeploy. |
