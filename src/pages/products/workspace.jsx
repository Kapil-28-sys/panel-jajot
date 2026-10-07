import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Gem,
  ImagePlus,
  IndianRupee,
  Package,
  Plus,
  RotateCw,
  ShoppingBag,
  Star,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

/* Same design tokens as the marketplace dashboard (CSS variables from your theme). */
const serif = { fontFamily: "var(--font-display)" };
const gold = "text-[rgb(var(--brand-on-dark))]";
const solids = ["rgb(var(--a1))", "rgb(var(--a2))", "rgb(var(--a3))", "rgb(var(--brand))"];

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

/* ---------- helpers ---------- */

const inr = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const compactInr = (amount) => {
  const n = Number(amount);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "VN";

function statusTone(status = "") {
  const v = status.toLowerCase();
  if (/(deliver|complete|active|shipped)/.test(v))
    return { tag: "bg-emerald-50 text-emerald-800 ring-emerald-200", hex: "#2f7d5b" };
  if (/(cancel|return|suppress|reject|fail)/.test(v))
    return { tag: "bg-rose-50 text-rose-800 ring-rose-200", hex: "#b4475a" };
  if (/(pending|process|hold|review)/.test(v))
    return { tag: "bg-amber-50 text-amber-800 ring-amber-200", hex: "rgb(var(--brand))" };
  return { tag: "bg-stone-50 text-stone-700 ring-stone-200", hex: "#8b8478" };
}

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
        onClick={() => setFlipped((v) => !v)}
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

function IconChip({ icon: Icon, palette }) {
  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-white`}>
      <Icon size={18} strokeWidth={1.6} />
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

function Panel({ children, className = "" }) {
  return (
    <div className={`relative rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200 ${className}`}>
      <GoldLine />
      {children}
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

function RangeSwitch({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-control)] bg-stone-100 p-1">
      {["7d", "30d", "90d"].map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`rounded-[var(--radius-control)] px-3 py-1 text-xs transition-colors ${
            value === r ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function RankedBars({ items }) {
  const max = Math.max(...items.map((p) => p.sales ?? p.totalSales ?? 0), 1);
  return (
    <ul className="space-y-4">
      {items.map((p, i) => {
        const units = p.sales ?? p.totalSales ?? 0;
        return (
          <li key={p._id ?? i}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: solids[i % solids.length] }} />
                <span className="truncate text-slate-700">{p.name}</span>
              </span>
              <span className="shrink-0 font-semibold text-slate-900">{units}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(units / max) * 100}%`, backgroundColor: solids[i % solids.length] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OrderDonut({ data }) {
  const total = data.reduce((s, [, c]) => s + c, 0);
  const r = 42;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Orders by status">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1eee8" strokeWidth="9" />
          {total > 0 &&
            data.map(([status, count]) => {
              const len = (count / total) * circ;
              const vis = Math.max(len - 1.5, 0);
              const el = (
                <circle
                  key={status}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={statusTone(status).hex}
                  strokeWidth="9"
                  strokeDasharray={`${vis} ${circ - vis}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold leading-none text-slate-900" style={serif}>{total}</span>
          <span className="mt-1 text-xs text-slate-500">orders</span>
        </div>
      </div>
      <ul className="w-full space-y-3">
        {data.map(([status, count]) => (
          <li key={status} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusTone(status).hex }} />
              <span className="text-slate-700">{status}</span>
            </span>
            <span className="font-semibold text-slate-900">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="flex h-full min-h-[8rem] items-center justify-center rounded-[var(--radius-control)] border border-dashed border-stone-300 p-4 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex h-full w-full animate-pulse items-end gap-2 pb-2">
      {[40, 65, 50, 80, 60, 90, 55].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-sm bg-stone-100" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function Dashboard() {
  const [vendor, setVendor] = useState(null);
  const [stats, setStats] = useState({
    totalSales: 0, salesGrowth: 0, orders: 0, pendingOrders: 0,
    productsLive: 0, outOfStock: 0, avgRating: 0, reviewCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [chartRange, setChartRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const vendorId = localStorage.getItem("vendorId");
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [vendorRes, statsRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE}/vendor/${vendorId}`, { headers }),
          axios.get(`${API_BASE}/vendor/${vendorId}/stats`, { headers }),
          axios.get(`${API_BASE}/vendor/${vendorId}/orders?limit=5`, { headers }),
        ]);
        const s = statsRes.data;
        setVendor(vendorRes.data);
        setStats({
          totalSales: s.totalSales ?? 0,
          salesGrowth: s.salesGrowth ?? 0,
          orders: s.orders ?? 0,
          pendingOrders: s.pendingOrders ?? 0,
          productsLive: s.productsLive ?? 0,
          outOfStock: s.outOfStock ?? 0,
          avgRating: s.avgRating ?? 0,
          reviewCount: s.reviewCount ?? 0,
        });
        setRecentOrders(ordersRes.data.orders ?? ordersRes.data ?? []);
        setError(null);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    // Charts load on their own so a missing analytics endpoint never breaks the page.
    const fetchCharts = async () => {
      try {
        setChartsLoading(true);
        const [trendRes, productsRes] = await Promise.all([
          axios.get(`${API_BASE}/vendor/${vendorId}/sales-trend?range=${chartRange}`, { headers }),
          axios.get(`${API_BASE}/vendor/${vendorId}/top-products?limit=6`, { headers }),
        ]);
        setSalesTrend(trendRes.data.trend ?? trendRes.data ?? []);
        setTopProducts(productsRes.data.products ?? productsRes.data ?? []);
      } catch (err) {
        console.error("Chart fetch error:", err);
        setSalesTrend([]);
        setTopProducts([]);
      } finally {
        setChartsLoading(false);
      }
    };

    fetchDashboard();
    fetchCharts();
  }, [chartRange]);

  const growthUp = stats.salesGrowth >= 0;
  const hasTrend = salesTrend.length > 0;
  const hasProducts = topProducts.length > 0;
  const dash = (v) => (loading ? "—" : v);

  const statusCounts = Object.entries(
    recentOrders.reduce((acc, o) => {
      const k = o.status || "Pending";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  );

  const metrics = [
    {
      label: "Total sales",
      value: dash(inr(stats.totalSales)),
      icon: IndianRupee,
      palette: palettes[0],
      helper: `${growthUp ? "+" : ""}${stats.salesGrowth}% this week`,
      backTitle: "Sales summary",
      backRows: [
        { label: "Weekly growth", value: `${growthUp ? "+" : ""}${stats.salesGrowth}%`, valueClass: growthUp ? "text-emerald-300" : "text-rose-300" },
        { label: "Total orders", value: stats.orders },
        { label: "Pending", value: stats.pendingOrders },
      ],
    },
    {
      label: "Orders",
      value: dash(stats.orders),
      icon: ShoppingBag,
      palette: palettes[1],
      helper: `${stats.pendingOrders} pending`,
      backTitle: "Recent orders by status",
      backRows: statusCounts.slice(0, 4).map(([status, count]) => ({ label: status, value: count })),
    },
    {
      label: "Products live",
      value: dash(stats.productsLive),
      icon: Package,
      palette: palettes[2],
      helper: `${stats.outOfStock} out of stock`,
      backTitle: "Catalog status",
      backRows: [
        { label: "Live", value: stats.productsLive },
        { label: "Out of stock", value: stats.outOfStock, valueClass: stats.outOfStock > 0 ? "text-rose-300" : "text-white" },
      ],
    },
    {
      label: "Avg rating",
      value: dash(stats.avgRating),
      icon: Star,
      palette: palettes[3],
      helper: `${stats.reviewCount} reviews`,
      backTitle: "Customer feedback",
      backRows: [
        { label: "Rating", value: `${stats.avgRating} ★`, valueClass: gold },
        { label: "Reviews", value: stats.reviewCount },
      ],
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
              Vendor performance panel
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              {vendor?.name ? `Welcome back, ${vendor.name}` : "Vendor seller dashboard"}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Track your sales, orders, stock alerts, and customer ratings in one place.
            </p>
          </div>
          <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
            <GlanceStat icon={BellRing} value={dash(stats.pendingOrders)} label="orders pending" />
            <GlanceStat icon={Package} value={dash(stats.outOfStock)} label="out of stock" />
            <GlanceStat icon={Star} value={dash(stats.reviewCount)} label="reviews" />
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Flip metric cards */}
      <section aria-label="Key metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} />
          Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <FlipCard
              key={m.label}
              label={m.label}
              palette={m.palette}
              front={
                <>
                  <span className="flex items-start justify-between">
                    <span className="text-sm font-medium text-slate-600">{m.label}</span>
                    <IconChip icon={m.icon} palette={m.palette} />
                  </span>
                  <span className="mt-auto block text-4xl font-semibold tracking-tight text-slate-900" style={serif}>
                    {m.value}
                  </span>
                  <span className="mt-0.5 block pr-6 text-xs text-slate-600">{m.helper}</span>
                </>
              }
              back={
                <>
                  <BackTitle>{m.backTitle}</BackTitle>
                  {m.backRows.length === 0 ? (
                    <span className="text-sm text-white/60">Nothing to show yet.</span>
                  ) : (
                    m.backRows.map((row) => <BackRow key={row.label} {...row} />)
                  )}
                </>
              }
            />
          ))}
        </div>
      </section>

      {/* Charts */}
      <section aria-label="Product performance" className="grid gap-6 lg:grid-cols-5">
        <Panel className="p-6 sm:p-7 lg:col-span-3">
          <SectionTitle
            icon={BarChart3}
            aside={
              <span className="flex items-center gap-3">
                {hasTrend && (
                  <span className={`inline-flex items-center gap-1 text-sm font-semibold ${growthUp ? "text-emerald-700" : "text-rose-700"}`}>
                    {growthUp ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    {Math.abs(stats.salesGrowth)}%
                  </span>
                )}
                <RangeSwitch value={chartRange} onChange={setChartRange} />
              </span>
            }
          >
            Sales trend
          </SectionTitle>
          <p className="mt-1 text-xs text-slate-500">Revenue over the last {chartRange}</p>

          <div className="mt-5 h-60">
            {chartsLoading ? (
              <Skeleton />
            ) : !hasTrend ? (
              <Empty>No sales data for this period yet.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(var(--a1))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="rgb(var(--a1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efebe4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8b8478" }} axisLine={false} tickLine={false} tickMargin={8} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b8478" }} axisLine={false} tickLine={false} tickFormatter={compactInr} width={48} />
                  <Tooltip
                    cursor={{ stroke: "#d6d0c4", strokeDasharray: "3 3" }}
                    formatter={(v) => [inr(v), "Sales"]}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e7e2d8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="rgb(var(--a1))"
                    strokeWidth={2.5}
                    fill="url(#salesGradient)"
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel className="p-6 sm:p-7 lg:col-span-2">
          <SectionTitle icon={Package}>Top products</SectionTitle>
          <p className="mt-1 text-xs text-slate-500">By units sold</p>
          <div className="mt-6">
            {chartsLoading ? (
              <div className="h-48"><Skeleton /></div>
            ) : !hasProducts ? (
              <Empty>No product sales yet.</Empty>
            ) : (
              <RankedBars items={topProducts} />
            )}
          </div>
        </Panel>
      </section>

      {/* Orders */}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="overflow-hidden">
          <div className="border-b border-stone-200 px-6 py-5">
            <SectionTitle
              icon={ShoppingBag}
              aside={
                <a href="/vendor/orders" className="inline-flex items-center gap-1 text-sm text-[rgb(var(--brand-text))] hover:underline">
                  View all <ArrowUpRight size={14} />
                </a>
              }
            >
              Recent orders
            </SectionTitle>
          </div>
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">Loading orders…</p>
          ) : recentOrders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No orders yet. New orders will show up here.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recentOrders.map((order, i) => {
                const tone = statusTone(order.status ?? "Pending");
                return (
                  <li key={order._id ?? i} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-stone-50">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palettes[i % palettes.length].chip} text-base font-semibold text-white`}
                      style={serif}
                    >
                      {initials(order.customerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{order.customerName ?? "Customer"}</p>
                      <p className="text-xs text-slate-500">#{order.orderNumber ?? order._id?.slice(-5)}</p>
                    </div>
                    <span className={`shrink-0 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${tone.tag}`}>
                      {order.status ?? "Pending"}
                    </span>
                    <span className="w-24 shrink-0 text-right text-lg font-semibold text-slate-900" style={serif}>
                      {inr(order.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel className="p-6 sm:p-7">
          <SectionTitle icon={ShoppingBag}>Order status</SectionTitle>
          <div className="mt-6">
            {statusCounts.length === 0 ? <Empty>No orders to chart yet.</Empty> : <OrderDonut data={statusCounts} />}
          </div>

          <h3 className="mb-3 mt-8 text-lg font-semibold text-slate-900" style={serif}>Quick actions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/vendor/products/add"
              className="flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]"
            >
              <Plus size={16} /> Add product
            </a>
            <a
              href="/vendor/banners/add"
              className="flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]"
            >
              <ImagePlus size={16} /> Add banner
            </a>
          </div>
        </Panel>
      </section>
    </div>
  );
}