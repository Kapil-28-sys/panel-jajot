/**
 * Vendor theme = a small "override" layered on top of the Super Admin theme.
 * Only what the vendor actually changed is stored, so later Super Admin / app updates keep
 * flowing through for everything the vendor did not touch. Pure functions: used by the browser
 * AND by the server (api/*), so keep this file free of DOM / React imports.
 */
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Only the leaves of `next` that differ from `base` (undefined when nothing differs). */
export const diffTheme = (base, next) => {
  if (!isObj(base) || !isObj(next)) return JSON.stringify(base) === JSON.stringify(next) ? undefined : next;
  const out = {};
  for (const k of Object.keys(next)) {
    if (isObj(next[k]) && isObj(base[k])) {
      const d = diffTheme(base[k], next[k]);
      if (d !== undefined) out[k] = d;
    } else if (JSON.stringify(base[k]) !== JSON.stringify(next[k])) out[k] = next[k];
  }
  return Object.keys(out).length ? out : undefined;
};

/** base + override (override wins, deep). */
export const mergeTheme = (base, over) => {
  if (!isObj(over)) return base;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = isObj(over[k]) && isObj(base?.[k]) ? mergeTheme(base[k], over[k]) : over[k];
  return out;
};
