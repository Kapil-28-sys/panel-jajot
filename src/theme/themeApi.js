import axios from "axios";
import { getAuthToken } from "../services/apiClient";

/**
 * Shared theme API (api/settings/theme.js in this project, served from the same site).
 *   GET  {THEME_PATH}  -> { theme }
 *   PUT  {THEME_PATH}  <- { theme }   (needs the logged-in Bearer token)
 *
 * The theme is stored once on the server, so a change saved by the Super Admin shows up in
 * every browser. It deliberately does NOT use the main API (API_BASE_URL), which has no theme route.
 * Set VITE_THEME_API_URL only if the theme API is hosted on a different domain.
 *
 * A separate axios instance is used on purpose: the shared apiClient clears the login
 * token on any 401/403, and a theme route must never log people out.
 */
export const THEME_PATH = import.meta.env.VITE_THEME_SETTINGS_PATH || "/api/settings/theme";
export const THEME_API_BASE = (import.meta.env.VITE_THEME_API_URL || "").replace(/\/$/, "");

const http = axios.create({ baseURL: THEME_API_BASE, timeout: 20000 });

const authHeaders = () => {
  const token = getAuthToken();
  return token && token !== "null" && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchThemeSettings() {
  const res = await http.get(THEME_PATH, { headers: { ...authHeaders(), "Cache-Control": "no-cache" }, params: { t: Date.now() } });
  const body = res.data;
  // A host that answers with an HTML page (SPA rewrite) means "no theme API here".
  if (typeof body === "string") return null;
  const theme = body?.theme ?? body?.data?.theme ?? body?.data ?? body;
  return theme && typeof theme === "object" && Object.keys(theme).length ? theme : null;
}

export async function saveThemeSettings(theme) {
  await http.put(THEME_PATH, { theme }, { headers: authHeaders() });
}

/* ---- Vendor panel theme: overrides saved per vendor, layered on the Super Admin theme ---- */
const vendorParams = (vendorId) => ({ vendor: vendorId });

export async function fetchVendorTheme(vendorId) {
  const res = await http.get(THEME_PATH, { headers: { ...authHeaders(), "Cache-Control": "no-cache" }, params: { ...vendorParams(vendorId), t: Date.now() } });
  const body = res.data;
  if (!body || typeof body !== "object") return null; // no theme API on this host
  return { override: body.theme && typeof body.theme === "object" ? body.theme : null, revision: body.revision || 0 };
}

/** override = object (save), null (back to the Super Admin look). restore="previous" goes back one version. */
export async function saveVendorTheme(vendorId, override, restore) {
  const payload = restore ? { restore } : { theme: override };
  const res = await http.put(THEME_PATH, payload, { headers: authHeaders(), params: vendorParams(vendorId) });
  return res.data;
}

/** Super Admin: go back to the previous saved version. Resolves the restored theme. */
export async function restoreAdminTheme() {
  const res = await http.put(THEME_PATH, { restore: "previous" }, { headers: authHeaders() });
  return res.data?.theme || null;
}