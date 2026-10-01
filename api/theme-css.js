/**
 * GET /api/theme-css  ->  the saved theme as a real stylesheet (CSS variables), so the very first
 * paint already has the right colours / fonts / sizes. No flash, no waiting for JavaScript.
 *
 * Super Admin theme, plus (when a vendor is known) that vendor's overrides on top. The vendor comes
 * from ?vendor=<id> or the `panel_vid` cookie that the app sets at login. Revalidated with an ETag,
 * so an unchanged theme costs a tiny 304.
 */
import { createHash } from "node:crypto";
import { ADMIN_KEY, vendorKey, readDoc } from "./_lib/store.js";
import { normalizeTheme, themeToVars } from "../src/theme/themeConfig.js";
import { mergeTheme } from "../src/theme/vendorTheme.js";

const cookie = (req, name) => new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(req.headers?.cookie || "")?.[1] || "";
const safe = (v) => String(v).replace(/[{};<>]/g, "");
// html:root beats the plain :root defaults in the bundled index.css whatever the load order.
const block = (sel, vars) => `${sel}{${Object.entries(vars).map(([k, v]) => `${k}:${safe(v)}`).join(";")}}`;

// Six pages ship their own colour palette (--amz-*), scoped to their wrapper class. Re-point it at the theme
// so those pages follow the Super Admin / vendor theme (and dark mode) too. The long selector wins over the
// page's own <style> block whatever order the stylesheets load in.
const LEGACY_PAGES = [".orders-workspace", ".resolve-claim-page", ".order-reports-page", ".manage-taxes-page", ".manage-payment-page", ".finance-workspace"];
const LEGACY_MAP = {
  "--amz-blue": "rgb(var(--brand-text))",
  "--amz-blue-dark": "rgb(var(--brand-dark))",
  "--amz-blue-bg": "rgb(var(--brand) / 0.12)",
  "--amz-text": "rgb(var(--ink))",
  "--amz-text-secondary": "rgb(var(--ink) / 0.65)",
  "--amz-border": "rgb(var(--border))",
  "--amz-bg": "rgb(var(--page-bg))",
  "--amz-card-bg": "rgb(var(--card-bg))",
  "--amz-green": "rgb(var(--success))",
  "--amz-green-bg": "rgb(var(--success) / 0.12)",
  "--amz-red": "rgb(var(--danger))",
  "--amz-red-bg": "rgb(var(--danger) / 0.12)",
  "--amz-orange": "rgb(var(--warning))",
  "--amz-orange-bg": "rgb(var(--warning) / 0.14)",
  "--amz-amber": "rgb(var(--warning))",
};

export default async function handler(req, res) {
  try {
    const q = new URL(req.url, "http://x").searchParams;
    const vid = decodeURIComponent(q.get("vendor") || cookie(req, "panel_vid") || "");
    const admin = await readDoc(ADMIN_KEY);
    const vkey = vendorKey(vid);
    const doc = vkey ? await readDoc(vkey) : null;
    const theme = normalizeTheme(doc?.override ? mergeTheme(normalizeTheme(admin), doc.override) : admin);

    const css = [
      "/* generated from the saved theme */",
      block("html:root", themeToVars(theme, "light")),
      block('html:root[data-theme="dark"]', themeToVars(theme, "dark")),
      block(LEGACY_PAGES.map((c) => `html:root body ${c}`).join(","), LEGACY_MAP),
    ].join("\n");

    const etag = `"${createHash("sha1").update(css).digest("hex").slice(0, 16)}"`;
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, no-cache");
    res.setHeader("Vary", "Cookie");
    if (req.headers["if-none-match"] === etag) {
      res.statusCode = 304;
      return res.end();
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.end(css);
  } catch (e) {
    console.error("[theme-css]", e);
    res.statusCode = 200; // never block the page: an empty sheet just means "use built-in defaults"
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.end("/* theme unavailable */");
  }
}
