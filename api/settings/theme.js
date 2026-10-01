/**
 * Shared theme API  —  /api/settings/theme
 *
 *   GET  -> { theme }            public (the login page needs it before anyone signs in)
 *   PUT  <- { theme }            needs a Bearer token (see THEME_WRITE_TOKENS below)
 *
 * One theme for everyone: it is stored once on the server, so a change saved by the Super Admin
 * shows up in every browser and on every device.
 *
 * Storage
 *   - On Vercel:   Vercel Blob (set up once: Vercel dashboard > Storage > Create > Blob > connect to this project).
 *                  Vercel then adds BLOB_READ_WRITE_TOKEN automatically. Both public and private stores work.
 *   - Local dev:   a plain file at .theme-data/theme.json (used by `npm run dev` through vite.config.js).
 *
 * Optional environment variables (Vercel > Settings > Environment Variables)
 *   THEME_WRITE_TOKENS  comma-separated Bearer tokens allowed to save. Default: "static-superadmin-token"
 *                       (the token the static Super Admin login produces). "*" = any signed-in token.
 *   AUTH_VERIFY_URL     a protected URL on your real backend; a token is also accepted when GET <url> with it returns 2xx.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";

const BLOB_PATH = "panel-theme/theme.json";
const LOCAL_FILE = path.join(process.cwd(), ".theme-data", "theme.json");
const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept at most ~4.5 MB per request
const WRITE_TOKENS = (process.env.THEME_WRITE_TOKENS || "static-superadmin-token")
  .split(",").map((s) => s.trim()).filter(Boolean);
const AUTH_VERIFY_URL = process.env.AUTH_VERIFY_URL || "";

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const onVercel = () => Boolean(process.env.VERCEL);

/* ---------------- storage ---------------- */

async function readTheme() {
  if (hasBlob()) {
    const { get } = await import("@vercel/blob");
    for (const access of ["private", "public"]) {
      try {
        const result = await get(BLOB_PATH, { access, useCache: false });
        if (result?.stream) return JSON.parse(await new Response(result.stream).text());
      } catch {
        /* wrong store type, or nothing saved yet: try the other one */
      }
    }
    return null;
  }
  if (onVercel()) return null; // no storage connected yet
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"));
  } catch {
    return null;
  }
}

async function writeTheme(theme) {
  const body = JSON.stringify(theme);
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    let lastError;
    for (const access of ["private", "public"]) {
      try {
        await put(BLOB_PATH, body, {
          access,
          contentType: "application/json",
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 60,
        });
        return;
      } catch (e) {
        lastError = e; // most likely the store is the other access type; try it
      }
    }
    throw lastError;
  }
  if (onVercel()) {
    const e = new Error(
      "No storage is connected. In the Vercel dashboard open Storage > Create > Blob and connect it to this project, then redeploy."
    );
    e.status = 503;
    throw e;
  }
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  const tmp = `${LOCAL_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, LOCAL_FILE);
}

/* ---------------- helpers ---------------- */

const bearer = (req) => {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers?.authorization || "");
  const t = m?.[1]?.trim();
  return t && t !== "null" && t !== "undefined" ? t : "";
};

async function canWrite(token) {
  if (!token) return false;
  if (WRITE_TOKENS.includes("*") || WRITE_TOKENS.includes(token)) return true;
  if (AUTH_VERIFY_URL) {
    try {
      const r = await fetch(AUTH_VERIFY_URL, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) });
      return r.ok;
    } catch {
      return false;
    }
  }
  return false;
}

async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body; // already parsed by the platform
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

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const reply = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(body));
};

/* ---------------- handler ---------------- */

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Allow", "GET,PUT,POST,OPTIONS");
      return res.end();
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return reply(res, 200, { theme: await readTheme() });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const token = bearer(req);
      if (!token) return reply(res, 401, { message: "You are not signed in. Please sign in again and retry." });
      if (!(await canWrite(token))) return reply(res, 403, { message: "This account is not allowed to change the theme." });

      let payload;
      try {
        payload = await readJsonBody(req);
      } catch (e) {
        if (e.status === 413) return reply(res, 413, { message: e.message });
        return reply(res, 400, { message: "The theme could not be read (invalid JSON)." });
      }
      const theme = payload?.theme ?? payload;
      if (!isPlainObject(theme) || Object.keys(theme).length === 0) {
        return reply(res, 422, { message: 'Expected { "theme": { ... } }.' });
      }
      if (JSON.stringify(theme).length > MAX_BYTES) return reply(res, 413, { message: "Theme is too large." });

      await writeTheme(theme);
      return reply(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET,PUT,POST,OPTIONS");
    return reply(res, 405, { message: "Method not allowed." });
  } catch (e) {
    console.error("[theme-api]", e);
    return reply(res, e.status || 500, { message: e.status === 503 ? e.message : "The server could not save the theme. Please try again." });
  }
}
