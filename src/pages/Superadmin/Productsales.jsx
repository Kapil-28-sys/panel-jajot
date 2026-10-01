import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Search, ChevronDown, TrendingUp, TrendingDown, Package, IndianRupee, Award, Store,
  Gem, RotateCw, BarChart3,
} from "lucide-react";

/**
 * ProductSalesAnalytics.jsx
 * Super Admin > Reports > Highest product sales
 * Styled to match the Dashboard (gold hairlines, serif display type, flip cards).
 *
 * Wire-up notes (unchanged):
 * - Replace MOCK_PRODUCTS / MOCK_TREND with GET /api/admin/reports/product-sales
 *   query params: vendorId ("all" or specific), range (7d/30d/90d)
 * - Vendor dropdown options should come from GET /api/admin/vendors (id + name)
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

/* ---------- data (mock) ---------- */

const VENDORS = [
  { id: "all", name: "All vendors" },
  { id: "v_1001", name: "Orion Electronics" },
  { id: "v_1002", name: "Meadow & Co. Home" },
  { id: "v_1003", name: "Kestrel Outdoors" },
  { id: "v_1004", name: "Lumen Beauty Lab" },
  { id: "v_1005", name: "Northbound Coffee Roasters" },
];

const MOCK_PRODUCTS = [
  { id: "p_1", name: "Wireless ANC Headphones", vendorId: "v_1001", vendor: "Orion Electronics", category: "Electronics", unitsSold: 1842, revenue: 1289400, growth: 12.4 },
  { id: "p_2", name: "Cast Iron Dutch Oven 5L", vendorId: "v_1002", vendor: "Meadow & Co. Home", category: "Home & Kitchen", unitsSold: 1520, revenue: 987600, growth: 8.1 },
  { id: "p_3", name: "Insulated Trail Backpack 30L", vendorId: "v_1003", vendor: "Kestrel Outdoors", category: "Outdoors", unitsSold: 1310, revenue: 745900, growth: -3.6 },
  { id: "p_4", name: "Vitamin C Serum 30ml", vendorId: "v_1004", vendor: "Lumen Beauty Lab", category: "Beauty", unitsSold: 2290, revenue: 686900, growth: 21.7 },
  { id: "p_5", name: "Single-Origin Coffee Beans 1kg", vendorId: "v_1005", vendor: "Northbound Coffee Roasters", category: "Grocery", unitsSold: 1980, revenue: 594100, growth: 15.2 },
  { id: "p_6", name: "USB-C Fast Charger 65W", vendorId: "v_1001", vendor: "Orion Electronics", category: "Electronics", unitsSold: 2410, revenue: 578300, growth: 6.9 },
  { id: "p_7", name: "Linen Throw Blanket", vendorId: "v_1002", vendor: "Meadow & Co. Home", category: "Home & Kitchen", unitsSold: 1105, revenue: 441200, growth: -1.2 },
  { id: "p_8", name: "Trekking Poles (Pair)", vendorId: "v_1003", vendor: "Kestrel Outdoors", category: "Outdoors", unitsSold: 890, revenue: 400500, growth: 4.4 },
  { id: "p_9", name: "Hydrating Face Mist 100ml", vendorId: "v_1004", vendor: "Lumen Beauty Lab", category: "Beauty", unitsSold: 1670, revenue: 350700, growth: 9.8 },
  { id: "p_10", name: "Cold Brew Concentrate 500ml", vendorId: "v_1005", vendor: "Northbound Coffee Roasters", category: "Grocery", unitsSold: 1420, revenue: 298200, growth: 3.1 },
];

const MOCK_TREND = [
  { date: "1 Jul", revenue: 182000 },
  { date: "4 Jul", revenue: 201000 },
  { date: "7 Jul", revenue: 194000 },
  { date: "10 Jul", revenue: 227000 },
  { date: "13 Jul", revenue: 215000 },
  { date: "16 Jul", revenue: 248000 },
  { date: "19 Jul", revenue: 262000 },
  { date: "21 Jul", revenue: 251000 },
];

const RANGE_LABEL = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function formatCompact(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
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

function StatFlipCard({ label, value, helper, icon: Icon, palette, backTitle, rows, valueSize = "text-4xl" }) {
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
          <span className={`mt-auto block truncate ${valueSize} font-semibold tracking-tight text-slate-900`} style={serif}>{value}</span>
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

function SelectBox({ value, onChange, children, label }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        aria-label={label}
        className={`${inputClass} appearance-none pr-9`}
        style={{ width: "auto" }}
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-[rgb(var(--tint-50))] px-3 py-2 text-xs shadow-sm">
      <p className="text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900" style={serif}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function GrowthTag({ value }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${
        up ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"
      }`}
    >
      <Icon size={12} />
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

/* ---------- page ---------- */

export default function ProductSalesAnalytics() {
  const [vendorId, setVendorId] = useState("all");
  const [range, setRange] = useState("30d");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("revenue"); // revenue | unitsSold

  const scoped = useMemo(() => MOCK_PRODUCTS.filter((p) => vendorId === "all" || p.vendorId === vendorId), [vendorId]);

  const filtered = useMemo(
    () => scoped.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b[sortBy] - a[sortBy]),
    [scoped, query, sortBy]
  );

  const topTen = useMemo(
    () =>
      [...scoped]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((p) => ({ name: p.name.length > 16 ? p.name.slice(0, 16) + "…" : p.name, revenue: p.revenue })),
    [scoped]
  );

  const stats = useMemo(() => {
    const totalUnits = scoped.reduce((s, p) => s + p.unitsSold, 0);
    const totalRevenue = scoped.reduce((s, p) => s + p.revenue, 0);
    const avgGrowth = scoped.reduce((s, p) => s + p.growth, 0) / (scoped.length || 1);
    const byRevenue = [...scoped].sort((a, b) => b.revenue - a.revenue);
    const byUnits = [...scoped].sort((a, b) => b.unitsSold - a.unitsSold);
    return { totalUnits, totalRevenue, avgGrowth, byRevenue, byUnits, topProduct: byRevenue[0] };
  }, [scoped]);

  const selectedVendorName = VENDORS.find((v) => v.id === vendorId)?.name ?? "All vendors";
  const growing = stats.avgGrowth >= 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Reports
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Highest product sales
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Best-selling products {vendorId === "all" ? "across all vendors" : `for ${selectedVendorName}`}, ranked by revenue or units sold.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={IndianRupee} value={formatCompact(stats.totalRevenue)} label="total revenue" />
              <GlanceStat icon={Package} value={stats.totalUnits.toLocaleString("en-IN")} label="units sold" />
              <GlanceStat icon={Store} value={scoped.length} label={scoped.length === 1 ? "product ranked" : "products ranked"} />
            </div>
            <div className="flex flex-wrap gap-2">
              <SelectBox value={vendorId} onChange={(e) => setVendorId(e.target.value)} label="Vendor">
                {VENDORS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </SelectBox>
              <SelectBox value={range} onChange={(e) => setRange(e.target.value)} label="Date range">
                {Object.entries(RANGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </SelectBox>
            </div>
          </div>
        </div>
      </section>

      {/* Flip stat cards */}
      <section aria-label="Sales metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} /> Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatFlipCard
            label="Units sold" value={stats.totalUnits.toLocaleString("en-IN")} helper={RANGE_LABEL[range].toLowerCase()} icon={Package} palette={palettes[1]}
            backTitle="Most units sold"
            rows={stats.byUnits.slice(0, 3).map((p) => ({ label: p.name, value: p.unitsSold.toLocaleString("en-IN") }))}
          />
          <StatFlipCard
            label="Total revenue" value={formatCompact(stats.totalRevenue)} helper="across ranked products" icon={IndianRupee} palette={palettes[0]}
            backTitle="Top by revenue"
            rows={stats.byRevenue.slice(0, 3).map((p) => ({
              label: p.name,
              value: `${Math.round((p.revenue / (stats.totalRevenue || 1)) * 100)}%`,
            }))}
          />
          <StatFlipCard
            label="Avg. growth" value={`${growing ? "+" : ""}${stats.avgGrowth.toFixed(1)}%`} helper="compared with previous period"
            icon={growing ? TrendingUp : TrendingDown} palette={palettes[2]}
            backTitle="Fastest growing"
            rows={[...scoped].sort((a, b) => b.growth - a.growth).slice(0, 3).map((p) => ({
              label: p.name,
              value: `${p.growth >= 0 ? "+" : ""}${p.growth.toFixed(1)}%`,
            }))}
          />
          <StatFlipCard
            label="Top product" value={stats.topProduct ? stats.topProduct.name : "—"} valueSize="text-2xl" helper="highest revenue" icon={Award} palette={palettes[3]}
            backTitle={stats.topProduct ? "Top product details" : "Top product"}
            rows={
              stats.topProduct
                ? [
                    { label: "Revenue", value: formatCompact(stats.topProduct.revenue) },
                    { label: "Units", value: stats.topProduct.unitsSold.toLocaleString("en-IN") },
                    { label: "Vendor", value: stats.topProduct.vendor },
                  ]
                : []
            }
          />
        </div>
      </section>

      {/* Charts */}
      <section aria-label="Sales charts" className="grid gap-6 lg:grid-cols-5">
        <div className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7 lg:col-span-3">
          <GoldLine className="inset-x-10" />
          <SectionTitle icon={TrendingUp} aside={<span className="text-xs text-slate-500">{RANGE_LABEL[range]}</span>}>
            Revenue trend
          </SectionTitle>
          <div className="mt-6" style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={MOCK_TREND} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eee9df" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e2d6" }} tickLine={false} />
                <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} width={54} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgb(var(--brand-line))", strokeDasharray: "3 3" }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="rgb(var(--brand))"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#fff", stroke: "rgb(var(--brand))", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "rgb(var(--brand-dark))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7 lg:col-span-2">
          <GoldLine className="inset-x-10" />
          <SectionTitle icon={BarChart3}>Top 10 by revenue</SectionTitle>
          <div className="mt-6" style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={topTen} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eee9df" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#44403c" }} axisLine={false} tickLine={false} width={104} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(var(--tint-200))", opacity: 0.5 }} />
                <Bar dataKey="revenue" fill="rgb(var(--a1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Ranked table */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />
        <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle icon={Award} aside={<span className="text-xs text-slate-500">{filtered.length} shown</span>}>
            Product ranking
          </SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product name" className={`${inputClass} pl-9`} />
            </div>
            <SelectBox value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort by">
              <option value="revenue">Sort by revenue</option>
              <option value="unitsSold">Sort by units sold</option>
            </SelectBox>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-left text-xs font-medium text-slate-500">
                <th className="w-16 px-4 py-3">Rank</th>
                <th className="px-3 py-3">Product</th>
                {vendorId === "all" && <th className="px-3 py-3">Vendor</th>}
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Units sold</th>
                <th className="px-3 py-3">Revenue</th>
                <th className="px-3 py-3">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((p, i) => (
                <tr key={p.id} className="transition-colors hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-base font-semibold ${
                        i < 3 ? "bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] text-white" : "bg-stone-100 text-slate-600"
                      }`}
                      style={serif}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{p.name}</td>
                  {vendorId === "all" && (
                    <td className="px-3 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Store size={12} className="text-[rgb(var(--brand-text))]" />
                        {p.vendor}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-3 text-slate-700">{p.category}</td>
                  <td className="px-3 py-3 text-slate-700">{p.unitsSold.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3 text-lg font-semibold text-[rgb(var(--brand-dark))]" style={serif}>{formatCurrency(p.revenue)}</td>
                  <td className="px-3 py-3"><GrowthTag value={p.growth} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={vendorId === "all" ? 7 : 6} className="px-3 py-14 text-center text-slate-500">
                    No products match this search. Try a different product name.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}