import { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Gem, Mail, Repeat, RotateCw, Search, ShieldAlert,
  TrendingUp, Users as UsersIcon,
} from "lucide-react";
import { customers, inr, vendorName, vendors } from "../../data/marketplaceData";

/**
 * Users.jsx
 * Styled to match the Dashboard (gold hairlines, serif display type, flip cards).
 * Data + filter logic unchanged. MetricCard and DataPager are replaced by
 * dashboard-style flip cards and an inline pager, so those imports are gone.
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
const inputClass =
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-2 focus:ring-[rgb(var(--brand-line)/0.3)]";

const statusClass = {
  Repeat: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Active: "bg-sky-50 text-sky-800 ring-sky-200",
  "Return Risk": "bg-rose-50 text-rose-800 ring-rose-200",
};

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

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

function Pager({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = "flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] border border-stone-300 bg-white hover:border-[rgb(var(--brand-line))] disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-6 py-3 text-xs text-slate-500">
      <div className="flex items-center gap-3">
        <span>Showing {from}–{to} of {total}</span>
        <label className="flex items-center gap-1.5">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-[rgb(var(--brand-line))]"
          >
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className={btn}>
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`h-7 min-w-[28px] rounded-[var(--radius-control)] border px-2 text-xs ${
              n === page
                ? "border-[rgb(var(--brand-line))] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] font-semibold text-white"
                : "border-stone-300 bg-white text-slate-700 hover:border-[rgb(var(--brand-line))]"
            }`}
          >
            {n}
          </button>
        ))}
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page" className={btn}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function Users() {
  const [vendorId, setVendorId] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const visibleCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const matchesVendor = vendorId === "all" || customer.vendorId === vendorId;
        const matchesQuery = `${customer.name} ${customer.email} ${vendorName(customer.vendorId)}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesVendor && matchesQuery;
      }),
    [query, vendorId]
  );

  const totalLtv = visibleCustomers.reduce((sum, customer) => sum + customer.ltv, 0);
  const repeatBuyers = visibleCustomers.filter((c) => c.status === "Repeat");
  const riskBuyers = visibleCustomers.filter((c) => c.status === "Return Risk");
  const topByLtv = [...visibleCustomers].sort((a, b) => b.ltv - a.ltv).slice(0, 3);
  const pagedCustomers = visibleCustomers.slice((page - 1) * pageSize, page * pageSize);

  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
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
              Customer insights
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Users and buyers
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              View customers attached to each vendor, their order history, and return risk.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={UsersIcon} value={visibleCustomers.length} label="customers in view" />
              <GlanceStat icon={Repeat} value={repeatBuyers.length} label="repeat buyers" />
              <GlanceStat icon={ShieldAlert} value={riskBuyers.length} label="return risk" />
            </div>
            <label className="w-full lg:w-72">
              <span className="sr-only">Vendor</span>
              <select
                value={vendorId}
                onChange={(event) => { setVendorId(event.target.value); setPage(1); }}
                className="w-full rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/80 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]"
              >
                <option value="all">All vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* Flip metric cards */}
      <section aria-label="Customer metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} /> Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          <StatFlipCard
            label="Visible customers" value={visibleCustomers.length} helper="buyers in current view" icon={UsersIcon} palette={palettes[1]}
            backTitle="Status split"
            rows={[
              { label: "Repeat", value: repeatBuyers.length },
              { label: "Active", value: visibleCustomers.filter((c) => c.status === "Active").length },
              { label: "Return risk", value: riskBuyers.length },
            ]}
          />
          <StatFlipCard
            label="Customer LTV" value={inr(totalLtv)} helper="combined lifetime value" icon={TrendingUp} palette={palettes[0]}
            backTitle="Top by lifetime value"
            rows={topByLtv.map((c) => ({ label: c.name, value: inr(c.ltv) }))}
          />
          <StatFlipCard
            label="Repeat buyers" value={repeatBuyers.length} helper="high-retention accounts" icon={Repeat} palette={palettes[2]}
            backTitle="Retention"
            rows={[
              { label: "Share of view", value: `${visibleCustomers.length ? Math.round((repeatBuyers.length / visibleCustomers.length) * 100) : 0}%` },
              { label: "Return risk", value: riskBuyers.length },
            ]}
          />
        </div>
      </section>

      {/* Customer list */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />
        <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
            <UsersIcon size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
            Customer list
            <span className="text-xs font-normal text-slate-500" style={{ fontFamily: "inherit" }}>{visibleCustomers.length} shown</span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search customers"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Customer</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Lifetime value</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {pagedCustomers.map((customer, index) => (
                <tr key={customer.id} className="transition-colors hover:bg-stone-50">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palettes[index % palettes.length].chip} text-base font-semibold text-white`}
                        style={serif}
                      >
                        {initials(customer.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{customer.name}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Mail size={12} className="text-[rgb(var(--brand-text))]" />
                          {customer.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{vendorName(customer.vendorId)}</td>
                  <td className="px-4 py-3.5 text-slate-700">{customer.orders}</td>
                  <td className="px-4 py-3.5 text-lg font-semibold text-[rgb(var(--brand-dark))]" style={serif}>{inr(customer.ltv)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${statusClass[customer.status] || "bg-stone-50 text-stone-700 ring-stone-200"}`}>
                      {customer.status}
                    </span>
                  </td>
                </tr>
              ))}
              {pagedCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-slate-500">
                    No customers match this view. Try another vendor or search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pager
          total={visibleCustomers.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={updatePageSize}
        />
      </section>
    </div>
  );
}