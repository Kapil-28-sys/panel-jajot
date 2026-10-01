/** Storage shared by the theme API functions. Vercel Blob in production, .theme-data/ files locally. */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export const MAX_BYTES = 4 * 1024 * 1024;
export const ADMIN_KEY = "panel-theme/theme.json"; // unchanged, so already-saved admin themes keep working
export const vendorKey = (id) => {
  const safe = String(id || "").replace(/[^\w-]/g, "").slice(0, 64);
  return safe ? `panel-theme/vendors/${safe}.json` : "";
};
export const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const onVercel = () => Boolean(process.env.VERCEL);

const localFile = (key) => path.join(process.cwd(), ".theme-data", key.split("/").slice(1).join("__"));

export async function readDoc(key) {
  if (hasBlob()) {
    const { get } = await import("@vercel/blob");
    for (const access of ["private", "public"]) {
      try {
        const result = await get(key, { access, useCache: false });
        if (result?.stream) return JSON.parse(await new Response(result.stream).text());
      } catch {
        /* wrong store type, or nothing saved yet: try the other one */
      }
    }
    return null;
  }
  if (onVercel()) return null;
  try {
    return JSON.parse(await fs.readFile(localFile(key), "utf8"));
  } catch {
    return null;
  }
}

export async function writeDoc(key, value) {
  const body = JSON.stringify(value);
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    let lastError;
    for (const access of ["private", "public"]) {
      try {
        await put(key, body, { access, contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
        return;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }
  if (onVercel()) {
    throw Object.assign(new Error("No storage is connected. In the Vercel dashboard open Storage > Create > Blob and connect it to this project, then redeploy."), { status: 503 });
  }
  const file = localFile(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, file);
}
