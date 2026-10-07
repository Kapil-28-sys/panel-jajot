import React, { useState } from "react";
import {
  Banknote,
  CalendarClock,
  GripVertical,
  Info,
  Landmark,
  Gem,
  PieChart,
  ReceiptText,
  RotateCw,
  TrendingUp,
  Wallet,
  AlertCircle,
  Lock,
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

/* Solid palette colours for charts (same as Dashboard). */
const solids = ["rgb(var(--a1))", "rgb(var(--a2))", "rgb(var(--a3))", "rgb(var(--brand))"];

/* ---------- data (unchanged) ---------- */

const PAYOUT_TREND = [
  { label: "Feb", value: 62, muted: true },
  { label: "Mar", value: 78, muted: true },
  { label: "Apr", value: 55, muted: true },
  { label: "May", value: 90, muted: true },
  { label: "Jun", value: 70, muted: true },
  { label: "Jul", value: 100, muted: false },
];

const FEE_BREAKDOWN = [
  { name: "Referral fees", value: "₹18,420", pct: 42 },
  { name: "Fulfilment fees", value: "₹12,860", pct: 29 },
  { name: "Storage fees", value: "₹6,240", pct: 14 },
  { name: "Advertising spend", value: "₹6,680", pct: 15 },
];

const TRANSACTIONS = [
  { date: "16 Jul 2026", desc: "Order settlement — 408-1234567-8901234", type: "credit", label: "Credit", amount: "+ ₹1,499.00" },
  { date: "15 Jul 2026", desc: "Referral fee — B0C9XXXXX3", type: "debit", label: "Fee", amount: "− ₹149.90" },
  { date: "15 Jul 2026", desc: "FBA fulfilment fee — B0C9XXXXX2", type: "debit", label: "Fee", amount: "− ₹58.00" },
  { date: "14 Jul 2026", desc: "Refund to customer — 408-9988776-6554433", type: "debit", label: "Refund", amount: "− ₹1,499.00" },
  { date: "12 Jul 2026", desc: "Scheduled disbursement to bank ••1234", type: "pending", label: "Pending", amount: "₹42,180.00" },
];

const txnPill = {
  credit: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  debit: "bg-rose-50 text-rose-800 ring-rose-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
};

const SUMMARY = [
  {
    label: "Available balance",
    value: "₹42,180.00",
    icon: Wallet,
    palette: palettes[0],
    helper: "View balance details",
    backTitle: "Balance details",
    backRows: [
      { label: "Available now", value: "₹42,180.00", valueClass: gold },
      { label: "Reserved", value: "₹5,640.00" },
      { label: "Unresolved fees", value: "₹0.00" },
    ],
  },
  {
    label: "Next disbursement",
    value: "₹42,180.00",
    icon: CalendarClock,
    palette: palettes[1],
    helper: "Scheduled for 20 Jul 2026",
    backTitle: "Payout schedule",
    backRows: [
      { label: "Amount", value: "₹42,180.00", valueClass: gold },
      { label: "Date", value: "20 Jul 2026" },
      { label: "Bank account", value: "••1234" },
    ],
  },
  {
    label: "Reserved balance",
    value: "₹5,640.00",
    icon: Lock,
    palette: palettes[2],
    helper: "Why is this reserved?",
    backTitle: "About reserves",
    backRows: [
      { label: "Held amount", value: "₹5,640.00", valueClass: gold },
      { label: "Purpose", value: "Pending claims" },
    ],
  },
  {
    label: "Unresolved fees",
    value: "₹0.00",
    icon: AlertCircle,
    palette: palettes[3],
    helper: "No fees pending action",
    backTitle: "Fee status",
    backRows: [
      { label: "Pending action", value: "None", valueClass: gold },
      { label: "Fees, last 30 days", value: "₹44,200" },
    ],
  },
];

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

function SectionTitle({ icon: Icon, children, aside }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
        <Icon size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
        {children}
      </h2>
      {aside}
    </div>
  );
}

const Grip = () => <GripVertical size={16} className="shrink-0 text-slate-300" aria-hidden="true" />;

const textLink =
  "text-sm font-medium text-[rgb(var(--brand-text))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]";

/* ---------- page ---------- */

export default function FinanceWorkspace() {
  const maxBar = Math.max(...PAYOUT_TREND.map((p) => p.value));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Finance workspace
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Finance
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Track your balance, upcoming disbursements, fees, and recent transactions in one place.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={Banknote} value="₹42,180" label="available balance" />
              <GlanceStat icon={Landmark} value="20 Jul" label="next disbursement" />
              <GlanceStat icon={ReceiptText} value="128" label="transactions" />
            </div>
            <a href="#" className={textLink}>
              ✎ Explore with a canvas
            </a>
          </div>
        </div>
      </section>

      {/* Summary flip cards */}
      <section aria-label="Balance summary">
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
                  <span className="flex items-start justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                      {item.label}
                      <Info size={13} className="text-slate-400" aria-hidden="true" />
                    </span>
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
                  {item.backRows.map((row) => (
                    <BackRow key={row.label} {...row} />
                  ))}
                </>
              }
            />
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-2" aria-label="Disbursements and fees">
        {/* Payout trend */}
        <div className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7">
          <GoldLine className="inset-x-10" />
          <SectionTitle icon={TrendingUp} aside={<Grip />}>
            Disbursement trend
          </SectionTitle>
          <a className={`mt-1 inline-block ${textLink}`} href="#">
            View payment history
          </a>

          <div className="mt-5 flex h-40 items-end gap-3 px-1" role="img" aria-label="Disbursement amounts for the last six months">
            {PAYOUT_TREND.map((p) => (
              <div key={p.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className={`w-full max-w-[34px] rounded-t-[var(--radius-control)] ${
                    p.muted ? "bg-[rgb(var(--tint-300))]" : "bg-[rgb(var(--brand))]"
                  }`}
                  style={{ height: `${(p.value / maxBar) * 100}%` }}
                />
                <span className={`text-xs ${p.muted ? "text-slate-500" : "font-semibold text-slate-900"}`}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7">
          <GoldLine className="inset-x-10" />
          <SectionTitle icon={PieChart} aside={<Grip />}>
            Fee breakdown (last 30 days)
          </SectionTitle>
          <a className={`mt-1 inline-block ${textLink}`} href="#">
            Manage taxes &amp; fees
          </a>

          <div className="mt-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label="Fee share by category">
              {FEE_BREAKDOWN.map((f, index) => (
                <span
                  key={f.name}
                  className="h-full border-r border-white last:border-0"
                  style={{ width: `${f.pct}%`, backgroundColor: solids[index % solids.length] }}
                />
              ))}
            </div>

            <ul className="mt-5 space-y-3">
              {FEE_BREAKDOWN.map((f, index) => (
                <li key={f.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: solids[index % solids.length] }}
                    />
                    <span className="truncate text-slate-700">{f.name}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3">
                    <span className="font-semibold text-slate-900">{f.value}</span>
                    <span className="w-10 text-right text-xs text-slate-500">{f.pct}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Recent transactions */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />
        <div className="border-b border-stone-200 px-6 py-5">
          <SectionTitle icon={ReceiptText} aside={<Grip />}>
            Recent transactions
          </SectionTitle>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {TRANSACTIONS.map((t, i) => (
                <tr key={i} className="transition-colors hover:bg-stone-50">
                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">{t.date}</td>
                  <td className="px-6 py-4 text-slate-900">{t.desc}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-medium ring-1 ${txnPill[t.type]}`}
                    >
                      {t.label}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-6 py-4 text-right text-lg font-semibold ${
                      t.amount.startsWith("+")
                        ? "text-emerald-700"
                        : t.amount.startsWith("−")
                        ? "text-rose-700"
                        : "text-slate-900"
                    }`}
                    style={serif}
                  >
                    {t.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-6 py-3">
          <span className="text-xs text-slate-500">Showing 5 of 128 transactions</span>
          <a href="#" className={textLink}>
            View all transactions →
          </a>
        </div>
      </section>
    </div>
  );
}