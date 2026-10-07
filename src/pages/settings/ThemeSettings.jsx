import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, Check, CheckCircle2, Download, Image as ImageIcon, Layout, Moon, Palette, PanelBottom,
  RotateCcw, Save, Sun, Trash2, Type, Upload, SlidersHorizontal,
} from "lucide-react";
import {
  BUTTON_STYLES, CARD_SHADOWS, COLOR_FIELDS, CONTAINERS, DEFAULT_THEME, DENSITIES, FONTS, MODES, PRESETS, RADII,
  TABLE_STYLES, autoText, contrast, fillTokens, isHex, normalizeTheme, presetColors, themeToVars,
} from "../../theme/themeConfig";
import { useTheme } from "../../theme/ThemeProvider";
import { fileToThemeImage } from "../../theme/imageUpload";

/**
 * ThemeSettings.jsx — Settings > Appearance.
 * Six sub-tabs (Branding, Colors, Typography, Layout, Theme, Footer), a live preview that
 * shows the draft without touching the rest of the app, Save (applies to Super Admin AND
 * Vendor panels), Discard and Reset to default.
 *
 * The preview only uses direct variable forms such as rgb(var(--card-bg)); the Tailwind
 * colour tokens (text-ink-950, border-line …) are resolved on <html>, so they would not
 * pick up the preview's scoped variables.
 */

const cardRadius = { borderRadius: "var(--radius-card)" };
const controlRadius = { borderRadius: "var(--radius-control)" };
const displayFont = { fontFamily: "var(--font-display)" };

const primaryButton =
  "inline-flex items-center justify-center gap-1.5 bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2 text-sm font-medium text-white ring-1 ring-[rgb(var(--brand-line)/0.6)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const ghostButton =
  "inline-flex items-center gap-1.5 border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[rgb(var(--brand-line))] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "w-full border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-2 focus:ring-[rgb(var(--brand-line)/0.3)]";

const SUB_TABS = [
  { key: "branding", label: "Branding", icon: ImageIcon },
  { key: "colors", label: "Colors", icon: Palette },
  { key: "typography", label: "Typography", icon: Type },
  { key: "layout", label: "Layout", icon: Layout },
  { key: "theme", label: "Theme", icon: SlidersHorizontal },
  { key: "footer", label: "Footer", icon: PanelBottom },
];

/* ---------- building blocks ---------- */

function Panel({ title, description, children }) {
  return (
    <section className="relative overflow-hidden bg-white ring-1 ring-stone-200" style={cardRadius}>
      <div className="border-b border-stone-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-900" style={displayFont}>{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      <span className="mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function TextField({ label, hint, value, onChange, type = "text", placeholder, maxLength }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        style={controlRadius}
      />
    </Field>
  );
}

function SelectField({ label, hint, value, onChange, options }) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} style={controlRadius}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] ${
        checked ? "bg-[rgb(var(--brand))]" : "bg-stone-300"
      }`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function ToggleRow({ title, detail, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-800">{label}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-1 bg-stone-100 p-1" style={controlRadius} role="radiogroup">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`px-4 py-1.5 text-sm font-medium transition ${
              value === o.value ? "bg-white text-slate-900 shadow-sm ring-1 ring-[rgb(var(--brand-line)/0.4)]" : "text-slate-500 hover:text-slate-900"
            }`}
            style={controlRadius}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Range({ label, hint, value, min, max, step = 1, unit = "", onChange }) {
  return (
    <Field label={`${label}: ${value}${unit}`} hint={hint}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[rgb(var(--brand))]"
      />
    </Field>
  );
}

function ColorField({ label, hint, value, onChange }) {
  const valid = isHex(value);
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-800">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer border border-stone-300 bg-white p-1"
          style={controlRadius}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.startsWith("#") || e.target.value === "" ? e.target.value : `#${e.target.value}`)}
          spellCheck={false}
          maxLength={7}
          aria-invalid={!valid}
          className={`${inputClass} font-mono ${valid ? "" : "border-rose-400 focus:border-rose-500"}`}
          style={controlRadius}
        />
      </div>
      <p className={`mt-1 text-xs ${valid ? "text-slate-500" : "text-rose-600"}`}>
        {valid ? hint : "Use a 6-digit hex like #c0923f."}
      </p>
    </div>
  );
}

function ImageField({ label, hint, value, onChange, maxSize, mime, accept = "image/*", previewClass = "h-14 w-14", notify }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const isData = value.startsWith("data:");

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToThemeImage(file, { maxSize, mime }));
    } catch (err) {
      notify(err.message || "Couldn't use that image.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-800">{label}</p>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-stone-300 bg-stone-50 ${previewClass}`}
          style={controlRadius}
        >
          {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <ImageIcon size={20} className="text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => ref.current?.click()} disabled={busy} className={ghostButton} style={controlRadius}>
              <Upload size={14} /> {busy ? "Processing…" : "Upload"}
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} className={ghostButton} style={controlRadius}>
                <Trash2 size={14} /> Remove
              </button>
            )}
            <input ref={ref} type="file" accept={accept} onChange={pickFile} className="hidden" />
          </div>
          <input
            value={isData ? "" : value}
            placeholder={isData ? "Uploaded image in use — or paste an https:// URL" : "…or paste an https:// image URL"}
            onChange={(e) => onChange(e.target.value.trim())}
            className={inputClass}
            style={controlRadius}
          />
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* ---------- live preview ---------- */

function Preview({ draft, mode, onModeChange }) {
  const vars = useMemo(() => themeToVars(draft, mode), [draft, mode]);
  const { branding, layout, footer } = draft;
  const sideW = Math.round((layout.sidebarWidth / 288) * 112);
  const rail = layout.sidebarCollapsed;
  const box = "border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]";
  const btn = { borderRadius: "var(--radius-btn)" };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">Preview mode</p>
        <div className="inline-flex gap-1 bg-stone-100 p-1" style={controlRadius}>
          {[{ k: "light", i: Sun }, { k: "dark", i: Moon }].map(({ k, i: I }) => (
            <button
              key={k}
              type="button"
              aria-pressed={mode === k}
              onClick={() => onModeChange(k)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium ${mode === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              style={controlRadius}
            >
              <I size={12} /> {k === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>

      <div
        data-theme={mode}
        data-table={draft.components.tableStyle}
        style={{ ...vars, fontFamily: "var(--font-body)", fontWeight: "var(--body-weight)", borderRadius: "var(--radius-card)", colorScheme: mode }}
        className="overflow-hidden border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] text-[rgb(var(--ink))]"
      >
        <div className="flex">
          {/* sidebar */}
          <div
            className="hidden shrink-0 space-y-2 bg-[rgb(var(--sidebar-bg))] p-3 text-[rgb(var(--sidebar-text))] transition-[width] sm:block"
            style={{ width: rail ? 44 : sideW }}
          >
            <div className="flex items-center gap-2">
              {branding.logo ? (
                <img src={branding.logo} alt="" className="h-6 w-6 shrink-0 object-contain" />
              ) : (
                <span className="h-6 w-6 shrink-0 bg-gradient-to-br from-[rgb(var(--brand-line))] to-[rgb(var(--brand-dark))]" style={controlRadius} />
              )}
              {!rail && <span className="truncate text-xs font-bold">{branding.siteName}</span>}
            </div>
            {["Dashboard", "Products", "Orders"].map((n, i) => (
              <div
                key={n}
                className={`truncate px-2 py-1.5 text-[11px] ${i === 0 ? "bg-[rgb(var(--brand)/0.16)] font-semibold text-[rgb(var(--brand-line))]" : "text-[rgb(var(--sidebar-text)/0.75)]"}`}
                style={controlRadius}
              >
                {rail ? n[0] : n}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            {/* header */}
            <div
              className="flex items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--header-bg))] px-3 text-[rgb(var(--header-text))]"
              style={{ height: Math.round(layout.headerHeight * 0.62) }}
            >
              <span className="text-xs font-semibold">{branding.siteName}</span>
              <span className="text-[10px] opacity-70">{draft.mode.allowToggle ? "☾ toggle on" : "toggle off"}</span>
            </div>

            <div className="space-y-3 p-3" style={{ maxWidth: CONTAINERS[layout.containerWidth]?.value === "100%" ? undefined : 460 }}>
              <div className={`${box} p-3`} style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
                <p className="text-lg leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: "var(--heading-weight)" }}>
                  Orders overview
                </p>
                <p className="mt-0.5 text-[11px] text-[rgb(var(--ink)/0.6)]">Body text uses your body font and weight.</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="bg-[rgb(var(--btn-bg))] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--btn-text))]" style={btn}>Primary</span>
                  <span className="bg-[rgb(var(--secondary))] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--secondary-text))]" style={btn}>Secondary</span>
                  <span className="border border-[rgb(var(--border))] px-2.5 py-1 text-[11px]" style={btn}>Outline</span>
                  <span className="bg-[rgb(var(--danger))] px-2.5 py-1 text-[11px] font-semibold text-white" style={btn}>Delete</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                  <span className="rounded-full bg-[rgb(var(--success)/0.14)] px-2 py-0.5 text-[rgb(var(--success-text))]">Delivered</span>
                  <span className="rounded-full bg-[rgb(var(--warning)/0.16)] px-2 py-0.5 text-[rgb(var(--warning-text))]">Pending</span>
                  <span className="rounded-full bg-[rgb(var(--danger)/0.12)] px-2 py-0.5 text-[rgb(var(--danger-text))]">Failed</span>
                </div>
              </div>

              <div className={`${box} overflow-hidden`} style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-[rgb(var(--page-bg))] text-[rgb(var(--ink)/0.65)]">
                      <th className="px-3 py-1.5 font-semibold">Order</th>
                      <th className="px-3 py-1.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[["#1042", "Delivered"], ["#1043", "Pending"], ["#1044", "Delivered"]].map(([a, b]) => (
                      <tr key={a}>
                        <td className="px-3 py-1.5">{a}</td>
                        <td className="px-3 py-1.5">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {footer.show && (
              <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] px-3 py-2 text-[10px] text-[rgb(var(--ink)/0.6)]">
                {fillTokens(footer.copyright, draft)}
                {(footer.supportEmail || footer.supportPhone) && ` · ${[footer.supportEmail, footer.supportPhone].filter(Boolean).join(" · ")}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export default function ThemeSettings({ notify }) {
  const { theme, mode: appMode, source, saveTheme, resetTheme, isVendor } = useTheme();
  const [draft, setDraft] = useState(theme);
  const [tab, setTab] = useState("branding");
  const [previewMode, setPreviewMode] = useState(appMode);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const prevTheme = useRef(theme);

  // Follow the saved theme, unless the person is mid-edit.
  useEffect(() => {
    setDraft((d) => (JSON.stringify(d) === JSON.stringify(prevTheme.current) ? theme : d));
    prevTheme.current = theme;
  }, [theme]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(theme);
  const allValid = COLOR_FIELDS.every((f) => isHex(draft.colors[f.key]));
  const isDefault = JSON.stringify(theme) === JSON.stringify(normalizeTheme(DEFAULT_THEME));

  const setIn = (section, key) => (value) => setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
  const setColor = (key, value) =>
    setDraft((d) => ({ ...d, preset: "custom", colors: { ...d.colors, [key]: value } }));
  const setSocial = (key) => (value) =>
    setDraft((d) => ({ ...d, footer: { ...d.footer, social: { ...d.footer.social, [key]: value } } }));
  const pickPreset = (key) =>
    setDraft((d) => ({ ...d, preset: key, colors: { ...d.colors, ...presetColors(key) } }));

  const report = (result, okMessage) => {
    if (result.remote) notify(okMessage);
    else {
      const why = result.error?.response?.data?.message;
      notify(`Applied on this device, but the server didn't accept the save — other browsers won't see it yet.${why ? ` (${why})` : ""}`, "error");
    }
  };

  const save = async () => {
    setSaving(true);
    const result = await saveTheme(draft);
    setSaving(false);
    report(result, isVendor ? "Saved — your panel now uses this look." : "Theme saved — Super Admin and Vendor panels now use it.");
  };

  const reset = async () => {
    if (!window.confirm(isVendor ? "Go back to the standard look set by the marketplace?" : "Reset the whole theme to the default look?")) return;
    setSaving(true);
    const result = await resetTheme();
    setSaving(false);
    report(result, "Theme reset to the default.");
  };

  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "panel-theme.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importTheme = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== "object") throw new Error("bad file");
        setDraft({ ...normalizeTheme(data), preset: "custom" });
        notify("Theme file loaded. Review it, then save.");
      } catch {
        notify("That file isn't a valid theme.", "error");
      }
    };
    reader.readAsText(file);
  };

  const warnings = [];
  if (isHex(draft.colors.buttonBg) && isHex(draft.colors.buttonText) && contrast(draft.colors.buttonBg, draft.colors.buttonText) < 3)
    warnings.push(`Button text on the button background has a contrast of ${contrast(draft.colors.buttonBg, draft.colors.buttonText).toFixed(1)}:1 — labels may be hard to read.`);
  if (isHex(draft.colors.sidebarBg) && isHex(draft.colors.sidebarText) && contrast(draft.colors.sidebarBg, draft.colors.sidebarText) < 3)
    warnings.push(`Sidebar text on the sidebar background has a contrast of ${contrast(draft.colors.sidebarBg, draft.colors.sidebarText).toFixed(1)}:1.`);
  if (isHex(draft.colors.headerBg) && isHex(draft.colors.headerText) && contrast(draft.colors.headerBg, draft.colors.headerText) < 3)
    warnings.push(`Header text on the header background has a contrast of ${contrast(draft.colors.headerBg, draft.colors.headerText).toFixed(1)}:1.`);
  if (isHex(draft.colors.surface) && isHex(draft.colors.text) && contrast(draft.colors.surface, draft.colors.text) < 4.5)
    warnings.push(`Text colour on the card surface has a contrast of ${contrast(draft.colors.surface, draft.colors.text).toFixed(1)}:1.`);

  const groups = [...new Set(COLOR_FIELDS.map((f) => f.group))];
  const fontOptions = Object.entries(FONTS).map(([value, f]) => ({ value, label: f.label }));
  const opts = (obj) => Object.entries(obj).map(([value, o]) => ({ value, label: o.label }));

  const sourceLabel = {
    loading: "Loading saved theme…",
    server: "Loaded from the server",
    device: "Using the copy saved on this device (server unreachable or empty)",
    default: "Using built-in defaults (no saved theme found)",
  }[source];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
      <div className="min-w-0 space-y-6">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto bg-white p-1 ring-1 ring-stone-200" style={controlRadius} role="tablist">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium transition ${
                tab === t.key ? "bg-stone-100 text-slate-900 shadow-sm ring-1 ring-[rgb(var(--brand-line)/0.4)]" : "text-slate-500 hover:text-slate-900"
              }`}
              style={controlRadius}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "branding" && (
          <Panel title="Branding" description="Shown in the sidebar, browser tab and on the sign-in page — for both panels.">
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <TextField label="Site name" value={draft.branding.siteName} onChange={setIn("branding", "siteName")} maxLength={60} hint="Sidebar, sign-in page and browser tab title." />
              <TextField label="Tagline" value={draft.branding.tagline} onChange={setIn("branding", "tagline")} maxLength={80} hint="Small line under the site name." />
              <ImageField label="Logo" value={draft.branding.logo} onChange={setIn("branding", "logo")} maxSize={256} mime="image/png" hint="Square works best. Resized to 256 px." notify={notify} />
              <ImageField label="Favicon" value={draft.branding.favicon} onChange={setIn("branding", "favicon")} maxSize={64} mime="image/png" accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/*" previewClass="h-14 w-14" hint="PNG, SVG or ICO. Resized to 64 px." notify={notify} />
              <div className="sm:col-span-2">
                <ImageField label="Sign-in page image" value={draft.branding.loginImage} onChange={setIn("branding", "loginImage")} maxSize={1400} mime="image/jpeg" previewClass="h-24 w-40" hint="Shown beside the sign-in form on large screens. Resized to 1400 px." notify={notify} />
              </div>
            </div>
          </Panel>
        )}

        {tab === "colors" && (
          <>
            <Panel title="Presets" description="Start from a palette, then fine-tune below. Presets change brand, sidebar, background and card colours.">
              <div className="grid gap-3 p-6 sm:grid-cols-3">
                {Object.entries(PRESETS).map(([key, p]) => {
                  const active = draft.preset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pickPreset(key)}
                      aria-pressed={active}
                      className={`relative border bg-white p-3 text-left transition hover:border-[rgb(var(--brand-line))] ${
                        active ? "border-[rgb(var(--brand-line))] ring-2 ring-[rgb(var(--brand-line)/0.35)]" : "border-stone-200"
                      }`}
                      style={controlRadius}
                    >
                      <span className="flex h-8 overflow-hidden" style={controlRadius}>
                        {["primary", "primaryDark", "accent", "sidebarBg", "background"].map((k) => (
                          <span key={k} className="flex-1" style={{ backgroundColor: p.colors[k] }} />
                        ))}
                      </span>
                      <span className="mt-2 flex items-center justify-between text-sm font-medium text-slate-800">
                        {p.label}
                        {active && <Check size={14} className="text-[rgb(var(--brand-text))]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            {groups.map((g) => (
              <Panel key={g} title={g} description={g === "Surfaces" ? "Light-mode colours. Dark mode derives its own surfaces from the sidebar colour." : undefined}>
                <div className="grid gap-5 p-6 sm:grid-cols-2">
                  {COLOR_FIELDS.filter((f) => f.group === g).map((f) => (
                    <ColorField key={f.key} label={f.label} hint={f.hint} value={draft.colors[f.key]} onChange={(v) => setColor(f.key, v)} />
                  ))}
                </div>
              </Panel>
            ))}

            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((w) => (
                  <p key={w} className="flex items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" style={controlRadius}>
                    <AlertCircle size={14} className="mt-0.5 shrink-0" /> {w}
                  </p>
                ))}
                {isHex(draft.colors.buttonBg) && (
                  <button type="button" className={ghostButton} style={controlRadius} onClick={() => setColor("buttonText", autoText(draft.colors.buttonBg))}>
                    Auto-pick readable button text
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === "typography" && (
          <Panel title="Typography" description="Font families, base size and weights for the whole panel.">
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <SelectField label="Heading font" value={draft.typography.headingFont} onChange={setIn("typography", "headingFont")} options={fontOptions} hint={FONTS[draft.typography.headingFont]?.sample} />
              <SelectField label="Body font" value={draft.typography.bodyFont} onChange={setIn("typography", "bodyFont")} options={fontOptions} hint={FONTS[draft.typography.bodyFont]?.sample} />
              <Range label="Base font size" value={draft.typography.baseSize} min={13} max={19} unit=" px" onChange={setIn("typography", "baseSize")} hint="All text scales from this (16 px is the default)." />
              <SelectField
                label="Heading weight"
                value={String(draft.typography.headingWeight)}
                onChange={(v) => setIn("typography", "headingWeight")(Number(v))}
                options={[500, 600, 700, 800].map((w) => ({ value: String(w), label: `${w}` }))}
              />
              <SelectField
                label="Body weight"
                value={String(draft.typography.bodyWeight)}
                onChange={(v) => setIn("typography", "bodyWeight")(Number(v))}
                options={[300, 400, 500].map((w) => ({ value: String(w), label: `${w}` }))}
              />
              <div className="sm:col-span-2 bg-stone-50 p-4 ring-1 ring-stone-200" style={controlRadius}>
                <p className="text-3xl text-slate-900" style={{ fontFamily: FONTS[draft.typography.headingFont]?.stack, fontWeight: draft.typography.headingWeight }}>
                  Aa Heading sample
                </p>
                <p className="mt-1 text-sm text-slate-600" style={{ fontFamily: FONTS[draft.typography.bodyFont]?.stack, fontWeight: draft.typography.bodyWeight }}>
                  The quick brown fox jumps over the lazy dog — body text sample.
                </p>
              </div>
            </div>
          </Panel>
        )}

        {tab === "layout" && (
          <Panel title="Layout" description="Structure and spacing of the panel shell.">
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <Range label="Sidebar width" value={draft.layout.sidebarWidth} min={220} max={360} step={4} unit=" px" onChange={setIn("layout", "sidebarWidth")} />
              <Range label="Header height" value={draft.layout.headerHeight} min={52} max={96} step={2} unit=" px" onChange={setIn("layout", "headerHeight")} />
              <SelectField label="Container width" value={draft.layout.containerWidth} onChange={setIn("layout", "containerWidth")} options={opts(CONTAINERS)} hint="Maximum width of page content on wide screens." />
              <div className="flex items-center">
                <ToggleRow title="Sidebar collapsed by default" detail="Icon-only rail on desktop. People can still toggle it." checked={draft.layout.sidebarCollapsed} onChange={setIn("layout", "sidebarCollapsed")} />
              </div>
              <Segmented label="Corner style" value={draft.layout.radius} onChange={setIn("layout", "radius")} options={opts(RADII)} />
              <Segmented label="Spacing density" value={draft.layout.density} onChange={setIn("layout", "density")} options={opts(DENSITIES)} />
            </div>
          </Panel>
        )}

        {tab === "theme" && (
          <Panel title="Theme" description="Light / dark mode and component styles.">
            <div className="space-y-6 p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <Segmented label="Default mode" value={draft.mode.default} onChange={setIn("mode", "default")} options={opts(MODES)} />
                <ToggleRow title="Show light / dark toggle" detail="Adds a sun / moon button in the header. Each person's choice is remembered on their device." checked={draft.mode.allowToggle} onChange={setIn("mode", "allowToggle")} />
              </div>
              <div className="grid gap-6 border-t border-stone-200 pt-6 sm:grid-cols-2">
                <Segmented label="Button style" value={draft.components.buttonStyle} onChange={setIn("components", "buttonStyle")} options={opts(BUTTON_STYLES)} />
                <Segmented label="Card shadow" value={draft.components.cardShadow} onChange={setIn("components", "cardShadow")} options={opts(CARD_SHADOWS)} />
                <Segmented label="Table style" value={draft.components.tableStyle} onChange={setIn("components", "tableStyle")} options={opts(TABLE_STYLES)} />
              </div>
            </div>
          </Panel>
        )}

        {tab === "footer" && (
          <Panel title="Footer" description="Shown at the bottom of every page and on the sign-in page. Use {year} and {siteName} as placeholders.">
            <div className="space-y-6 p-6">
              <ToggleRow title="Show footer" checked={draft.footer.show} onChange={setIn("footer", "show")} />
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField label="Footer text" value={draft.footer.text} onChange={setIn("footer", "text")} maxLength={300} />
                </div>
                <div className="sm:col-span-2">
                  <TextField label="Copyright" value={draft.footer.copyright} onChange={setIn("footer", "copyright")} maxLength={200} />
                </div>
                <TextField label="Support email" type="email" value={draft.footer.supportEmail} onChange={setIn("footer", "supportEmail")} />
                <TextField label="Support phone" value={draft.footer.supportPhone} onChange={setIn("footer", "supportPhone")} />
              </div>
              <div className="grid gap-5 border-t border-stone-200 pt-6 sm:grid-cols-2">
                {Object.keys(draft.footer.social).map((k) => (
                  <TextField key={k} label={k === "twitter" ? "Twitter / X" : k[0].toUpperCase() + k.slice(1)} placeholder="https://" value={draft.footer.social[k]} onChange={setSocial(k)} />
                ))}
              </div>
            </div>
          </Panel>
        )}
      </div>

      <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
        <Panel title="Live preview" description={dirty ? "Unsaved changes" : "Matches what the panel shows now"}>
          <div className="p-5">
            <Preview draft={draft} mode={previewMode} onModeChange={setPreviewMode} />

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={save} disabled={!dirty || !allValid || saving} className={primaryButton} style={controlRadius}>
                <Save size={15} /> {saving ? "Saving…" : "Save & apply"}
              </button>
              <button type="button" onClick={() => setDraft(theme)} disabled={!dirty || saving} className={ghostButton} style={controlRadius}>
                Discard
              </button>
            </div>
            {!allValid && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle size={12} /> Fix the invalid colour values first.</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-200 pt-3">
              <button type="button" onClick={reset} disabled={(isDefault && !dirty) || saving} className={ghostButton} style={controlRadius}>
                <RotateCcw size={14} /> Reset to default
              </button>
              <button type="button" onClick={exportTheme} className={ghostButton} style={controlRadius}>
                <Download size={14} /> Export
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className={ghostButton} style={controlRadius}>
                <Upload size={14} /> Import
              </button>
              <input ref={fileRef} type="file" accept="application/json" onChange={importTheme} className="hidden" />
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
              <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {sourceLabel}
            </p>
          </div>
        </Panel>
      </aside>
    </div>
  );
}