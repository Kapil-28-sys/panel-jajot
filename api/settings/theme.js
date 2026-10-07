/**
 * Shared theme API  —  /api/settings/theme
 *
 * Super Admin theme (one for everyone):
 *   GET  -> { theme }                  public (the login page needs it)
 *   PUT  <- { theme }                  Super Admin only (the last 5 versions are kept)
 *   PUT  <- { restore: "previous" }    Super Admin only: go back one version
 *
 * Vendor theme (each vendor customises their own panel; stored as overrides on top of the admin theme):
 *   GET  ?vendor=ID -> { theme, revision }          public, theme is the override or null
 *   PUT  ?vendor=ID <- { theme: {...} }             save override (theme: null = back to the admin look)
 *                   <- { restore: "previous" }      go back to the previous saved version
 *   Allowed: that vendor (token must belong to ID), or a Super Admin.
 *
 * Environment variables (Vercel > Settings > Environment Variables)
 *   THEME_WRITE_TOKENS  comma-separated tokens allowed to change the ADMIN theme. Default "static-superadmin-token".
 *   ADMIN_VERIFY_URL    protected URL of your backend that only an admin can open; a token is also accepted
 *                       for the admin theme when GET <url> with it returns 2xx.
 *   AUTH_VERIFY_URL     protected URL that any signed-in user can open (e.g. "my profile"); used to prove a
 *                       vendor's token is genuine. The vendor id is read from the token (id/_id/userId/sub).
 */
import { Buffer } from "node:buffer";
import process from "node:process";
import { ADMIN_KEY, MAX_BYTES, vendorKey, readDoc, writeDoc, onVercel } from "../_lib/store.js";

const WRITE_TOKENS = (process.env.THEME_WRITE_TOKENS || "static-superadmin-token").split(",").map((s) => s.trim()).filter(Boolean);
const ADMIN_VERIFY_URL = process.env.ADMIN_VERIFY_URL || "";
const AUTH_VERIFY_URL = process.env.AUTH_VERIFY_URL || "";
const ALLOWED_SECTIONS = ["preset", "branding", "colors", "typography", "layout", "mode", "components", "footer"];
const HISTORY_KEEP = 5;
const IMAGE_KEYS = ["logo", "favicon", "loginImage"];
const ADMIN_HISTORY_KEY = "panel-theme/history.json";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const bearer = (req) => {
  const t = /^Bearer\s+(.+)$/i.exec(req.headers?.authorization || "")?.[1]?.trim();
  return t && t !== "null" && t !== "undefined" ? t : "";
};
const verify = async (url, token) => {
  try {
    return (await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) })).ok;
  } catch {
    return false;
  }
};
const jwtIds = (token) => {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return [p.id, p._id, p.userId, p.vendorId, p.sub].filter(Boolean).map(String);
  } catch {
    return [];
  }
};

async function canWriteAdmin(token) {
  if (!token) return false;
  if (WRITE_TOKENS.includes("*") || WRITE_TOKENS.includes(token)) return true;
  return ADMIN_VERIFY_URL ? verify(ADMIN_VERIFY_URL, token) : false;
}
async function canWriteVendor(token, vendorId) {
  if (await canWriteAdmin(token)) return true;
  if (!onVercel() && token === "local-admin-token") return true; // local dev only
  if (!AUTH_VERIFY_URL || !jwtIds(token).includes(String(vendorId))) return false;
  return verify(AUTH_VERIFY_URL, token);
}

async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BYTES) throw Object.assign(new Error("Theme is too large."), { status: 413 });
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const reply = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(body));
};

/** History keeps look-and-feel only: uploaded images (data URLs) are dropped so 5 versions stay small. */
const stripImages = (v) =>
  typeof v === "string" ? (v.startsWith("data:") ? "" : v) : isPlainObject(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stripImages(x)])) : v;

/** Super Admin theme: write it, and keep the last versions so one bad save can be undone. */
async function saveAdmin(theme) {
  const prev = await readDoc(ADMIN_KEY);
  const h = (await readDoc(ADMIN_HISTORY_KEY)) || { revision: 0, history: [] };
  await writeDoc(ADMIN_KEY, theme);
  const history = prev ? [{ revision: h.revision, savedAt: h.savedAt, theme: stripImages(prev) }, ...h.history].slice(0, HISTORY_KEEP) : h.history;
  await writeDoc(ADMIN_HISTORY_KEY, { revision: h.revision + 1, savedAt: new Date().toISOString(), history });
}

async function restoreAdmin() {
  const h = await readDoc(ADMIN_HISTORY_KEY);
  const target = h?.history?.[0];
  if (!target) return null;
  const current = (await readDoc(ADMIN_KEY)) || {};
  const restored = JSON.parse(JSON.stringify(target.theme || {}));
  restored.branding = { ...(restored.branding || {}) };
  IMAGE_KEYS.forEach((k) => (current.branding?.[k] !== undefined ? (restored.branding[k] = current.branding[k]) : delete restored.branding[k]));
  await writeDoc(ADMIN_KEY, restored);
  await writeDoc(ADMIN_HISTORY_KEY, { ...h, revision: h.revision + 1, savedAt: new Date().toISOString(), history: h.history.slice(1) });
  return restored;
}

async function saveVendor(key, doc, override) {
  const prev = doc || { revision: 0, override: null, history: [] };
  const history = prev.override ? [{ revision: prev.revision, savedAt: prev.savedAt, override: stripImages(prev.override) }, ...(prev.history || [])].slice(0, HISTORY_KEEP) : prev.history || [];
  const next = { revision: (prev.revision || 0) + 1, savedAt: new Date().toISOString(), override, history };
  await writeDoc(key, next);
  return next;
}

async function handleVendor(req, res, vendorId) {
  const key = vendorKey(vendorId);
  if (!key) return reply(res, 400, { message: "Missing vendor id." });

  if (req.method === "GET" || req.method === "HEAD") {
    const doc = await readDoc(key);
    return reply(res, 200, { theme: doc?.override || null, revision: doc?.revision || 0 });
  }

  const token = bearer(req);
  if (!token) return reply(res, 401, { message: "You are not signed in. Please sign in again and retry." });
  if (!(await canWriteVendor(token, vendorId))) return reply(res, 403, { message: "You can only change your own panel's look." });

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    return reply(res, e.status || 400, { message: e.status === 413 ? e.message : "The theme could not be read (invalid JSON)." });
  }
  const doc = await readDoc(key);

  if (payload?.restore === "previous") {
    const target = doc?.history?.[0];
    if (!target) return reply(res, 404, { message: "There is no earlier version to go back to." });
    const restored = JSON.parse(JSON.stringify(target.override || {}));
    // images are not kept in history: keep whatever is uploaded now
    const current = doc.override?.branding || {};
    restored.branding = { ...(restored.branding || {}) };
    IMAGE_KEYS.forEach((k) => (current[k] !== undefined ? (restored.branding[k] = current[k]) : delete restored.branding[k]));
    const saved = await saveVendor(key, { ...doc, history: doc.history.slice(1) }, restored);
    return reply(res, 200, { ok: true, revision: saved.revision, theme: saved.override });
  }

  const theme = payload && "theme" in payload ? payload.theme : payload;
  if (theme === null) {
    const saved = await saveVendor(key, doc, null); // back to the admin look
    return reply(res, 200, { ok: true, revision: saved.revision, theme: null });
  }
  if (!isPlainObject(theme)) return reply(res, 422, { message: 'Expected { "theme": { ... } }.' });
  const override = Object.fromEntries(Object.entries(theme).filter(([k]) => ALLOWED_SECTIONS.includes(k)));
  if (JSON.stringify(override).length > MAX_BYTES) return reply(res, 413, { message: "Theme is too large." });
  const saved = await saveVendor(key, doc, Object.keys(override).length ? override : null);
  return reply(res, 200, { ok: true, revision: saved.revision, theme: saved.override });
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Allow", "GET,PUT,POST,OPTIONS");
      return res.end();
    }
    const vendorId = new URL(req.url, "http://x").searchParams.get("vendor");
    if (vendorId) {
      if (!["GET", "HEAD", "PUT", "POST"].includes(req.method)) return reply(res, 405, { message: "Method not allowed." });
      return await handleVendor(req, res, vendorId);
    }

    if (req.method === "GET" || req.method === "HEAD") return reply(res, 200, { theme: await readDoc(ADMIN_KEY) });

    if (req.method === "PUT" || req.method === "POST") {
      const token = bearer(req);
      if (!token) return reply(res, 401, { message: "You are not signed in. Please sign in again and retry." });
      if (!(await canWriteAdmin(token))) return reply(res, 403, { message: "This account is not allowed to change the theme." });
      let payload;
      try {
        payload = await readJsonBody(req);
      } catch (e) {
        return reply(res, e.status || 400, { message: e.status === 413 ? e.message : "The theme could not be read (invalid JSON)." });
      }
      if (payload?.restore === "previous") {
        const restored = await restoreAdmin();
        if (!restored) return reply(res, 404, { message: "There is no earlier version to go back to." });
        return reply(res, 200, { ok: true, theme: restored });
      }
      const theme = payload?.theme ?? payload;
      if (!isPlainObject(theme) || Object.keys(theme).length === 0) return reply(res, 422, { message: 'Expected { "theme": { ... } }.' });
      if (JSON.stringify(theme).length > MAX_BYTES) return reply(res, 413, { message: "Theme is too large." });
      await saveAdmin(theme);
      return reply(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET,PUT,POST,OPTIONS");
    return reply(res, 405, { message: "Method not allowed." });
  } catch (e) {
    console.error("[theme-api]", e);
    return reply(res, e.status || 500, { message: e.status === 503 ? e.message : "The server could not save the theme. Please try again." });
  }
}