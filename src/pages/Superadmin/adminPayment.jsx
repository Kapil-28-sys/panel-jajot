import { useState, useMemo } from "react";
import {
  Search, ChevronDown, X, Check, Eye, Download, Wallet, Clock, AlertCircle, Banknote,
  Ban, ArrowUpRight, ArrowDownRight, Gem, RotateCw, Receipt,
} from "lucide-react";

/**
 * PaymentsPage.jsx
 * Super Admin > Payments
 * Styled to match the Dashboard (gold hairlines, serif display type, flip cards).
 *
 * Wire-up notes (unchanged):
 * - Replace MOCK_PAYOUTS with GET /api/admin/payments/payouts
 * - Replace MOCK_TXNS with GET /api/admin/payments/payouts/:payoutId/transactions
 * - Approve/hold/retry actions should PATCH /api/admin/payments/payouts/:payoutId
 * - All requests use apiUrl() + authConfig() + adminToken, parsed with safeJson()
 * - invalidateTree() after status changes if payout totals feed the dashboard
 */

/* ---------- design tokens (same as Dashboard) ---------- */

const serif = { fontFamily: "var(--font-display)" };

const palettes = [
  { front: "from-[rgb(var(--a1-f1))] via-[rgb(var(--a1-f2))] to-[rgb(var(--a1-f3))]", back: "from-[rgb(var(--a1-b1))] to-[rgb(var(--a1-b2))]", chip: "from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))]" },
  { front: "from-[rgb(var(--a2-f1))] via-[rgb(var(--a2-f2))] to-[rgb(var(--a2-f3))]", back: "from-[rgb(var(--a2-b1))] to-[rgb(var(--a2-b2))]", chip: "from-[rgb(var(--a2))] to-[rgb(var(--a2-dark))]" },
  { front: "from-[rgb(var(--a3-f1))] via-[rgb(var(--a3-f2))] to-[rgb(var(--a3-f3))]", back: "from-[rgb(var(--a3-b1))] to-[rgb(var(--a3-b2))]", chip: "from-[rgb(var(--a3))] to-[rgb(var(--a3-dark))]" },
  { front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]", back: "from-[rgb(var(--p4-b1))] to-[rgb(var(--p4-b2))]", chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]" },
];

const gold = "text-[rgb(var(--brand-on-dark))]";
const goldButton =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2 text-sm font-medium text-white ring-1 ring-[rgb(var(--brand-line)/0.6)] transition hover:from-[rgb(var(--brand-hover))] hover:to-[rgb(var(--brand-dark-hover))] disabled:opacity-60";
const ghostButton =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-[rgb(var(--brand-line))] hover:bg-[rgb(var(--tint-50))] disabled:opacity-50";
const inputClass =
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-2 focus:ring-[rgb(var(--brand-line)/0.3)]";

/* ---------- data (mock) ---------- */

const MOCK_PAYOUTS = [
  { id: "po_9001", vendor: "Orion Electronics", store: "orion-electronics", period: "01 Jul – 15 Jul 2026", orders: 214, grossSales: 486200, commission: 48620, refunds: 9100, adjustments: -1200, netPayable: 427280, status: "paid", method: "Bank transfer", payoutDate: "18 Jul 2026" },
  { id: "po_9002", vendor: "Meadow & Co. Home", store: "meadow-home", period: "01 Jul – 15 Jul 2026", orders: 132, grossSales: 291800, commission: 29180, refunds: 4200, adjustments: 0, netPayable: 258420, status: "processing", method: "Bank transfer", payoutDate: "Scheduled 21 Jul 2026" },
  { id: "po_9003", vendor: "Kestrel Outdoors", store: "kestrel-outdoors", period: "01 Jul – 15 Jul 2026", orders: 41, grossSales: 78300, commission: 7830, refunds: 12100, adjustments: -2500, netPayable: 55870, status: "on_hold", method: "Bank transfer", payoutDate: "On hold — document review" },
  { id: "po_9004", vendor: "Lumen Beauty Lab", store: "lumen-beauty", period: "01 Jul – 15 Jul 2026", orders: 87, grossSales: 156400, commission: 15640, refunds: 3100, adjustments: 0, netPayable: 137660, status: "failed", method: "Bank transfer", payoutDate: "Failed 19 Jul 2026" },
  { id: "po_9005", vendor: "Northbound Coffee Roasters", store: "northbound-coffee", period: "01 Jul – 15 Jul 2026", orders: 305, grossSales: 612900, commission: 61290, refunds: 6700, adjustments: 800, netPayable: 545710, status: "pending", method: "Bank transfer", payoutDate: "Scheduled 21 Jul 2026" },
];

const MOCK_TXNS = [
  { id: "ord_4471", type: "Order", amount: 2400, date: "03 Jul 2026" },
  { id: "ord_4488", type: "Order", amount: 1850, date: "05 Jul 2026" },
  { id: "rfd_1129", type: "Refund", amount: -650, date: "07 Jul 2026" },
  { id: "ord_4502", type: "Order", amount: 3200, date: "09 Jul 2026" },
  { id: "fee_0091", type: "Commission fee", amount: -320, date: "09 Jul 2026" },
  { id: "ord_4519", type: "Order", amount: 1990, date: "12 Jul 2026" },
];

const STATUS_META = {
  paid: { label: "Paid", style: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  processing: { label: "Processing", style: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  pending: { label: "Pending", style: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  on_hold: { label: "On hold", style: "bg-stone-100 text-stone-700 ring-stone-300", dot: "bg-stone-400" },
  failed: { label: "Failed", style: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
};

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function formatCompact(n) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : formatCurrency(n);
}

/* ---------- building blocks ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`} />
  );
}

function FlipCard({ label, palette, front, back, className = "h-40" }) {
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
        onClick={() => setFlipped((v) => !v)}
        className="relative block h-full w-full rounded-[var(--radius-card)] text-left transition-transform duration-[800ms] ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--brand-line))] motion-reduce:transition-none"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
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
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <GoldLine />
          <span className="relative flex h-full flex-col">{back}</span>
        </span>
      </button>
    </div>
  );
}

function BackRow({ label, value }) {
  return (
    <span className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5 text-sm last:border-0">
      <span className="truncate text-white/60">{label}</span>
      <span className="shrink-0 font-semibold text-white">{value}</span>
    </span>
  );
}

function StatFlipCard({ label, value, helper, icon: Icon, palette, backTitle, rows }) {
  return (
    <FlipCard
      label={label}
      palette={palette}
      front={
        <>
          <span className="flex items-start justify-between">
            <span className="text-sm font-medium text-slate-600">{label}</span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-white`}>
              <Icon size={18} strokeWidth={1.6} />
            </span>
          </span>
          <span className="mt-auto block truncate text-4xl font-semibold tracking-tight text-slate-900" style={serif}>{value}</span>
          <span className="mt-0.5 block pr-6 text-xs text-slate-600">{helper}</span>
        </>
      }
      back={
        <>
          <span className={`mb-2 block text-xl font-semibold leading-tight ${gold}`} style={serif}>{backTitle}</span>
          {rows.length === 0 ? (
            <span className="text-sm text-white/60">Nothing to show yet.</span>
          ) : (
            rows.map((r) => <BackRow key={r.label} {...r} />)
          )}
        </>
      }
    />
  );
}

function GlanceStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3 px-5 first:pl-0 last:pr-0">
      <Icon size={18} strokeWidth={1.5} className="text-[rgb(var(--brand-text))]" />
      <div>
        <p className="text-2xl font-semibold leading-none text-slate-900" style={serif}>{value}</p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${m.style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

/* ---------- page ---------- */

export default function PaymentsPage() {
  const [payouts, setPayouts] = useState(MOCK_PAYOUTS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [detail, setDetail] = useState(null); // payout object or null

  const filtered = useMemo(
    () =>
      payouts.filter((p) => {
        const matchesQuery = p.vendor.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [payouts, query, statusFilter]
  );

  const stats = useMemo(() => {
    const totalPayable = payouts.reduce((sum, p) => sum + p.netPayable, 0);
    const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.netPayable, 0);
    const pendingList = payouts.filter((p) => ["pending", "processing"].includes(p.status));
    const flaggedList = payouts.filter((p) => ["on_hold", "failed"].includes(p.status));
    const sumOf = (list) => list.reduce((s, p) => s + p.netPayable, 0);
    return {
      totalPayable,
      paid,
      pendingCount: pendingList.length,
      pendingAmount: sumOf(pendingList),
      flaggedCount: flaggedList.length,
      flaggedAmount: sumOf(flaggedList),
      commission: payouts.reduce((s, p) => s + p.commission, 0),
      refunds: payouts.reduce((s, p) => s + p.refunds, 0),
      pendingList,
      flaggedList,
    };
  }, [payouts]);

  const toggleSelected = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.id));

  const setStatus = (id, status, payoutDate) => {
    setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status, payoutDate: payoutDate ?? p.payoutDate } : p)));
    // TODO: PATCH `${apiUrl()}/admin/payments/payouts/${id}`
  };

  const bulkApprove = () => {
    setPayouts((prev) =>
      prev.map((p) =>
        selected.includes(p.id) && p.status !== "paid" ? { ...p, status: "processing", payoutDate: "Scheduled 21 Jul 2026" } : p
      )
    );
    setSelected([]);
  };

  const bulkHold = () => {
    setPayouts((prev) =>
      prev.map((p) => (selected.includes(p.id) ? { ...p, status: "on_hold", payoutDate: "On hold — manual review" } : p))
    );
    setSelected([]);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Settlement cycle: 01 Jul – 15 Jul 2026
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Payments
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Review vendor disbursements for the current settlement cycle, then approve or hold payouts.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={Wallet} value={formatCompact(stats.totalPayable)} label="total payable" />
              <GlanceStat icon={Clock} value={stats.pendingCount} label="awaiting payout" />
              <GlanceStat icon={AlertCircle} value={stats.flaggedCount} label="need attention" />
            </div>
            <button className={goldButton}>
              <Download size={14} /> Export settlement report
            </button>
          </div>
        </div>
      </section>

      {/* Flip stat cards */}
      <section aria-label="Payment metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} /> Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatFlipCard
            label="Total payable" value={formatCompact(stats.totalPayable)} helper="net across all vendors" icon={Wallet} palette={palettes[1]}
            backTitle="Cycle totals"
            rows={[
              { label: "Commission", value: formatCompact(stats.commission) },
              { label: "Refunds", value: formatCompact(stats.refunds) },
              { label: "Payouts", value: payouts.length },
            ]}
          />
          <StatFlipCard
            label="Already paid" value={formatCompact(stats.paid)} helper="settled to vendors" icon={Banknote} palette={palettes[0]}
            backTitle="Paid share"
            rows={[
              { label: "Share of payable", value: `${stats.totalPayable ? Math.round((stats.paid / stats.totalPayable) * 100) : 0}%` },
              { label: "Paid payouts", value: payouts.filter((p) => p.status === "paid").length },
            ]}
          />
          <StatFlipCard
            label="Pending / processing" value={stats.pendingCount} helper={`${formatCompact(stats.pendingAmount)} scheduled`} icon={Clock} palette={palettes[3]}
            backTitle="Next payouts"
            rows={stats.pendingList.slice(0, 3).map((p) => ({ label: p.vendor, value: formatCompact(p.netPayable) }))}
          />
          <StatFlipCard
            label="On hold / failed" value={stats.flaggedCount} helper={`${formatCompact(stats.flaggedAmount)} blocked`} icon={AlertCircle} palette={palettes[2]}
            backTitle="Needs review"
            rows={stats.flaggedList.slice(0, 3).map((p) => ({ label: p.vendor, value: STATUS_META[p.status].label }))}
          />
        </div>
      </section>

      {/* Payouts table */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />

        <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
            <Receipt size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
            Vendor payouts
            <span className="text-xs font-normal text-slate-500" style={{ fontFamily: "inherit" }}>{filtered.length} shown</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vendor name" className={`${inputClass} pl-9`} />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className={`${inputClass} appearance-none pr-9`}
                style={{ width: "auto" }}
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="on_hold">On hold</option>
                <option value="failed">Failed</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[rgb(var(--brand-line)/0.3)] bg-[rgb(var(--tint-50))] px-6 py-3 text-sm">
            <span className="font-medium text-slate-800">{selected.length} selected</span>
            <button onClick={bulkApprove} className="rounded-[var(--radius-control)] bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
              Approve payout
            </button>
            <button onClick={bulkHold} className="rounded-[var(--radius-control)] bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-200">
              Put on hold
            </button>
            <button onClick={() => setSelected([])} className="text-xs text-slate-500 hover:text-slate-800">Clear</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-left text-xs font-medium text-slate-500">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all visible payouts"
                    checked={allVisibleSelected}
                    onChange={() => setSelected(allVisibleSelected ? [] : filtered.map((p) => p.id))}
                    className="h-3.5 w-3.5 accent-[rgb(var(--brand))]"
                  />
                </th>
                <th className="px-3 py-3">Vendor</th>
                <th className="px-3 py-3">Period</th>
                <th className="px-3 py-3">Gross sales</th>
                <th className="px-3 py-3">Commission</th>
                <th className="px-3 py-3">Refunds</th>
                <th className="px-3 py-3">Net payable</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((p) => {
                const isSel = selected.includes(p.id);
                return (
                  <tr key={p.id} className={`transition-colors hover:bg-stone-50 ${isSel ? "bg-[rgb(var(--tint-50))]" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.vendor}`}
                        checked={isSel}
                        onChange={() => toggleSelected(p.id)}
                        className="h-3.5 w-3.5 accent-[rgb(var(--brand))]"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{p.vendor}</p>
                      <p className="text-xs text-slate-500">{p.orders} orders, {p.method}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{p.period}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(p.grossSales)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(p.commission)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(p.refunds)}</td>
                    <td className="px-3 py-3 text-lg font-semibold text-[rgb(var(--brand-dark))]" style={serif}>{formatCurrency(p.netPayable)}</td>
                    <td className="px-3 py-3">
                      <StatusPill status={p.status} />
                      <p className="mt-1 text-xs text-slate-400">{p.payoutDate}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDetail(p)} className={ghostButton + " py-1.5"}>
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-14 text-center text-slate-500">
                    No payouts match this search. Try another vendor name or status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payout detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
          <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] bg-white shadow-2xl ring-1 ring-[rgb(var(--brand-line)/0.5)]">
            <GoldLine className="inset-x-8" />

            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] px-6 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold leading-tight text-slate-900" style={serif}>{detail.vendor}</h2>
                <p className="text-xs text-slate-500">{detail.period}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={detail.status} />
                <button onClick={() => setDetail(null)} aria-label="Close" className="text-slate-400 hover:text-slate-800">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-card)] border border-stone-200 bg-[rgb(var(--tint-50))] p-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Gross sales</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(detail.grossSales)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Commission</p>
                  <p className="font-semibold text-slate-900">-{formatCurrency(detail.commission)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Refunds</p>
                  <p className="font-semibold text-slate-900">-{formatCurrency(detail.refunds)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Adjustments</p>
                  <p className="font-semibold text-slate-900">
                    {detail.adjustments >= 0 ? "+" : "-"}{formatCurrency(Math.abs(detail.adjustments))}
                  </p>
                </div>
                <div className="col-span-2 border-t border-[rgb(var(--brand-line)/0.3)] pt-3">
                  <p className="text-xs text-slate-500">Net payable</p>
                  <p className="text-3xl font-semibold text-[rgb(var(--brand-dark))]" style={serif}>{formatCurrency(detail.netPayable)}</p>
                </div>
              </div>

              {/* Transactions */}
              <div>
                <h3 className="mb-2 border-b border-stone-200 pb-1.5 text-xl font-semibold text-slate-900" style={serif}>
                  Transaction breakdown
                </h3>
                <div className="divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200">
                  {MOCK_TXNS.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] ${t.amount >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {t.amount >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{t.type}</p>
                          <p className="text-xs text-slate-500">{t.id}, {t.date}</p>
                        </div>
                      </div>
                      <span className={`font-semibold ${t.amount >= 0 ? "text-slate-900" : "text-rose-700"}`}>
                        {t.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(t.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button className={ghostButton + " w-full justify-center py-2.5 text-sm"}>
                <Download size={14} /> Download settlement statement
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-200 px-6 py-4">
              <button
                onClick={() => { setStatus(detail.id, "on_hold", "On hold — manual review"); setDetail(null); }}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50"
              >
                <Ban size={14} /> Put on hold
              </button>
              <button
                onClick={() => { setStatus(detail.id, "processing", "Scheduled 21 Jul 2026"); setDetail(null); }}
                className={goldButton}
              >
                <Check size={14} /> Approve payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}