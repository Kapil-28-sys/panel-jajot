import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, applyTheme, normalizeTheme } from "./themeConfig";
import { fetchThemeSettings, saveThemeSettings } from "./themeApi";

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
  const [theme, setThemeState] = useState(initial.theme);
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
    [setUserMode]
  );

  const resetTheme = useCallback(() => saveTheme(DEFAULT_THEME), [saveTheme]);

  const value = useMemo(
    () => ({ theme, mode, source, saveTheme, resetTheme, toggleMode, setUserMode }),
    [theme, mode, source, saveTheme, resetTheme, toggleMode, setUserMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};
