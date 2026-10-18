import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Car Auctions native shell (Capacitor 6, Android only).
 *
 * STRATEGY — same as adaptivefit-mobile: we do NOT bundle the web app into
 * the APK. The APK is a thin native WebView that points at the live URL.
 *
 *   - Production:  https://auction-production-a608.up.railway.app
 *   - Dev (LAN):   http://<your-laptop-ip>:3000  (Express dashboard dev server)
 *
 * Switch between them with the CAPACITOR_DEV env var **at sync time** (i.e.
 * when you run `npm run cap:sync` / `npm run cap:sync:dev`). The chosen URL is
 * baked into the Android resources; re-sync whenever you switch modes.
 *
 *   # Build for production (default)
 *   npm run cap:sync
 *
 *   # Build for LAN dev
 *   CAPACITOR_DEV=1 npm run cap:sync        # bash/zsh
 *   $env:CAPACITOR_DEV="1"; npm run cap:sync # PowerShell
 *
 * To override the dev URL (e.g. if your LAN IP changes, or you're tunneling):
 *
 *   CAPACITOR_DEV=1 CAPACITOR_DEV_URL=http://192.168.1.42:3000 npm run cap:sync
 *
 * NOTE: cleartext (plain HTTP) is enabled only in dev mode and is restricted
 * by android/app/src/main/res/xml/network_security_config.xml to your LAN IP.
 * Production always runs over HTTPS.
 */

const PROD_URL = "https://auction-production-a608.up.railway.app";
const DEFAULT_DEV_URL = "http://10.0.0.20:3000";

const isDev = process.env.CAPACITOR_DEV === "1";
const devUrl = process.env.CAPACITOR_DEV_URL ?? DEFAULT_DEV_URL;
const serverUrl = isDev ? devUrl : PROD_URL;

const config: CapacitorConfig = {
  appId: "com.bidspirit.carauctions",
  appName: "Car Auctions",
  // `webDir` is required by the CLI but never used when `server.url` is set
  // (we don't bundle the web build into the APK). Point it at the dashboard's
  // static assets so the CLI doesn't complain about a missing dir.
  webDir: "apps/dashboard/public",
  server: {
    url: serverUrl,
    // Allow plain HTTP only in dev (LAN). Production is forced HTTPS by
    // virtue of serverUrl being https://...
    cleartext: isDev,
    // Force the https:// scheme so cookies set by Railway (HTTPS) survive
    // WebView navigations correctly in production.
    androidScheme: "https",
    // Keep top-level navigations to our own domains inside the WebView.
    // Anything else opens in the system browser.
    allowNavigation: [
      "auction-production-a608.up.railway.app",
      "*.up.railway.app",
    ],
  },
  android: {
    allowMixedContent: false,
    // ── User-agent override ────────────────────────────────────────────
    // The auction app has no Google OAuth, so the "; wv" disallowed_useragent
    // problem that adaptivefit-mobile had does NOT apply here. We therefore
    // keep the stock Android WebView user-agent. If you ever add a login that
    // a third party blocks inside WebViews, uncomment and update this:
    //
    // overrideUserAgent:
    //   "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 " +
    //   "(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  },
};

export default config;
