import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, applyTheme, normalizeTheme } from "./themeConfig";
import { fetchThemeSettings, saveThemeSettings, fetchVendorTheme, saveVendorTheme, restoreAdminTheme } from "./themeApi";
import { diffTheme, mergeTheme } from "./vendorTheme";
import { getCurrentSession } from "../config/localAuth";

/**
 * ThemeProvider
 * One provider for the whole app, so Super Admin (/admin) and Vendor (/vendor) always look
 * identical and follow the same settings.
 *
 * Load order:  device cache (instant, no flash)  ->  GET from API  ->  defaults if both fail.
 * Save:        applies immediately + caches on the device + PUTs to the API. If the API is
 *              unreachable the theme still works on this device and the caller is told.
 */

const CACHE_KEY = "panel-theme-v2";
const LEGACY_KEY = "admin-panel-theme";
const MODE_KEY = "panel-color-mode";

// A vendor's own look is stored as "what they changed" on top of the Super Admin theme.
const readVendorId = () => {
  const s = getCurrentSession();
  return s.loggedIn && s.role === "Vendor" && s.vendorId ? String(s.vendorId) : "";
};
const overrideKey = (id) => `panel-theme-vendor-${id}`;
const readOverride = (id) => {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(overrideKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeOverride = (id, o) => {
  try {
    if (o) localStorage.setItem(overrideKey(id), JSON.stringify(o));
    else localStorage.removeItem(overrideKey(id));
  } catch {
    /* ignore */
  }
};

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY) || localStorage.getItem(LEGACY_KEY);
    return raw ? { theme: normalizeTheme(JSON.parse(raw)), found: true } : { theme: normalizeTheme(DEFAULT_THEME), found: false };
  } catch {
    return { theme: normalizeTheme(DEFAULT_THEME), found: false };
  }
};

const writeCache = (theme) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
  } catch {
    /* storage full/unavailable: theme still applies for this session */
  }
};

const readUserMode = () => {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
};

const systemPrefersDark = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [initial] = useState(readCache);
  const [baseTheme, setThemeState] = useState(initial.theme); // Super Admin theme
  const [vendorId, setVendorId] = useState(readVendorId);
  const [override, setOverride] = useState(() => readOverride(readVendorId()));
  const [revision, setRevision] = useState(0);
  const theme = useMemo(
    () => (vendorId && override ? normalizeTheme(mergeTheme(baseTheme, override)) : baseTheme),
    [baseTheme, vendorId, override]
  );
  // "loading" | "server" | "device" | "default"
  const [source, setSource] = useState("loading");
  const [userMode, setUserModeState] = useState(readUserMode);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  const preferred = theme.mode.allowToggle && userMode ? userMode : theme.mode.default;
  const mode = preferred === "system" ? (systemDark ? "dark" : "light") : preferred;

  useLayoutEffect(() => {
    applyTheme(theme, mode);
  }, [theme, mode]);

  // Follow the device setting when "Follow device" is selected.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Sign-in / sign-out in this tab (or another one) changes whose look we show.
  useEffect(() => {
    const sync = () => {
      const id = readVendorId();
      setVendorId(id);
      setOverride(readOverride(id));
    };
    window.addEventListener("panel-session-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("panel-session-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // A vendor's saved overrides from the server (the device copy is used until they arrive).
  useEffect(() => {
    if (!vendorId) return undefined;
    let alive = true;
    fetchVendorTheme(vendorId)
      .then((r) => {
        if (!alive || !r) return;
        setOverride(r.override);
        setRevision(r.revision);
        writeOverride(vendorId, r.override);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [vendorId]);

  // Fetch the saved theme once. Any failure keeps the cached/default theme.
  useEffect(() => {
    let alive = true;
    fetchThemeSettings()
      .then((remote) => {
        if (!alive) return;
        if (remote) {
          const next = normalizeTheme(remote);
          setThemeState(next);
          writeCache(next);
          setSource("server");
        } else {
          setSource(initial.found ? "device" : "default");
        }
      })
      .catch(() => {
        if (alive) setSource(initial.found ? "device" : "default");
      });
    return () => {
      alive = false;
    };
  }, [initial.found]);

  const setUserMode = useCallback((next) => {
    setUserModeState(next);
    try {
      if (next) localStorage.setItem(MODE_KEY, next);
      else localStorage.removeItem(MODE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => setUserMode(mode === "dark" ? "light" : "dark"), [mode, setUserMode]);

  /** Applies + caches + PUTs. Resolves { remote: boolean }. Never throws. */
  const saveTheme = useCallback(
    async (next) => {
      const clean = normalizeTheme(next);
      if (vendorId) {
        // Vendor: store only what differs from the Super Admin look.
        const ov = diffTheme(baseTheme, clean) || null;
        setOverride(ov);
        writeOverride(vendorId, ov);
        setUserMode(null);
        try {
          const r = await saveVendorTheme(vendorId, ov);
          setRevision(r?.revision || 0);
          setSource("server");
          return { remote: true };
        } catch (error) {
          setSource("device");
          return { remote: false, error };
        }
      }
      setThemeState(clean);
      writeCache(clean);
      setUserMode(null); // let the newly saved default mode take effect for the person saving
      try {
        await saveThemeSettings(clean);
        setSource("server");
        return { remote: true };
      } catch (error) {
        setSource("device");
        return { remote: false, error };
      }
    },
    [setUserMode, vendorId, baseTheme]
  );

  const resetTheme = useCallback(() => (vendorId ? saveTheme(baseTheme) : saveTheme(DEFAULT_THEME)), [saveTheme, vendorId, baseTheme]);

  /** Go back to the previous saved version (admin: the shared theme, vendor: their own). Never throws. */
  const restorePrevious = useCallback(async () => {
    try {
      if (!vendorId) {
        const restored = await restoreAdminTheme();
        if (restored) {
          const next = normalizeTheme(restored);
          setThemeState(next);
          writeCache(next);
          setRevision((n) => n + 1);
        }
        return { remote: Boolean(restored) };
      }
      const r = await saveVendorTheme(vendorId, null, "previous");
      setOverride(r.theme || null);
      writeOverride(vendorId, r.theme || null);
      setRevision(r.revision || 0);
      return { remote: true };
    } catch (error) {
      return { remote: false, error };
    }
  }, [vendorId]);

  const value = useMemo(
    () => ({ theme, mode, source, saveTheme, resetTheme, toggleMode, setUserMode, isVendor: Boolean(vendorId), revision, restorePrevious }),
    [theme, mode, source, saveTheme, resetTheme, toggleMode, setUserMode, vendorId, revision, restorePrevious]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};
