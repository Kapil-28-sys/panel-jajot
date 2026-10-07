import React, { useState } from "react";
import {
  AlertTriangle,
  BadgePercent,
  CalendarClock,
  Check,
  ChevronDown,
  FileCheck2,
  Gem,
  LifeBuoy,
  ListChecks,
  Receipt,
  RotateCw,
  ShieldCheck,
  Table2,
} from "lucide-react";

/* ---------- design tokens (same CSS variables as the Dashboard) ---------- */

const serif = { fontFamily: "var(--font-display)" };
const gold = "text-[rgb(var(--brand-on-dark))]";

const palettes = [
  {
    front: "from-[rgb(var(--a1-f1))] via-[rgb(var(--a1-f2))] to-[rgb(var(--a1-f3))]",
    back: "from-[rgb(var(--a1-b1))] to-[rgb(var(--a1-b2))]",
    chip: "from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))]",
  },
  {
    front: "from-[rgb(var(--a2-f1))] via-[rgb(var(--a2-f2))] to-[rgb(var(--a2-f3))]",
    back: "from-[rgb(var(--a2-b1))] to-[rgb(var(--a2-b2))]",
    chip: "from-[rgb(var(--a2))] to-[rgb(var(--a2-dark))]",
  },
  {
    front: "from-[rgb(var(--a3-f1))] via-[rgb(var(--a3-f2))] to-[rgb(var(--a3-f3))]",
    back: "from-[rgb(var(--a3-b1))] to-[rgb(var(--a3-b2))]",
    chip: "from-[rgb(var(--a3))] to-[rgb(var(--a3-dark))]",
  },
  {
    front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]",
    back: "from-[rgb(var(--p4-b1))] to-[rgb(var(--p4-b2))]",
    chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]",
  },
];

/* ---------- data (unchanged) ---------- */

const TABS = [
  { key: "all", label: "All filings" },
  { key: "filed", label: "Filed" },
  { key: "due", label: "Due" },
  { key: "overdue", label: "Overdue" },
];

const FILINGS = [
  { period: "Jun 2026", type: "GSTR-1", dueDate: "11 Jul 2026", filedOn: "9 Jul 2026", status: "filed" },
  { period: "Jun 2026", type: "GSTR-3B", dueDate: "20 Jul 2026", filedOn: "—", status: "due" },
  { period: "May 2026", type: "GSTR-1", dueDate: "11 Jun 2026", filedOn: "10 Jun 2026", status: "filed" },
  { period: "May 2026", type: "GSTR-3B", dueDate: "20 Jun 2026", filedOn: "18 Jun 2026", status: "filed" },
  { period: "Apr 2026", type: "GSTR-3B", dueDate: "20 May 2026", filedOn: "—", status: "overdue" },
];

const RATE_BREAKDOWN = [
  { category: "Apparel & clothing", rate: "5%", taxable: "₹1,24,300", tax: "₹6,215" },
  { category: "Electronics accessories", rate: "18%", taxable: "₹86,400", tax: "₹15,552" },
  { category: "Home & kitchen", rate: "12%", taxable: "₹42,900", tax: "₹5,148" },
  { category: "Footwear (under ₹1000)", rate: "5%", taxable: "₹18,200", tax: "₹910" },
];

const statusMeta = {
  filed: { label: "Filed", pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  due: { label: "Due", pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  overdue: { label: "Overdue", pill: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
};

const CHECKLIST = [
  { text: "GSTIN verified", sub: "Confirmed on 3 Jan 2026", done: true },
  { text: "PAN linked", sub: "Matches business registration", done: true },
  { text: "GSTR-3B for Jun 2026 pending", sub: "Due 20 Jul 2026", done: false },
];

const filingCount = (status) => FILINGS.filter((f) => f.status === status).length;

const SUMMARY = [
  {
    label: "Tax collected (this month)",
    value: "₹27,825.00",
    icon: Receipt,
    palette: palettes[0],
    helper: "1–16 Jul 2026",
    backTitle: "Tax by rate",
    backRows: RATE_BREAKDOWN.map((r) => ({ label: `${r.category} (${r.rate})`, value: r.tax })),
  },
  {
    label: "Next filing due",
    value: "GSTR-3B",
    icon: CalendarClock,
    palette: palettes[1],
    helper: "Due 20 Jul 2026",
    backTitle: "Filing status",
    backRows: [
      { label: "Filed", value: filingCount("filed") },
      { label: "Due", value: filingCount("due") },
      { label: "Overdue", value: filingCount("overdue"), valueClass: "text-rose-300" },
    ],
  },
  {
    label: "TCS deducted by Amazon",
    value: "₹4,218.00",
    icon: BadgePercent,
    palette: palettes[3],
    helper: "Last 30 days",
    backTitle: "About TCS",
    backRows: [
      { label: "Deducted", value: "₹4,218.00", valueClass: gold },
      { label: "Period", value: "Last 30 days" },
    ],
  },
  {
    label: "Overdue filings",
    value: filingCount("overdue"),
    icon: AlertTriangle,
    palette: palettes[2],
    helper: "Review now",
    backTitle: "Overdue",
    backRows: FILINGS.filter((f) => f.status === "overdue").map((f) => ({
      label: `${f.type}, ${f.period}`,
      value: `Due ${f.dueDate}`,
    })),
  },
];

const textLink =
  "text-sm font-medium text-[rgb(var(--brand-text))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]";

/* ---------- building blocks (same look as Dashboard) ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
    />
  );
}

function FlipCard({ label, palette, front, back, className = "h-44" }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`${className} transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
      style={{ perspective: "1400px" }}
    >
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={`${label}: ${flipped ? "show summary" : "show details"}`}
        onClick={() => setFlipped((value) => !value)}
        className="relative block h-full w-full rounded-[var(--radius-card)] text-left transition-transform duration-[800ms] ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--brand-line))] motion-reduce:transition-none"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <span
          aria-hidden={flipped}
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br ${palette.front} p-5 text-slate-900 ring-1 ring-[rgb(var(--brand-line)/0.35)]`}
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <GoldLine />
          <span className="relative flex h-full flex-col">{front}</span>
          <RotateCw size={12} className="absolute bottom-4 right-4 text-slate-400" aria-hidden="true" />
        </span>

        <span
          aria-hidden={!flipped}
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br ${palette.back} p-5 text-white ring-1 ring-[rgb(var(--brand-line)/0.5)]`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <GoldLine />
          <span className="relative flex h-full flex-col">{back}</span>
        </span>
      </button>
    </div>
  );
}

function IconChip({ icon: Icon, palette, size = 18 }) {
  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-white`}>
      <Icon size={size} strokeWidth={1.6} />
    </span>
  );
}

function BackTitle({ children }) {
  return (
    <span className={`mb-2 block text-xl font-semibold leading-tight ${gold}`} style={serif}>
      {children}
    </span>
  );
}

function BackRow({ label, value, valueClass = "text-white" }) {
  return (
    <span className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5 text-sm last:border-0">
      <span className="truncate text-white/60">{label}</span>
      <span className={`shrink-0 font-semibold ${valueClass}`}>{value}</span>
    </span>
  );
}

function GlanceStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3 px-5 first:pl-0 last:pr-0">
      <Icon size={18} strokeWidth={1.5} className="text-[rgb(var(--brand-text))]" />
      <div>
        <p className="text-2xl font-semibold leading-none text-slate-900" style={serif}>
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7">
      <GoldLine className="inset-x-10" />
      <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
        <Icon size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ---------- page ---------- */

export default function ManageTaxes() {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = activeTab === "all" ? FILINGS : FILINGS.filter((f) => f.status === activeTab);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Tax compliance
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Manage taxes
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Keep your GSTIN, filings, and tax collected up to date and avoid filing mismatches.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={FileCheck2} value={filingCount("filed")} label="filings done" />
              <GlanceStat icon={CalendarClock} value={filingCount("due")} label="due soon" />
              <GlanceStat icon={AlertTriangle} value={filingCount("overdue")} label="overdue" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
              >
                Download tax report
              </button>
              <button
                type="button"
                className="rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]"
              >
                Update GSTIN
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* GSTIN card */}
      <section className="relative flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-stone-200 sm:px-7">
        <GoldLine className="inset-x-10" />
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-emerald-50 text-emerald-700">
            <ShieldCheck size={22} strokeWidth={1.5} />
          </span>
          <div>
            <div className="text-2xl font-semibold text-slate-900" style={serif}>
              08ABCDE1234F1Z5
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Registered as Apex Distributors Pvt Ltd, Rajasthan</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Verified
        </span>
      </section>

      {/* Summary flip cards */}
      <section aria-label="Tax summary">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} />
          Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY.map((item) => (
            <FlipCard
              key={item.label}
              label={item.label}
              palette={item.palette}
              front={
                <>
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-slate-600">{item.label}</span>
                    <IconChip icon={item.icon} palette={item.palette} />
                  </span>
                  <span className="mt-auto block text-3xl font-semibold tracking-tight text-slate-900" style={serif}>
                    {item.value}
                  </span>
                  <span className="mt-0.5 block pr-6 text-xs text-slate-600">{item.helper}</span>
                </>
              }
              back={
                <>
                  <BackTitle>{item.backTitle}</BackTitle>
                  {item.backRows.length === 0 ? (
                    <span className="text-sm text-white/60">Nothing to show.</span>
                  ) : (
                    item.backRows.map((row) => <BackRow key={row.label} {...row} />)
                  )}
                </>
              }
            />
          ))}
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Filings */}
          <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
            <GoldLine className="inset-x-10" />

            <div className="flex gap-1 overflow-x-auto border-b border-stone-200 px-4 pt-3">
              {TABS.map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    aria-pressed={active}
                    className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))] ${
                      active
                        ? "border-[rgb(var(--brand))] text-[rgb(var(--brand-text))]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-6 py-4">
              {["Financial year 2026–27", "Filing type"].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
                >
                  {label}
                  <ChevronDown size={12} />
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-lg font-semibold text-slate-900" style={serif}>
                  No filings found
                </div>
                <div className="mt-1 text-sm text-slate-500">Try a different tab.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-slate-600">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Period</th>
                      <th className="px-6 py-3 font-semibold">Filing type</th>
                      <th className="px-6 py-3 font-semibold">Due date</th>
                      <th className="px-6 py-3 font-semibold">Filed on</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((f, i) => {
                      const meta = statusMeta[f.status];
                      return (
                        <tr key={i} className="transition-colors hover:bg-stone-50">
                          <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">{f.period}</td>
                          <td className="px-6 py-4 text-slate-700">{f.type}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-700">{f.dueDate}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-700">{f.filedOn}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-medium ring-1 ${meta.pill}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <a className={textLink} href="#">
                              {f.status === "filed" ? "View filing" : "File now"}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Rate breakdown */}
          <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
            <GoldLine className="inset-x-10" />
            <div className="border-b border-stone-200 px-6 py-5">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
                <Table2 size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
                Tax rate breakdown
              </h2>
              <p className="mt-1 text-xs text-slate-500">By product category, current month</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Category</th>
                    <th className="px-6 py-3 text-right font-semibold">GST rate</th>
                    <th className="px-6 py-3 text-right font-semibold">Taxable value</th>
                    <th className="px-6 py-3 text-right font-semibold">Tax collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {RATE_BREAKDOWN.map((r) => (
                    <tr key={r.category} className="transition-colors hover:bg-stone-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{r.category}</td>
                      <td className="px-6 py-4 text-right text-slate-700">{r.rate}</td>
                      <td className="px-6 py-4 text-right text-slate-700">{r.taxable}</td>
                      <td className="px-6 py-4 text-right text-lg font-semibold text-slate-900" style={serif}>
                        {r.tax}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Panel icon={ListChecks} title="Compliance checklist">
            <ul className="divide-y divide-stone-100">
              {CHECKLIST.map((item) => (
                <li key={item.text} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      item.done
                        ? "bg-emerald-600 text-white"
                        : "border border-stone-300 bg-stone-100 text-transparent"
                    }`}
                    aria-label={item.done ? "Completed" : "Pending"}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{item.text}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{item.sub}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={LifeBuoy} title="Need help?">
            <p className="text-sm leading-relaxed text-slate-600">
              Amazon collects TCS on your behalf as per GST rules. Make sure your GSTIN and HSN codes are up to date to
              avoid filing mismatches.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <a href="#" className={textLink}>
                Read GST &amp; TCS policy →
              </a>
              <a href="#" className={textLink}>
                Contact tax support →
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}