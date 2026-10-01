import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Gem,
  Package,
  RotateCw,
  ShoppingBag,
  Star,
  Store,
  Wallet,
} from "lucide-react";
import {
  inr,
  orders,
  performance,
  products,
  summaryFor,
  vendorName,
  vendors,
} from "../../data/marketplaceData";
import { getCurrentSession } from "../../config/localAuth";

const rolePanelCopy = {
  "Super Admin": {
    eyebrow: "Super Admin performance center",
    title: "Marketplace command dashboard",
    description: "Track vendor revenue, catalog quality, order health, returns, and growth across the full marketplace.",
  },
  "Assistant Super Admin": {
    eyebrow: "Assistant Super Admin operations center",
    title: "Marketplace operations dashboard",
    description: "Review products, customer activity, categories, orders, and operational alerts assigned to your role.",
  },
  Vendor: {
    eyebrow: "Vendor performance panel",
    title: "Vendor seller dashboard",
    description: "Track your catalog, orders, stock alerts, account health, and recent marketplace performance.",
  },
};

/*
  Serif display face for headlines and numbers (falls back to Georgia).
  Optional, add to index.html <head> for the full effect:
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet" />
*/
const serif = { fontFamily: "var(--font-display)" };

/*
  Muted, adult palette. Fronts are soft tinted gradients; backs are deep jewel tones with gold type.
  Change the `back` values to light shades if you prefer an all-light look.
*/
const palettes = [
  {
    // sage / emerald
    front: "from-[rgb(var(--a1-f1))] via-[rgb(var(--a1-f2))] to-[rgb(var(--a1-f3))]",
    back: "from-[rgb(var(--a1-b1))] to-[rgb(var(--a1-b2))]",
    chip: "from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))]",
    tint: "text-[rgb(var(--a1-text))]",
  },
  {
    // dusty blue
    front: "from-[rgb(var(--a2-f1))] via-[rgb(var(--a2-f2))] to-[rgb(var(--a2-f3))]",
    back: "from-[rgb(var(--a2-b1))] to-[rgb(var(--a2-b2))]",
    chip: "from-[rgb(var(--a2))] to-[rgb(var(--a2-dark))]",
    tint: "text-[rgb(var(--a2-text))]",
  },
  {
    // mauve / plum
    front: "from-[rgb(var(--a3-f1))] via-[rgb(var(--a3-f2))] to-[rgb(var(--a3-f3))]",
    back: "from-[rgb(var(--a3-b1))] to-[rgb(var(--a3-b2))]",
    chip: "from-[rgb(var(--a3))] to-[rgb(var(--a3-dark))]",
    tint: "text-[rgb(var(--a3-text))]",
  },
  {
    // champagne / bronze
    front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]",
    back: "from-[rgb(var(--p4-b1))] to-[rgb(var(--p4-b2))]",
    chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]",
    tint: "text-[rgb(var(--brand-dark))]",
  },
];

const gold = "text-[rgb(var(--brand-on-dark))]";

/* Solid versions of the four palette colours, used by the charts. */
const solids = ["rgb(var(--a1))", "rgb(var(--a2))", "rgb(var(--a3))", "rgb(var(--brand))"];

/* ---------- helpers ---------- */

const countBy = (list, getKey) =>
  list.reduce((acc, item) => {
    const key = getKey(item) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

function statusTone(status = "") {
  const value = status.toLowerCase();
  if (/(deliver|complete|active|shipped)/.test(value))
    return { tag: "bg-emerald-50 text-emerald-800 ring-emerald-200", bar: "border-l-emerald-500" };
  if (/(cancel|return|suppress|reject|fail)/.test(value))
    return { tag: "bg-rose-50 text-rose-800 ring-rose-200", bar: "border-l-rose-500" };
  if (/(pending|process|hold|review)/.test(value))
    return { tag: "bg-amber-50 text-amber-800 ring-amber-200", bar: "border-l-amber-500" };
  return { tag: "bg-stone-50 text-stone-700 ring-stone-200", bar: "border-l-stone-400" };
}

const healthBar = (health) =>
  health >= 80
    ? "from-emerald-600 to-emerald-400"
    : health >= 60
    ? "from-amber-600 to-amber-400"
    : "from-rose-600 to-rose-400";

/* ---------- building blocks ---------- */

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
        {/* Front */}
        <span
          aria-hidden={flipped}
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br ${palette.front} p-5 text-slate-900 ring-1 ring-[rgb(var(--brand-line)/0.35)]`}
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <GoldLine />
          <span className="relative flex h-full flex-col">{front}</span>
          <RotateCw size={12} className="absolute bottom-4 right-4 text-slate-400" aria-hidden="true" />
        </span>

        {/* Back */}
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

function MetricFlipCard({ metric }) {
  return (
    <FlipCard
      label={metric.label}
      palette={metric.palette}
      front={
        <>
          <span className="flex items-start justify-between">
            <span className="text-sm font-medium text-slate-600">{metric.label}</span>
            <IconChip icon={metric.icon} palette={metric.palette} />
          </span>
          <span className="mt-auto block text-4xl font-semibold tracking-tight text-slate-900" style={serif}>
            {metric.value}
          </span>
          <span className="mt-0.5 block pr-6 text-xs text-slate-600">{metric.helper}</span>
        </>
      }
      back={
        <>
          <BackTitle>{metric.backTitle}</BackTitle>
          {metric.backRows.length === 0 ? (
            <span className="text-sm text-white/60">Nothing to show yet.</span>
          ) : (
            metric.backRows.map((row) => <BackRow key={row.label} {...row} />)
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
        <p className="text-2xl font-semibold leading-none text-slate-900" style={serif}>
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

const statusHex = (status = "") => {
  const value = status.toLowerCase();
  if (/(deliver|complete|active|shipped)/.test(value)) return "#2f7d5b";
  if (/(cancel|return|suppress|reject|fail)/.test(value)) return "#b4475a";
  if (/(pending|process|hold|review)/.test(value)) return "rgb(var(--brand))";
  return "#8b8478";
};

function RevenueMix({ items, total }) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label="Revenue share by vendor">
        {items.map((item, index) => (
          <span
            key={item.vendorId}
            className="h-full border-r border-white last:border-0"
            style={{ width: `${(item.revenue / total) * 100}%`, backgroundColor: solids[index % solids.length] }}
          />
        ))}
      </div>
      <ul className="mt-5 space-y-3">
        {items.map((item, index) => (
          <li key={item.vendorId} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: solids[index % solids.length] }} />
              <span className="truncate text-slate-700">{vendorName(item.vendorId)}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-3">
              <span className="font-semibold text-slate-900">{inr(item.revenue)}</span>
              <span className="w-10 text-right text-xs text-slate-500">{Math.round((item.revenue / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderDonut({ data }) {
  const total = data.reduce((sum, [, count]) => sum + count, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Orders by status">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1eee8" strokeWidth="9" />
          {total > 0 &&
            data.map(([status, count]) => {
              const length = (count / total) * circumference;
              const visible = Math.max(length - 1.5, 0);
              const circle = (
                <circle
                  key={status}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={statusHex(status)}
                  strokeWidth="9"
                  strokeDasharray={`${visible} ${circumference - visible}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold leading-none text-slate-900" style={serif}>
            {total}
          </span>
          <span className="mt-1 text-xs text-slate-500">orders</span>
        </div>
      </div>

      <ul className="w-full space-y-3">
        {data.map(([status, count]) => (
          <li key={status} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusHex(status) }} />
              <span className="text-slate-700">{status}</span>
            </span>
            <span className="font-semibold text-slate-900">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- page ---------- */

export default function Dashboard() {
  const session = getCurrentSession();
  const isVendor = session.role === "Vendor";
  const panelCopy = rolePanelCopy[session.role] || rolePanelCopy["Super Admin"];
  const [vendorId, setVendorId] = useState(isVendor ? vendors[0]?.id || "all" : "all");
  const scopedVendorId = isVendor ? vendors[0]?.id || "all" : vendorId;
  const summary = summaryFor(scopedVendorId);

  const scopedPerformance = useMemo(
    () => (scopedVendorId === "all" ? performance : performance.filter((item) => item.vendorId === scopedVendorId)),
    [scopedVendorId]
  );
  const scopedOrders = scopedVendorId === "all" ? orders : orders.filter((order) => order.vendorId === scopedVendorId);
  const scopedProducts = scopedVendorId === "all" ? products : products.filter((product) => product.vendorId === scopedVendorId);
  const visibleVendors = scopedVendorId === "all" ? vendors : vendors.filter((vendor) => vendor.id === scopedVendorId);

  const alertProducts = scopedProducts.filter((product) => product.stock < 15 || product.status === "Suppressed");

  const totalRevenue = scopedPerformance.reduce((sum, item) => sum + item.revenue, 0) || 1;
  const topVendors = [...scopedPerformance].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  const orderStatus = Object.entries(countBy(scopedOrders, (order) => order.status)).slice(0, 4);
  const productStatus = Object.entries(countBy(scopedProducts, (product) => product.status)).slice(0, 3);
  const allOrderStatus = Object.entries(countBy(scopedOrders, (order) => order.status));
  const revenueItems = [...scopedPerformance].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  const metrics = [
    {
      label: "Revenue",
      value: inr(summary.revenue),
      icon: Wallet,
      palette: palettes[0],
      helper: "settled marketplace revenue",
      backTitle: "Top vendors by revenue",
      backRows: topVendors.map((item) => ({
        label: vendorName(item.vendorId),
        value: `${Math.round((item.revenue / totalRevenue) * 100)}%`,
      })),
    },
    {
      label: "Orders",
      value: summary.orders.toLocaleString("en-IN"),
      icon: ShoppingBag,
      palette: palettes[1],
      helper: "last 30 days",
      backTitle: "Recent orders by status",
      backRows: orderStatus.map(([status, count]) => ({ label: status, value: count })),
    },
    {
      label: "Products",
      value: summary.products,
      icon: Package,
      palette: palettes[2],
      helper: `${summary.lowStock} need stock action`,
      backTitle: "Catalog status",
      backRows: [
        ...productStatus.map(([status, count]) => ({ label: status, value: count })),
        { label: "Low stock", value: summary.lowStock, valueClass: "text-rose-300" },
      ].slice(0, 4),
    },
    {
      label: isVendor ? "Panel" : "Vendors",
      value: isVendor ? "Vendor" : scopedVendorId === "all" ? vendors.length : 1,
      icon: Store,
      palette: palettes[3],
      helper: isVendor ? "seller access" : "active seller panels",
      backTitle: isVendor ? "Your seller account" : "Seller ratings",
      backRows: visibleVendors.slice(0, 3).map((vendor) => ({
        label: vendor.name,
        value: `${vendor.rating} ★`,
      })),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              {panelCopy.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              {isVendor ? vendorName(scopedVendorId) : panelCopy.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">{panelCopy.description}</p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={BellRing} value={alertProducts.length} label="listings need attention" />
              <GlanceStat icon={ShoppingBag} value={scopedOrders.length} label="recent orders" />
              <GlanceStat icon={Store} value={scopedPerformance.length} label={scopedPerformance.length === 1 ? "vendor tracked" : "vendors tracked"} />
            </div>

            {!isVendor && (
              <label className="w-full lg:w-72">
                <span className="sr-only">Vendor</span>
                <select
                  value={vendorId}
                  onChange={(event) => setVendorId(event.target.value)}
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
            )}
          </div>
        </div>
      </section>

      {/* Flip metric cards */}
      <section aria-label="Key metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} />
          Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricFlipCard key={metric.label} metric={metric} />
          ))}
        </div>
      </section>

      {/* Overview charts */}
      <section aria-label="Marketplace overview" className="grid gap-6 lg:grid-cols-2">
        <div className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7">
          <GoldLine className="inset-x-10" />
          <SectionTitle icon={Wallet}>Revenue by vendor</SectionTitle>
          <div className="mt-6">
            <RevenueMix items={revenueItems} total={totalRevenue} />
          </div>
        </div>

        <div className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7">
          <GoldLine className="inset-x-10" />
          <SectionTitle icon={ShoppingBag}>Order status</SectionTitle>
          <div className="mt-6">
            <OrderDonut data={allOrderStatus} />
          </div>
        </div>
      </section>

      {/* Performance + alerts */}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
          <GoldLine className="inset-x-10" />
          <div className="border-b border-stone-200 px-6 py-5">
            <SectionTitle
              icon={BarChart3}
              aside={<span className="text-xs text-slate-500">{scopedPerformance.length} shown</span>}
            >
              Vendor performance
            </SectionTitle>
          </div>

          <ul className="divide-y divide-stone-100">
            {scopedPerformance.map((item, index) => {
              const negative = item.growth.startsWith("-");
              const GrowthIcon = negative ? ArrowDownRight : ArrowUpRight;
              const palette = palettes[index % palettes.length];
              return (
                <li
                  key={item.vendorId}
                  className="grid gap-4 px-6 py-4 transition-colors hover:bg-stone-50 md:grid-cols-[1.2fr_120px_1fr_84px] md:items-center"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-base font-semibold text-white`}
                      style={serif}
                    >
                      {initials(vendorName(item.vendorId))}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{vendorName(item.vendorId)}</p>
                      <p className="text-xs text-slate-500">
                        {item.orders.toLocaleString("en-IN")} orders, {item.conversion} conversion
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Revenue</p>
                    <p className="text-lg font-semibold text-slate-900" style={serif}>
                      {inr(item.revenue)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Account health</span>
                      <span className="font-semibold text-slate-900">{item.health}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${healthBar(item.health)} transition-all duration-700`}
                        style={{ width: `${item.health}%` }}
                      />
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      negative ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    <GrowthIcon size={15} strokeWidth={1.8} />
                    {item.growth}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7">
          <GoldLine className="inset-x-10" />
          <SectionTitle icon={AlertTriangle}>Operational alerts</SectionTitle>

          <div className="mt-5 space-y-2">
            {alertProducts.length === 0 && (
              <p className="rounded-[var(--radius-control)] border border-dashed border-stone-300 p-4 text-sm text-slate-500">
                No stock or listing issues right now.
              </p>
            )}
            {alertProducts.map((product) => {
              const tone = statusTone(product.status);
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 rounded-[var(--radius-control)] border border-l-4 border-stone-200 bg-[rgb(var(--tint-50))] p-3 ${tone.bar}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {vendorName(product.vendorId)}, {product.stock} units left
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${tone.tag}`}>
                    {product.status}
                  </span>
                </div>
              );
            })}
          </div>

          <h3 className="mb-2.5 mt-7 text-lg font-semibold text-slate-900" style={serif}>
            Latest orders
          </h3>
          <div className="divide-y divide-stone-100 rounded-[var(--radius-control)] border border-stone-200">
            {scopedOrders.slice(0, 3).map((order) => {
              const tone = statusTone(order.status);
              return (
                <div key={order.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{order.id}</p>
                    <p className="text-xs text-slate-500">{vendorName(order.vendorId)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">{inr(order.total)}</p>
                    <span className={`mt-0.5 inline-block rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${tone.tag}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vendor flip cards */}
      <section aria-label="Vendors">
        <h2 className="mb-4 text-2xl font-semibold text-slate-900" style={serif}>
          {isVendor ? "Your seller profile" : "Vendors"}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleVendors.map((vendor, index) => {
            const palette = palettes[index % palettes.length];
            const perf = performance.find((item) => item.vendorId === vendor.id);
            const negative = perf?.growth?.startsWith("-");
            return (
              <FlipCard
                key={vendor.id}
                label={vendor.name}
                palette={palette}
                className="h-52"
                front={
                  <>
                    <span className="flex items-start justify-between gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-lg font-semibold text-white`}
                        style={serif}
                      >
                        {initials(vendor.name)}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-semibold text-[rgb(var(--brand-dark))]">
                        <Star size={14} fill="currentColor" />
                        {vendor.rating}
                      </span>
                    </span>
                    <span className="mt-3 block truncate text-2xl font-semibold text-slate-900" style={serif}>
                      {vendor.name}
                    </span>
                    <span className="block text-sm text-slate-600">{vendor.category}</span>
                    <span className="mt-auto flex gap-8 border-t border-slate-900/10 pt-3 pr-6 text-sm">
                      <span>
                        <span className="block text-xs text-slate-500">Fulfillment SLA</span>
                        <span className="font-semibold text-slate-900">{vendor.sla}</span>
                      </span>
                      <span>
                        <span className="block text-xs text-slate-500">Growth</span>
                        <span className={`inline-flex items-center gap-0.5 font-semibold ${negative ? "text-rose-700" : "text-emerald-700"}`}>
                          {negative ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          {perf?.growth || "New"}
                        </span>
                      </span>
                    </span>
                  </>
                }
                back={
                  <>
                    <BackTitle>{vendor.name}</BackTitle>
                    <BackRow label="Account health" value={perf ? `${perf.health}%` : "n/a"} />
                    <BackRow label="Orders" value={perf ? perf.orders.toLocaleString("en-IN") : "0"} />
                    <BackRow label="Conversion" value={perf?.conversion || "n/a"} />
                    <BackRow label="Rating" value={`${vendor.rating} ★`} valueClass={gold} />
                  </>
                }
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}