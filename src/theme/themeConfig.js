/**
 * themeConfig.js
 * Single source of truth for the panel theme (Super Admin + Vendor share it).
 *
 *  - DEFAULT_THEME       : what the panel looks like when nothing is saved / API is down
 *  - normalizeTheme()    : validates any saved/imported object and fills gaps with defaults
 *  - themeToVars()       : theme -> CSS custom properties (colours are "R G B" channels so
 *                          Tailwind opacity modifiers keep working: bg-[rgb(var(--brand)/0.2)])
 *  - applyTheme()        : writes those variables on <html> (+ favicon, title, fonts, data-attrs)
 *
 * Components must read the CSS variables only; never hard-code brand colours.
 */

/* ------------------------------------------------------------------ */
/* Colour maths                                                        */
/* ------------------------------------------------------------------ */

export const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v || "");

const toArr = (hex) => (isHex(hex) ? hex.slice(1).match(/../g).map((h) => parseInt(h, 16)) : [0, 0, 0]);
const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));
const str = (arr) => arr.map(clamp255).join(" ");
const toHex = (arr) => `#${arr.map((n) => clamp255(n).toString(16).padStart(2, "0")).join("")}`;

export const hexToRgb = (hex) => str(toArr(hex));

/** `amount` of `hex` mixed into white. 0 = white, 1 = the colour. */
const tint = (hex, amount) => str(toArr(hex).map((v) => 255 - (255 - v) * amount));
/** Multiplies each channel. 1 = the colour, 0 = black. */
const shade = (hex, factor) => str(toArr(hex).map((v) => v * factor));
/** Mixed hex: t = 0 -> a, t = 1 -> b. */
const mixHex = (a, b, t) => {
  const x = toArr(a);
  const y = toArr(b);
  return toHex(x.map((v, i) => v * (1 - t) + y[i] * t));
};

export const luminance = (hex) => {
  const [r, g, b] = toArr(hex)
    .map((n) => n / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two hex colours. */
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Black or white, whichever reads better on `bg`. */
export const autoText = (bg) => (contrast(bg, "#111827") >= contrast(bg, "#ffffff") ? "#111827" : "#ffffff");

/* ------------------------------------------------------------------ */
/* Option lists (used by both the engine and the Settings UI)          */
/* ------------------------------------------------------------------ */

const SANS = "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

export const FONTS = {
  cormorant: {
    label: "Cormorant Garamond",
    sample: "Elegant, high contrast",
    stack: "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif",
    google: "Cormorant+Garamond:wght@400;500;600;700;800",
  },
  playfair: {
    label: "Playfair Display",
    sample: "Editorial, bold",
    stack: "'Playfair Display', Georgia, 'Times New Roman', serif",
    google: "Playfair+Display:wght@400;500;600;700;800",
  },
  inter: {
    label: "Inter",
    sample: "Clean, modern sans",
    stack: `'Inter', ${SANS}`,
    google: "Inter:wght@400;500;600;700;800",
  },
  poppins: {
    label: "Poppins",
    sample: "Friendly, geometric",
    stack: `'Poppins', ${SANS}`,
    google: "Poppins:wght@400;500;600;700;800",
  },
  roboto: {
    label: "Roboto",
    sample: "Neutral, familiar",
    stack: `'Roboto', ${SANS}`,
    google: "Roboto:wght@400;500;700;900",
  },
  merriweather: {
    label: "Merriweather",
    sample: "Readable serif",
    stack: "'Merriweather', Georgia, 'Times New Roman', serif",
    google: "Merriweather:wght@400;700;900",
  },
  system: {
    label: "System default",
    sample: "Fastest, no download",
    stack: SANS,
    google: null,
  },
};

export const RADII = {
  sharp: { label: "Sharp", card: "6px", control: "4px" },
  soft: { label: "Soft", card: "16px", control: "8px" },
  round: { label: "Round", card: "24px", control: "14px" },
};

export const DENSITIES = {
  compact: { label: "Compact", spacing: "0.21rem" },
  comfortable: { label: "Comfortable", spacing: "0.25rem" },
};

export const CONTAINERS = {
  full: { label: "Full width", value: "100%" },
  "1600": { label: "1600 px", value: "1600px" },
  "1440": { label: "1440 px", value: "1440px" },
  "1280": { label: "1280 px", value: "1280px" },
  "1140": { label: "1140 px", value: "1140px" },
};

export const BUTTON_STYLES = {
  rounded: { label: "Rounded", radius: null }, // follows the corner style
  pill: { label: "Pill", radius: "9999px" },
  square: { label: "Square", radius: "2px" },
};

export const CARD_SHADOWS = {
  none: {
    label: "None",
    card: "0 0 #0000",
    hover: "0 1px 2px rgba(15, 23, 32, 0.08)",
  },
  soft: {
    label: "Soft",
    card: "0 1px 2px rgba(15, 23, 32, 0.04), 0 10px 24px -14px rgba(15, 23, 32, 0.18)",
    hover: "0 2px 4px rgba(15, 23, 32, 0.06), 0 16px 32px -14px rgba(15, 23, 32, 0.22)",
  },
  strong: {
    label: "Strong",
    card: "0 2px 4px rgba(15, 23, 32, 0.08), 0 18px 36px -12px rgba(15, 23, 32, 0.32)",
    hover: "0 4px 8px rgba(15, 23, 32, 0.1), 0 24px 44px -12px rgba(15, 23, 32, 0.38)",
  },
};

export const TABLE_STYLES = {
  plain: { label: "Plain" },
  striped: { label: "Striped rows" },
  bordered: { label: "Bordered cells" },
};

export const MODES = {
  light: { label: "Light" },
  dark: { label: "Dark" },
  system: { label: "Follow device" },
};

/** Colour fields shown in Settings > Colors (group -> fields). */
export const COLOR_FIELDS = [
  { key: "primary", group: "Brand", label: "Primary", hint: "Active menu, links, highlights, focus rings" },
  { key: "primaryDark", group: "Brand", label: "Primary (dark end)", hint: "Gradient end of icon chips and headings accents" },
  { key: "secondary", group: "Brand", label: "Secondary", hint: "Secondary buttons" },
  { key: "accent", group: "Brand", label: "Accent", hint: "Hairlines, rings and focus borders" },
  { key: "accentText", group: "Brand", label: "Accent text", hint: "Icons and small accent text" },

  { key: "sidebarBg", group: "Shell", label: "Sidebar background", hint: "Sidebar (also the base of dark mode)" },
  { key: "sidebarText", group: "Shell", label: "Sidebar text", hint: "Sidebar links and labels" },
  { key: "headerBg", group: "Shell", label: "Header background", hint: "Top bar (light mode)" },
  { key: "headerText", group: "Shell", label: "Header text", hint: "Top bar icons and labels (light mode)" },

  { key: "background", group: "Surfaces", label: "Page background", hint: "Behind every page (light mode)" },
  { key: "surface", group: "Surfaces", label: "Card / table surface", hint: "Cards, tables, modals (light mode)" },
  { key: "text", group: "Surfaces", label: "Text colour", hint: "Main text (light mode)" },

  { key: "buttonBg", group: "Buttons", label: "Button background", hint: "Primary buttons" },
  { key: "buttonText", group: "Buttons", label: "Button text", hint: "Label on primary buttons" },

  { key: "success", group: "Status", label: "Success", hint: "Active / paid / delivered badges" },
  { key: "warning", group: "Status", label: "Warning", hint: "Pending / processing badges" },
  { key: "error", group: "Status", label: "Error", hint: "Failed / rejected badges, delete buttons" },

  { key: "accent1", group: "Cards & charts", label: "Card colour 1", hint: "First stat card, charts, switches" },
  { key: "accent2", group: "Cards & charts", label: "Card colour 2", hint: "Second stat card and charts" },
  { key: "accent3", group: "Cards & charts", label: "Card colour 3", hint: "Third stat card and charts" },
];

/* ------------------------------------------------------------------ */
/* Presets + defaults                                                  */
/* ------------------------------------------------------------------ */

const preset = (label, p) => ({ label, colors: p });

export const PRESETS = {
  "royal-gold": preset("Royal gold", {
    primary: "#c0923f", primaryDark: "#8c6626", accent: "#c9a45c", accentText: "#a8802f",
    sidebarBg: "#131921", secondary: "#131921", text: "#131921", background: "#f8f6f1",
    accent1: "#3a7563", accent2: "#4a75a3", accent3: "#94628f",
  }),
  emerald: preset("Emerald", {
    primary: "#3a7563", primaryDark: "#1f4a3c", accent: "#5fa58d", accentText: "#2f6b58",
    sidebarBg: "#0f2721", secondary: "#0f2721", text: "#0f2721", background: "#f3f7f4",
    accent1: "#c0923f", accent2: "#4a75a3", accent3: "#94628f",
  }),
  sapphire: preset("Sapphire", {
    primary: "#4a75a3", primaryDark: "#2a4b74", accent: "#7aa3cc", accentText: "#33608f",
    sidebarBg: "#101f37", secondary: "#101f37", text: "#101f37", background: "#f3f6fa",
    accent1: "#3a7563", accent2: "#c0923f", accent3: "#94628f",
  }),
  plum: preset("Plum", {
    primary: "#94628f", primaryDark: "#65405f", accent: "#b98bb4", accentText: "#7d4c78",
    sidebarBg: "#2b1729", secondary: "#2b1729", text: "#2b1729", background: "#f8f3f7",
    accent1: "#3a7563", accent2: "#4a75a3", accent3: "#c0923f",
  }),
  crimson: preset("Crimson", {
    primary: "#c0453f", primaryDark: "#8c2b26", accent: "#d9736d", accentText: "#a63a34",
    sidebarBg: "#2a1210", secondary: "#2a1210", text: "#2a1210", background: "#faf4f3",
    accent1: "#3a7563", accent2: "#4a75a3", accent3: "#94628f",
  }),
  graphite: preset("Graphite", {
    primary: "#475569", primaryDark: "#1e293b", accent: "#94a3b8", accentText: "#334155",
    sidebarBg: "#0f172a", secondary: "#0f172a", text: "#0f172a", background: "#f1f5f9",
    accent1: "#3a7563", accent2: "#4a75a3", accent3: "#94628f",
  }),
};

/** Colour values for a preset, including the button colours that follow the primary. */
export const presetColors = (key) => {
  const p = PRESETS[key]?.colors;
  if (!p) return {};
  return { ...p, buttonBg: p.primary, buttonText: autoText(p.primary) };
};

export const DEFAULT_THEME = {
  version: 2,
  preset: "royal-gold",
  branding: {
    siteName: "Seller Hub",
    tagline: "Marketplace admin",
    logo: "",
    favicon: "",
    loginImage: "",
  },
  colors: {
    ...presetColors("royal-gold"),
    buttonText: "#131921",
    sidebarText: "#e2e8f0",
    headerBg: "#ffffff",
    headerText: "#131921",
    surface: "#ffffff",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
  },
  typography: {
    headingFont: "cormorant",
    bodyFont: "system",
    baseSize: 16,
    headingWeight: 700,
    bodyWeight: 400,
  },
  layout: {
    sidebarWidth: 288,
    sidebarCollapsed: false,
    headerHeight: 64,
    containerWidth: "full",
    radius: "soft",
    density: "comfortable",
  },
  mode: { default: "light", allowToggle: true },
  components: { buttonStyle: "rounded", cardShadow: "soft", tableStyle: "plain" },
  footer: {
    show: true,
    text: "",
    copyright: "© {year} {siteName}. All rights reserved.",
    supportEmail: "",
    supportPhone: "",
    social: { facebook: "", twitter: "", instagram: "", linkedin: "", youtube: "" },
  },
};

/* ------------------------------------------------------------------ */
/* Validation / migration                                              */
/* ------------------------------------------------------------------ */

const pick = (value, allowed, fallback) => (Object.prototype.hasOwnProperty.call(allowed, value) ? value : fallback);
const num = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const text = (value, fallback = "", max = 500) => (typeof value === "string" ? value.slice(0, max) : fallback);
// Uploaded images may be stored as data URLs, so allow a larger limit for those fields.
const asset = (value) => (typeof value === "string" ? value.slice(0, 900000) : "");

/** Old (v1) themes only had preset/colors{brand,...}/font/radius. */
const migrateLegacy = (raw) => {
  if (!raw || typeof raw !== "object" || raw.version >= 2) return raw;
  const c = raw.colors || {};
  const colors = { ...c };
  if (c.brand) colors.primary = c.brand;
  if (c.brandDark) colors.primaryDark = c.brandDark;
  if (c.line) colors.accent = c.line;
  if (c.brandText) colors.accentText = c.brandText;
  if (c.ink) {
    colors.sidebarBg = c.ink;
    colors.secondary = c.ink;
    colors.text = c.ink;
  }
  if (c.pageBg) colors.background = c.pageBg;
  if (c.brand) colors.buttonBg = c.brand;
  return {
    ...raw,
    colors,
    typography: { ...(raw.typography || {}), ...(raw.font ? { headingFont: raw.font } : {}) },
    layout: { ...(raw.layout || {}), ...(raw.radius ? { radius: raw.radius } : {}) },
  };
};

/** Merges any object onto the defaults and drops invalid values. Never throws. */
export const normalizeTheme = (input) => {
  const d = DEFAULT_THEME;
  const raw = migrateLegacy(input && typeof input === "object" ? input : {});

  const colors = {};
  Object.keys(d.colors).forEach((k) => {
    colors[k] = isHex(raw.colors?.[k]) ? raw.colors[k].toLowerCase() : d.colors[k];
  });

  const social = {};
  Object.keys(d.footer.social).forEach((k) => {
    social[k] = text(raw.footer?.social?.[k], "", 300);
  });

  return {
    version: 2,
    preset: typeof raw.preset === "string" ? raw.preset : d.preset,
    branding: {
      siteName: text(raw.branding?.siteName, d.branding.siteName, 60) || d.branding.siteName,
      tagline: text(raw.branding?.tagline, d.branding.tagline, 80),
      logo: asset(raw.branding?.logo),
      favicon: asset(raw.branding?.favicon),
      loginImage: asset(raw.branding?.loginImage),
    },
    colors,
    typography: {
      headingFont: pick(raw.typography?.headingFont, FONTS, d.typography.headingFont),
      bodyFont: pick(raw.typography?.bodyFont, FONTS, d.typography.bodyFont),
      baseSize: num(raw.typography?.baseSize, 13, 19, d.typography.baseSize),
      headingWeight: num(raw.typography?.headingWeight, 400, 900, d.typography.headingWeight),
      bodyWeight: num(raw.typography?.bodyWeight, 300, 600, d.typography.bodyWeight),
    },
    layout: {
      sidebarWidth: num(raw.layout?.sidebarWidth, 220, 360, d.layout.sidebarWidth),
      sidebarCollapsed: Boolean(raw.layout?.sidebarCollapsed ?? d.layout.sidebarCollapsed),
      headerHeight: num(raw.layout?.headerHeight, 52, 96, d.layout.headerHeight),
      containerWidth: pick(raw.layout?.containerWidth, CONTAINERS, d.layout.containerWidth),
      radius: pick(raw.layout?.radius, RADII, d.layout.radius),
      density: pick(raw.layout?.density, DENSITIES, d.layout.density),
    },
    mode: {
      default: pick(raw.mode?.default, MODES, d.mode.default),
      allowToggle: Boolean(raw.mode?.allowToggle ?? d.mode.allowToggle),
    },
    components: {
      buttonStyle: pick(raw.components?.buttonStyle, BUTTON_STYLES, d.components.buttonStyle),
      cardShadow: pick(raw.components?.cardShadow, CARD_SHADOWS, d.components.cardShadow),
      tableStyle: pick(raw.components?.tableStyle, TABLE_STYLES, d.components.tableStyle),
    },
    footer: {
      show: Boolean(raw.footer?.show ?? d.footer.show),
      text: text(raw.footer?.text, "", 300),
      copyright: text(raw.footer?.copyright, d.footer.copyright, 200),
      supportEmail: text(raw.footer?.supportEmail, "", 120),
      supportPhone: text(raw.footer?.supportPhone, "", 40),
      social,
    },
  };
};

/** Replaces {year} and {siteName} in footer strings. */
export const fillTokens = (value, theme) =>
  String(value || "")
    .replaceAll("{year}", String(new Date().getFullYear()))
    .replaceAll("{siteName}", theme.branding.siteName);

/* ------------------------------------------------------------------ */
/* theme -> CSS variables                                              */
/* ------------------------------------------------------------------ */

/**
 * @param {object} theme  a normalised theme
 * @param {"light"|"dark"} mode
 */
export const themeToVars = (theme, mode = "light") => {
  const c = theme.colors;
  const t = theme.typography;
  const l = theme.layout;
  const comp = theme.components;
  const dark = mode === "dark";

  // Dark palette is derived from the sidebar colour so it always matches the brand.
  const base = luminance(c.sidebarBg) < 0.2 ? c.sidebarBg : "#131921";
  const pal = dark
    ? {
        page: mixHex(base, "#000000", 0.35),
        card: mixHex(base, "#ffffff", 0.07),
        border: mixHex(base, "#ffffff", 0.17),
        text: "#e8eaed",
        header: mixHex(base, "#ffffff", 0.07),
        headerText: "#e8eaed",
        stripe: mixHex(base, "#ffffff", 0.045),
      }
    : {
        page: c.background,
        card: c.surface,
        border: mixHex(c.surface, c.text, 0.1),
        text: c.text,
        header: c.headerBg,
        headerText: c.headerText,
        stripe: mixHex(c.surface, c.text, 0.03),
      };

  const statusText = (hex) => (dark ? tint(hex, 0.55) : shade(hex, 0.62));

  const vars = {
    // core brand
    "--brand": hexToRgb(c.primary),
    "--brand-dark": hexToRgb(c.primaryDark),
    "--brand-line": hexToRgb(c.accent),
    "--brand-text": dark ? hexToRgb(mixHex(c.accentText, "#ffffff", 0.35)) : hexToRgb(c.accentText),
    "--secondary": hexToRgb(c.secondary),
    "--secondary-text": hexToRgb(autoText(c.secondary)),

    // surfaces (mode aware)
    "--ink": hexToRgb(pal.text),
    "--page-bg": hexToRgb(pal.page),
    "--card-bg": hexToRgb(pal.card),
    "--border": hexToRgb(pal.border),
    "--stripe": hexToRgb(pal.stripe),
    "--header-bg": hexToRgb(pal.header),
    "--header-text": hexToRgb(pal.headerText),
    "--sidebar-bg": hexToRgb(c.sidebarBg),
    "--sidebar-text": hexToRgb(c.sidebarText),

    // buttons
    "--btn-bg": hexToRgb(c.buttonBg),
    "--btn-bg-hover": tint(c.buttonBg, 0.88),
    "--btn-text": hexToRgb(c.buttonText),

    // status
    "--success": hexToRgb(c.success),
    "--success-text": statusText(c.success),
    "--warning": hexToRgb(c.warning),
    "--warning-text": statusText(c.warning),
    "--danger": hexToRgb(c.error),
    "--danger-text": statusText(c.error),

    // derived from the primary
    "--brand-hover": tint(c.primary, 0.92),
    "--brand-dark-hover": tint(c.primaryDark, 0.92),
    "--brand-light": tint(c.primary, 0.75),
    "--brand-light-hover": tint(c.primary, 0.68),
    "--brand-lighter": tint(c.primary, 0.38),
    "--brand-lighter-hover": tint(c.primary, 0.3),
    "--brand-on-dark": tint(c.accent, 0.6),
    "--tint-50": tint(c.primary, 0.045),
    "--tint-100": tint(c.primary, 0.08),
    "--tint-200": tint(c.primary, 0.19),
    "--tint-300": tint(c.primary, 0.34),
    "--hero-a": tint(c.primary, 0.06),
    "--hero-b": tint(c.primary, 0.14),
    "--hero-c": tint(c.accent3, 0.15),
    "--p4-b1": shade(c.primary, 0.49),
    "--p4-b2": shade(c.primary, 0.25),

    // typography
    "--font-display": (FONTS[t.headingFont] || FONTS.cormorant).stack,
    "--font-body": (FONTS[t.bodyFont] || FONTS.system).stack,
    "--font-size-base": `${t.baseSize}px`,
    "--heading-weight": String(t.headingWeight),
    "--body-weight": String(t.bodyWeight),

    // layout
    "--sidebar-w": `${l.sidebarWidth}px`,
    "--sidebar-w-collapsed": "76px",
    "--header-h": `${l.headerHeight}px`,
    "--container-w": (CONTAINERS[l.containerWidth] || CONTAINERS.full).value,
    "--spacing": (DENSITIES[l.density] || DENSITIES.comfortable).spacing,
    "--radius-card": (RADII[l.radius] || RADII.soft).card,
    "--radius-control": (RADII[l.radius] || RADII.soft).control,
    "--radius-btn": (BUTTON_STYLES[comp.buttonStyle] || BUTTON_STYLES.rounded).radius || (RADII[l.radius] || RADII.soft).control,

    // component styles
    "--shadow-card": (CARD_SHADOWS[comp.cardShadow] || CARD_SHADOWS.soft).card,
    "--shadow-card-hover": (CARD_SHADOWS[comp.cardShadow] || CARD_SHADOWS.soft).hover,
  };

  // three card palettes derived from one colour each
  ["accent1", "accent2", "accent3"].forEach((key, i) => {
    const n = i + 1;
    const hex = c[key];
    vars[`--a${n}`] = hexToRgb(hex);
    vars[`--a${n}-dark`] = shade(hex, 0.6);
    vars[`--a${n}-f1`] = tint(hex, 0.06);
    vars[`--a${n}-f2`] = tint(hex, 0.125);
    vars[`--a${n}-f3`] = tint(hex, 0.22);
    vars[`--a${n}-b1`] = shade(hex, 0.54);
    vars[`--a${n}-b2`] = shade(hex, 0.3);
    vars[`--a${n}-text`] = shade(hex, 0.76);
  });

  return vars;
};

/* ------------------------------------------------------------------ */
/* Applying the theme to the document                                  */
/* ------------------------------------------------------------------ */

const loadFonts = (theme) => {
  const keys = [theme.typography.headingFont, theme.typography.bodyFont];
  const families = [...new Set(keys.map((k) => FONTS[k]?.google).filter(Boolean))];
  const id = "panel-theme-font";
  let link = document.getElementById(id);
  if (!families.length) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
};

const setFavicon = (href) => {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (!link.dataset.defaultHref) link.dataset.defaultHref = link.getAttribute("href") || "";
  if (href) link.setAttribute("href", href);
  else if (link.dataset.defaultHref) link.setAttribute("href", link.dataset.defaultHref);
  else link.removeAttribute("href");
};

export const applyTheme = (theme, mode = "light") => {
  const root = document.documentElement;
  const vars = themeToVars(theme, mode);
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.theme = mode;
  root.dataset.table = theme.components.tableStyle;
  root.style.colorScheme = mode;
  document.body.style.backgroundColor = `rgb(${vars["--page-bg"]})`;
  document.title = theme.branding.siteName;
  setFavicon(theme.branding.favicon);
  loadFonts(theme);
};
