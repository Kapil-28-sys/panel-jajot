import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../theme/ThemeProvider";

const SidebarContext = createContext(null);

const COLLAPSE_KEY = "panel-sidebar-collapsed";

const readStored = () => {
  try {
    const v = localStorage.getItem(COLLAPSE_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
};

/**
 * Tracks whether the mobile sidebar drawer is open, and whether the desktop sidebar is
 * collapsed to an icon rail. Lives above Navbar + Sidebar inside AdminLayout so the buttons
 * in the navbar can control the sidebar.
 *
 * The collapsed default comes from Settings > Layout; a person's own toggle is remembered
 * on their device until the default is changed in Settings.
 */
export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const defaultCollapsed = theme.layout.sidebarCollapsed;
  const [collapsed, setCollapsed] = useState(() => readStored() ?? defaultCollapsed);
  const location = useLocation();

  // Close the drawer automatically whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // When the admin changes the default in Settings (not on first mount), follow it and
  // drop any personal override.
  const lastDefault = useRef(defaultCollapsed);
  useEffect(() => {
    if (lastDefault.current === defaultCollapsed) return;
    lastDefault.current = defaultCollapsed;
    setCollapsed(defaultCollapsed);
    try {
      localStorage.removeItem(COLLAPSE_KEY);
    } catch {
      /* ignore */
    }
  }, [defaultCollapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, collapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
