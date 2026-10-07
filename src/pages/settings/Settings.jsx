import { useEffect, useMemo, useState } from "react";
import {
  Bell, Check, CheckCircle2, Download, Gem, KeyRound, Lock, Palette, RotateCcw, Save,
  ShieldCheck, SlidersHorizontal, Store, Upload, UserCog, AlertCircle,
} from "lucide-react";
import ThemeSettings from "./ThemeSettings";
import PreviousVersionButton from "../../theme/PreviousVersionButton";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Settings.jsx
 * Sections: Appearance (see ThemeSettings.jsx), General, Roles & access,
 * Vendor rules, Notifications, Security.
 * Every colour here reads from the CSS variables set by ThemeProvider, so this page
 * re-themes together with the rest of the panel.
 */

/* ---------- tokens (all read from CSS variables) ---------- */

const displayFont = { fontFamily: "var(--font-display)" };
const cardRadius = { borderRadius: "var(--radius-card)" };
const controlRadius = { borderRadius: "var(--radius-control)" };

const brandGradient = "bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]";
const primaryButton = `inline-flex items-center justify-center gap-1.5 ${brandGradient} px-4 py-2 text-sm font-medium text-white ring-1 ring-[rgb(var(--brand-line)/0.6)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`;
const ghostButton =
  "inline-flex items-center gap-1.5 border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[rgb(var(--brand-line))] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "w-full border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-2 focus:ring-[rgb(var(--brand-line)/0.3)]";

/* ---------- data ---------- */

const TABS = [
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "general", label: "General", icon: Store },
  { key: "roles", label: "Roles & access", icon: UserCog },
  { key: "rules", label: "Vendor rules", icon: ShieldCheck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Lock },
];

const ROLES = [
  { name: "Super Admin", access: "All vendors, billing, catalog moderation, reports", users: 2 },
  { name: "Vendor Admin", access: "Own products, orders, customers, revenue dashboard", users: 14 },
  { name: "Vendor Staff", access: "Inventory updates, order processing, support notes", users: 31 },
];

const MODULES = ["Vendors", "Products", "Orders", "Customers", "Revenue", "Catalog moderation", "Billing", "Reports", "Settings"];

const DEFAULT_MATRIX = {
  "Super Admin": Object.fromEntries(MODULES.map((m) => [m, true])),
  "Vendor Admin": Object.fromEntries(MODULES.map((m) => [m, ["Products", "Orders", "Customers", "Revenue", "Reports"].includes(m)])),
  "Vendor Staff": Object.fromEntries(MODULES.map((m) => [m, ["Products", "Orders"].includes(m)])),
};

const POLICIES = [
  "Vendors can only view their own orders, products, users, revenue, and performance.",
  "Superadmin can create vendors and review every vendor performance panel.",
  "Suppressed listings and low-stock alerts require vendor action before catalog approval.",
];

const DEFAULT_SETTINGS = {
  general: {
    marketplaceName: "My Marketplace",
    supportEmail: "support@example.com",
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    commission: 10,
    lowStock: 5,
  },
  matrix: DEFAULT_MATRIX,
  rules: {
    twoStep: true,
    orderIsolation: true,
    catalogApproval: true,
    autoSuppress: false,
    vendorSelfSignup: false,
  },
  notifications: {
    newVendor: true,
    newOrder: true,
    lowStock: true,
    suppressedListing: true,
    weeklyReport: false,
  },
  security: {
    sessionMinutes: 60,
    minPassword: 10,
    maxAttempts: 5,
    forceLogoutOnPasswordChange: true,
  },
};

const SETTINGS_KEY = "admin-panel-settings";

const loadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (!saved) return DEFAULT_SETTINGS;
    return {
      general: { ...DEFAULT_SETTINGS.general, ...saved.general },
      matrix: { ...DEFAULT_SETTINGS.matrix, ...saved.matrix },
      rules: { ...DEFAULT_SETTINGS.rules, ...saved.rules },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications },
      security: { ...DEFAULT_SETTINGS.security, ...saved.security },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/* ---------- building blocks ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`} />
  );
}

function Panel({ icon: Icon, title, description, children, action }) {
  return (
    <section className="relative overflow-hidden bg-white ring-1 ring-stone-200" style={cardRadius}>
      <GoldLine />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-6 py-5">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={displayFont}>
            <Icon size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
            {title}
          </h2>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
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

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[rgb(var(--brand))]" : "bg-stone-300"
      }`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function ToggleRow({ title, detail, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/* ---------- other sections ---------- */

function General({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });
  return (
    <Panel icon={Store} title="Marketplace details" description="Shown in emails, invoices and the storefront footer.">
      <div className="grid gap-5 p-6 sm:grid-cols-2">
        <Field label="Marketplace name">
          <input value={value.marketplaceName} onChange={set("marketplaceName")} className={inputClass} style={controlRadius} />
        </Field>
        <Field label="Support email">
          <input type="email" value={value.supportEmail} onChange={set("supportEmail")} className={inputClass} style={controlRadius} />
        </Field>
        <Field label="Currency">
          <select value={value.currency} onChange={set("currency")} className={inputClass} style={controlRadius}>
            {["INR", "USD", "EUR", "GBP", "AED"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Timezone">
          <select value={value.timezone} onChange={set("timezone")} className={inputClass} style={controlRadius}>
            {["Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York", "UTC"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Date format">
          <select value={value.dateFormat} onChange={set("dateFormat")} className={inputClass} style={controlRadius}>
            {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Default commission (%)" hint="Applied to new vendors unless overridden.">
          <input type="number" min="0" max="100" value={value.commission} onChange={set("commission")} className={inputClass} style={controlRadius} />
        </Field>
        <Field label="Low-stock threshold" hint="Vendors are alerted at or below this quantity.">
          <input type="number" min="0" value={value.lowStock} onChange={set("lowStock")} className={inputClass} style={controlRadius} />
        </Field>
      </div>
    </Panel>
  );
}

function Roles({ matrix, onChange }) {
  const toggle = (role, mod) => onChange({ ...matrix, [role]: { ...matrix[role], [mod]: !matrix[role][mod] } });
  return (
    <div className="space-y-6">
      <Panel icon={UserCog} title="Role access" description="Who can do what across the panel.">
        <div className="divide-y divide-stone-100">
          {ROLES.map((role) => (
            <div key={role.name} className="grid gap-3 px-6 py-4 md:grid-cols-[180px_1fr_90px] md:items-center">
              <p className="font-semibold text-slate-900">{role.name}</p>
              <p className="text-sm text-slate-500">{role.access}</p>
              <p className="text-sm font-semibold text-[rgb(var(--brand-text))]">{role.users} users</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={KeyRound} title="Permission matrix" description="Super Admin always keeps full access.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-[rgb(var(--brand)/0.08)] text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Module</th>
                {ROLES.map((r) => <th key={r.name} className="px-4 py-3 text-center">{r.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {MODULES.map((mod) => (
                <tr key={mod} className="hover:bg-stone-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{mod}</td>
                  {ROLES.map((r) => (
                    <td key={r.name} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${r.name} can access ${mod}`}
                        checked={!!matrix[r.name]?.[mod]}
                        disabled={r.name === "Super Admin"}
                        onChange={() => toggle(r.name, mod)}
                        className="h-4 w-4 cursor-pointer accent-[rgb(var(--brand))] disabled:cursor-not-allowed"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Rules({ value, onChange }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Panel icon={ShieldCheck} title="Marketplace safeguards" description="Applied to every vendor account.">
        <div className="divide-y divide-stone-100">
          <ToggleRow title="Two-step vendor login" detail="Required for every seller account" checked={value.twoStep} onChange={set("twoStep")} />
          <ToggleRow title="Order data isolation" detail="Vendor scoped by vendorId" checked={value.orderIsolation} onChange={set("orderIsolation")} />
          <ToggleRow title="Catalog approval" detail="Manual review for restricted categories" checked={value.catalogApproval} onChange={set("catalogApproval")} />
          <ToggleRow title="Auto-suppress incomplete listings" detail="Hide listings missing price, image or stock until fixed" checked={value.autoSuppress} onChange={set("autoSuppress")} />
          <ToggleRow title="Vendor self sign-up" detail="Off means only a Super Admin can create vendors" checked={value.vendorSelfSignup} onChange={set("vendorSelfSignup")} />
        </div>
      </Panel>

      <Panel icon={ShieldCheck} title="Vendor panel rules" description="Policies enforced by the platform.">
        <div className="space-y-3 p-6">
          {POLICIES.map((p) => (
            <div key={p} className="border border-stone-200 bg-[rgb(var(--brand)/0.05)] p-3 text-sm text-slate-800" style={controlRadius}>{p}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Notifications({ value, onChange }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  return (
    <Panel icon={Bell} title="Email notifications" description="Sent to Super Admins.">
      <div className="divide-y divide-stone-100">
        <ToggleRow title="New vendor registered" checked={value.newVendor} onChange={set("newVendor")} />
        <ToggleRow title="New order placed" checked={value.newOrder} onChange={set("newOrder")} />
        <ToggleRow title="Low-stock alerts" detail="Uses the threshold in General" checked={value.lowStock} onChange={set("lowStock")} />
        <ToggleRow title="Suppressed listings" checked={value.suppressedListing} onChange={set("suppressedListing")} />
        <ToggleRow title="Weekly performance report" detail="Every Monday morning" checked={value.weeklyReport} onChange={set("weeklyReport")} />
      </div>
    </Panel>
  );
}

function Security({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: Number(e.target.value) });
  return (
    <Panel icon={Lock} title="Sign-in and sessions" description="Applies to all admin and vendor accounts.">
      <div className="grid gap-5 p-6 sm:grid-cols-3">
        <Field label="Session timeout">
          <select value={value.sessionMinutes} onChange={set("sessionMinutes")} className={inputClass} style={controlRadius}>
            {[15, 30, 60, 240, 720].map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60} hour${m > 60 ? "s" : ""}` : `${m} minutes`}</option>)}
          </select>
        </Field>
        <Field label="Minimum password length">
          <input type="number" min="8" max="64" value={value.minPassword} onChange={set("minPassword")} className={inputClass} style={controlRadius} />
        </Field>
        <Field label="Lock after failed attempts">
          <input type="number" min="3" max="20" value={value.maxAttempts} onChange={set("maxAttempts")} className={inputClass} style={controlRadius} />
        </Field>
      </div>
      <div className="border-t border-stone-200">
        <ToggleRow
          title="Sign out everywhere after a password change"
          detail="Ends all other sessions for that account"
          checked={value.forceLogoutOnPasswordChange}
          onChange={(v) => onChange({ ...value, forceLogoutOnPasswordChange: v })}
        />
      </div>
    </Panel>
  );
}

/* ---------- page ---------- */

export default function Settings() {
  const [tab, setTab] = useState("appearance");
  const [saved, setSaved] = useState(loadSettings);
  const [draft, setDraft] = useState(saved);
  const [notice, setNotice] = useState(null);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const notify = (message, type = "success") => setNotice({ message, type });
  const { revision } = useTheme();

  const save = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(draft));
      // TODO: replace with your settings API call, e.g. await settingsApi.update(draft)
    } catch {
      notify("Couldn't save settings in this browser.", "error");
      return;
    }
    setSaved(draft);
    notify("Settings saved.");
  };

  const part = (key) => (next) => setDraft((d) => ({ ...d, [key]: next }));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[rgb(var(--page-bg))] via-white to-[rgb(var(--brand)/0.14)] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10" style={cardRadius}>
        <GoldLine className="inset-x-16" />
        <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-text))]">
          <Gem size={14} strokeWidth={1.6} />
          Marketplace configuration
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={displayFont}>
          Settings
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
          Control how the panel looks, who can access what, and the safeguards that protect every vendor.
        </p>
        <div className="mt-6 inline-flex max-w-full gap-1 overflow-x-auto bg-white/70 p-1 ring-1 ring-stone-200" style={controlRadius} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium transition ${
                tab === t.key ? "bg-white text-slate-900 shadow-sm ring-1 ring-[rgb(var(--brand-line)/0.4)]" : "text-slate-500 hover:text-slate-900"
              }`}
              style={controlRadius}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {tab === "appearance" && (
        <>
          <div className="mb-4 flex justify-end">
            <PreviousVersionButton notify={notify} />
          </div>
          <ThemeSettings key={revision} notify={notify} />
        </>
      )}
      {tab === "general" && <General value={draft.general} onChange={part("general")} />}
      {tab === "roles" && <Roles matrix={draft.matrix} onChange={part("matrix")} />}
      {tab === "rules" && <Rules value={draft.rules} onChange={part("rules")} />}
      {tab === "notifications" && <Notifications value={draft.notifications} onChange={part("notifications")} />}
      {tab === "security" && <Security value={draft.security} onChange={part("security")} />}

      {/* Save bar for every tab except Appearance (which has its own Apply) */}
      {tab !== "appearance" && (
        <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 bg-white/95 px-5 py-3 shadow-xl ring-1 ring-[rgb(var(--brand-line)/0.5)] backdrop-blur" style={cardRadius}>
          <p className="text-sm text-slate-600">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDraft(saved)} disabled={!dirty} className={ghostButton} style={controlRadius}>
              Discard
            </button>
            <button type="button" onClick={save} disabled={!dirty} className={primaryButton} style={controlRadius}>
              <Save size={15} /> Save settings
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-[var(--radius-card)] px-5 py-3.5 text-sm font-medium text-white shadow-2xl ring-1 ring-[rgb(var(--brand-line)/0.5)] ${
            notice.type === "success" ? "bg-[rgb(var(--ink))]" : "bg-rose-700"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 size={16} className="text-[rgb(var(--brand-line))]" /> : <AlertCircle size={16} />}
          {notice.message}
        </div>
      )}
    </div>
  );
}