import React, { useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gem,
  HandCoins,
  Landmark,
  LifeBuoy,
  Plus,
  RotateCw,
  Search,
  Wallet,
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
    front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]",
    back: "from-[rgb(var(--p4-b1))] to-[rgb(var(--p4-b2))]",
    chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]",
  },
];

/* ---------- data (unchanged) ---------- */

const TABS = [
  { key: "all", label: "All disbursements" },
  { key: "completed", label: "Completed" },
  { key: "processing", label: "Processing" },
  { key: "failed", label: "Failed" },
];

const PAYMENTS = [
  { id: "PYT-994211", date: "12 Jul 2026", period: "28 Jun – 11 Jul 2026", bank: "HDFC Bank ••1234", amount: "₹42,180.00", status: "completed" },
  { id: "PYT-993087", date: "28 Jun 2026", period: "14 Jun – 27 Jun 2026", bank: "HDFC Bank ••1234", amount: "₹38,940.00", status: "completed" },
  { id: "PYT-992014", date: "26 Jul 2026", period: "12 Jul – 25 Jul 2026", bank: "HDFC Bank ••1234", amount: "₹45,760.00", status: "processing" },
  { id: "PYT-990873", date: "14 Jun 2026", period: "31 May – 13 Jun 2026", bank: "HDFC Bank ••1234", amount: "₹31,200.00", status: "completed" },
  { id: "PYT-989440", date: "31 May 2026", period: "17 May – 30 May 2026", bank: "HDFC Bank ••1234", amount: "₹5,420.00", status: "failed" },
];

const statusMeta = {
  completed: { label: "Completed", pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  processing: { label: "Processing", pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  failed: { label: "Failed", pill: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
};

const SUMMARY = [
  {
    label: "Available balance",
    value: "₹42,180.00",
    icon: Wallet,
    palette: palettes[0],
    helper: "Next disbursement on 20 Jul 2026",
    backTitle: "Balance",
    backRows: [
      { label: "Available now", value: "₹42,180.00", valueClass: gold },
      { label: "Next disbursement", value: "20 Jul 2026" },
      { label: "Bank account", value: "HDFC ••1234" },
    ],
  },
  {
    label: "Total disbursed (last 90 days)",
    value: "₹1,63,500.00",
    icon: HandCoins,
    palette: palettes[1],
    helper: "Across 6 disbursements",
    backTitle: "Disbursement status",
    backRows: [
      { label: "Completed", value: PAYMENTS.filter((p) => p.status === "completed").length },
      { label: "Processing", value: PAYMENTS.filter((p) => p.status === "processing").length },
      { label: "Failed", value: PAYMENTS.filter((p) => p.status === "failed").length },
    ],
  },
  {
    label: "Disbursement cycle",
    value: "14 days",
    icon: CalendarClock,
    palette: palettes[2],
    helper: "Every 2nd & 4th week",
    backTitle: "Cycle details",
    backRows: [
      { label: "Frequency", value: "Every 14 days", valueClass: gold },
      { label: "Retry on failure", value: "3 business days" },
    ],
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

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7">
      <GoldLine className="inset-x-10" />
      <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
        <Icon size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ---------- page ---------- */

export default function ManagePayment() {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");

  const visible = activeTab === "all" ? PAYMENTS : PAYMENTS.filter((p) => p.status === activeTab);
  const filtered = visible.filter(
    (p) => p.id.toLowerCase().includes(query.toLowerCase()) || p.bank.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Payments
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Manage payment
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Follow your disbursements, bank accounts, and settlement periods in one place.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={Wallet} value="₹42,180" label="available balance" />
              <GlanceStat icon={CalendarClock} value="20 Jul" label="next disbursement" />
              <GlanceStat icon={Landmark} value={PAYMENTS.length} label="recent disbursements" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
              >
                Download statement
              </button>
              <button
                type="button"
                className="rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]"
              >
                Add bank account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Summary flip cards */}
      <section aria-label="Payment summary">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} />
          Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                  <span className="mt-auto block text-4xl font-semibold tracking-tight text-slate-900" style={serif}>
                    {item.value}
                  </span>
                  <span className="mt-0.5 block pr-6 text-xs text-slate-600">{item.helper}</span>
                </>
              }
              back={
                <>
                  <BackTitle>{item.backTitle}</BackTitle>
                  {item.backRows.map((row) => (
                    <BackRow key={row.label} {...row} />
                  ))}
                </>
              }
            />
          ))}
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Disbursements table */}
        <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
          <GoldLine className="inset-x-10" />

          {/* tabs */}
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

          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-6 py-4">
            <label className="relative block min-w-[220px] flex-1">
              <span className="sr-only">Search disbursements</span>
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by disbursement ID or bank account"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-full rounded-[var(--radius-control)] border border-stone-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]"
              />
            </label>
            {["Last 90 days", "Bank account"].map((label) => (
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
                No disbursements found
              </div>
              <div className="mt-1 text-sm text-slate-500">Try a different tab or search term.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Disbursement ID</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Settlement period</th>
                    <th className="px-6 py-3 font-semibold">Bank account</th>
                    <th className="px-6 py-3 text-right font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((p) => {
                    const meta = statusMeta[p.status];
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-stone-50">
                        <td className="px-6 py-4">
                          <a href="#" className="font-semibold text-[rgb(var(--brand-text))] hover:underline">
                            {p.id}
                          </a>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-700">{p.date}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-700">{p.period}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-700">{p.bank}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-lg font-semibold text-slate-900" style={serif}>
                          {p.amount}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-medium ring-1 ${meta.pill}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-6 py-3">
            <span className="text-xs text-slate-500">
              1–{filtered.length} of {filtered.length} disbursements
            </span>
            <div className="flex items-center gap-1 text-sm">
              <button type="button" disabled aria-label="Previous page" className="rounded-[var(--radius-control)] p-1 text-slate-300">
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-current="page"
                className="rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-2.5 py-1 font-medium text-white"
              >
                1
              </button>
              <button type="button" disabled aria-label="Next page" className="rounded-[var(--radius-control)] p-1 text-slate-300">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <div className="space-y-6">
          <Panel icon={Landmark} title="Bank accounts">
            <div className="flex items-center gap-3 rounded-[var(--radius-control)] border border-stone-200 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[rgb(var(--tint-100))] text-[rgb(var(--brand-text))]">
                <Landmark size={18} strokeWidth={1.6} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">HDFC Bank ••1234</div>
                <div className="mt-0.5 text-xs text-slate-500">Added 3 Jan 2026</div>
              </div>
              <span className="ml-auto rounded-[var(--radius-control)] bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                Default
              </span>
            </div>
            <a href="#" className={`mt-3 inline-flex items-center gap-1 ${textLink}`}>
              <Plus size={14} /> Add another bank account
            </a>
          </Panel>

          <Panel icon={LifeBuoy} title="Need help?">
            <p className="text-sm leading-relaxed text-slate-600">
              Disbursements are made to your default bank account on your set cycle. Failed disbursements are
              automatically retried within 3 business days.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <a href="#" className={textLink}>
                Read disbursement policy →
              </a>
              <a href="#" className={textLink}>
                Contact Seller Support →
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}