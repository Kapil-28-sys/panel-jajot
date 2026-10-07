import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Gem,
  RotateCcw,
  RotateCw,
  Search,
  Timer,
  Truck,
} from "lucide-react";
import { inr, orders, vendorName, vendors } from "../../data/marketplaceData";
import DataPager from "../../components/common/DataPager";

/* Same design tokens as the Dashboard (CSS variables only, nothing new hardcoded). */
const serif = { fontFamily: "var(--font-display)" };
const gold = "text-[rgb(var(--brand-on-dark))]";

const palettes = {
  Pending: {
    front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]",
    back: "from-[rgb(var(--p4-b1))] to-[rgb(var(--p4-b2))]",
    chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]",
  },
  Shipped: {
    front: "from-[rgb(var(--a2-f1))] via-[rgb(var(--a2-f2))] to-[rgb(var(--a2-f3))]",
    back: "from-[rgb(var(--a2-b1))] to-[rgb(var(--a2-b2))]",
    chip: "from-[rgb(var(--a2))] to-[rgb(var(--a2-dark))]",
  },
  Delivered: {
    front: "from-[rgb(var(--a1-f1))] via-[rgb(var(--a1-f2))] to-[rgb(var(--a1-f3))]",
    back: "from-[rgb(var(--a1-b1))] to-[rgb(var(--a1-b2))]",
    chip: "from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))]",
  },
  Returned: {
    front: "from-[rgb(var(--a3-f1))] via-[rgb(var(--a3-f2))] to-[rgb(var(--a3-f3))]",
    back: "from-[rgb(var(--a3-b1))] to-[rgb(var(--a3-b2))]",
    chip: "from-[rgb(var(--a3))] to-[rgb(var(--a3-dark))]",
  },
};

const statusMeta = [
  { status: "Pending", icon: Timer, helper: "waiting to be packed" },
  { status: "Shipped", icon: Truck, helper: "on the way to customers" },
  { status: "Delivered", icon: CheckCircle2, helper: "completed orders" },
  { status: "Returned", icon: RotateCcw, helper: "sent back by customers" },
];

const statusClass = {
  Delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Shipped: "bg-sky-50 text-sky-800 ring-sky-200",
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  Returned: "bg-rose-50 text-rose-800 ring-rose-200",
};

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

function BackRow({ label, value }) {
  return (
    <span className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5 text-sm last:border-0">
      <span className="truncate text-white/60">{label}</span>
      <span className="shrink-0 font-semibold text-white">{value}</span>
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

/* ---------- page ---------- */

export default function Orders() {
  const [vendorId, setVendorId] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesVendor = vendorId === "all" || order.vendorId === vendorId;
        const matchesQuery = `${order.id} ${order.customer} ${order.status} ${vendorName(order.vendorId)}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesVendor && matchesQuery;
      }),
    [query, vendorId]
  );

  const pagedOrders = visibleOrders.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const orderValue = visibleOrders.reduce((sum, order) => sum + order.total, 0);
  const vendorCount = new Set(visibleOrders.map((order) => order.vendorId)).size;

  /* Back-of-card breakdown: orders per vendor for a given status. */
  const vendorRowsFor = (status) => {
    const counts = visibleOrders
      .filter((order) => order.status === status)
      .reduce((acc, order) => {
        acc[order.vendorId] = (acc[order.vendorId] || 0) + 1;
        return acc;
      }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
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
              Order operations
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Orders
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Track marketplace orders across vendors, fulfillment channels, and delivery status.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={ClipboardList} value={visibleOrders.length} label="matching orders" />
              <GlanceStat icon={Truck} value={inr(orderValue)} label="order value" />
              <GlanceStat icon={Gem} value={vendorCount} label={vendorCount === 1 ? "vendor" : "vendors"} />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <label className="sm:w-48">
                <span className="sr-only">Vendor</span>
                <select
                  value={vendorId}
                  onChange={(event) => {
                    setVendorId(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/80 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]"
                >
                  <option value="all">All vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative block sm:w-64">
                <span className="sr-only">Search orders</span>
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search orders"
                  className="w-full rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/80 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Status flip cards */}
      <section aria-label="Order status summary">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} />
          Select a card to see which vendors the orders belong to.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statusMeta.map((item) => {
            const palette = palettes[item.status];
            const count = visibleOrders.filter((order) => order.status === item.status).length;
            const rows = vendorRowsFor(item.status);
            return (
              <FlipCard
                key={item.status}
                label={item.status}
                palette={palette}
                front={
                  <>
                    <span className="flex items-start justify-between">
                      <span className="text-sm font-medium text-slate-600">{item.status}</span>
                      <IconChip icon={item.icon} palette={palette} />
                    </span>
                    <span className="mt-auto block text-4xl font-semibold tracking-tight text-slate-900" style={serif}>
                      {count}
                    </span>
                    <span className="mt-0.5 block pr-6 text-xs text-slate-600">{item.helper}</span>
                  </>
                }
                back={
                  <>
                    <BackTitle>{item.status} by vendor</BackTitle>
                    {rows.length === 0 ? (
                      <span className="text-sm text-white/60">Nothing to show yet.</span>
                    ) : (
                      rows.map(([id, total]) => <BackRow key={id} label={vendorName(id)} value={total} />)
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      </section>

      {/* Order queue */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-6 py-5">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
            <ClipboardList size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
            Order queue
          </h2>
          <span className="text-xs text-slate-500">{visibleOrders.length} orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">Order</th>
                <th className="px-6 py-3 font-semibold">Vendor</th>
                <th className="px-6 py-3 font-semibold">Customer</th>
                <th className="px-6 py-3 font-semibold">Fulfillment</th>
                <th className="px-6 py-3 font-semibold">Total</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {pagedOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                    No orders match your filters. Try another vendor or search term.
                  </td>
                </tr>
              )}
              {pagedOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-stone-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[rgb(var(--brand-text))]">{order.id}</p>
                    <p className="text-xs text-slate-500">
                      {order.date}, {order.items} item(s)
                    </p>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{vendorName(order.vendorId)}</td>
                  <td className="px-6 py-4 text-slate-700">{order.customer}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <Truck size={15} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
                      {order.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-lg font-semibold text-slate-900" style={serif}>
                    {inr(order.total)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-medium ring-1 ${
                        statusClass[order.status] || "bg-stone-50 text-stone-700 ring-stone-200"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DataPager
          total={visibleOrders.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={updatePageSize}
        />
      </section>
    </div>
  );
}