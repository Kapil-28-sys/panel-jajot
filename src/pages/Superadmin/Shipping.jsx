import { useState, useMemo } from "react";
import {
  Search, ChevronDown, X, Check, Truck, PackageCheck, Clock, AlertTriangle, MapPin,
  Copy, Settings2, Plus, Gem, RotateCw,
} from "lucide-react";

/**
 * ShippingPage.jsx
 * Super Admin > Shipping
 * Styled to match the Dashboard (gold hairlines, serif display type, flip cards).
 *
 * Wire-up notes (unchanged):
 * - Replace MOCK_SHIPMENTS with GET /api/admin/shipping/shipments
 * - Replace MOCK_CARRIERS with GET /api/admin/shipping/carriers
 * - Carrier toggle / rate edits should PATCH /api/admin/shipping/carriers/:carrierId
 * - All requests use apiUrl() + authConfig() + adminToken, parsed with safeJson()
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

const MOCK_SHIPMENTS = [
  { id: "ord_7741", vendor: "Orion Electronics", carrier: "Delhivery", tracking: "DL774112093IN", destination: "Pune, MH", status: "in_transit", eta: "23 Jul 2026" },
  { id: "ord_7742", vendor: "Meadow & Co. Home", carrier: "Bluedart", tracking: "BD991823741", destination: "Jaipur, RJ", status: "delivered", eta: "Delivered 20 Jul 2026" },
  { id: "ord_7743", vendor: "Kestrel Outdoors", carrier: "Delhivery", tracking: "DL774119284IN", destination: "Kochi, KL", status: "delayed", eta: "Was due 19 Jul 2026" },
  { id: "ord_7744", vendor: "Lumen Beauty Lab", carrier: "Xpressbees", tracking: "XB3348219974", destination: "Indore, MP", status: "rto", eta: "Returning to origin" },
  { id: "ord_7745", vendor: "Northbound Coffee Roasters", carrier: "Bluedart", tracking: "BD991829012", destination: "Ajmer, RJ", status: "in_transit", eta: "22 Jul 2026" },
  { id: "ord_7746", vendor: "Orion Electronics", carrier: "Xpressbees", tracking: "XB3348227761", destination: "Nagpur, MH", status: "pending_pickup", eta: "Pickup scheduled 22 Jul 2026" },
];

const MOCK_CARRIERS = [
  { id: "c_1", name: "Delhivery", zonesCovered: "Pan-India", baseRate: 45, codAvailable: true, enabled: true },
  { id: "c_2", name: "Bluedart", zonesCovered: "Metro + Tier 1", baseRate: 68, codAvailable: true, enabled: true },
  { id: "c_3", name: "Xpressbees", zonesCovered: "Pan-India", baseRate: 40, codAvailable: true, enabled: true },
  { id: "c_4", name: "Ekart", zonesCovered: "Tier 2 + Tier 3", baseRate: 38, codAvailable: false, enabled: false },
];

const STATUS_META = {
  in_transit: { label: "In transit", style: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  delivered: { label: "Delivered", style: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  delayed: { label: "Delayed", style: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  rto: { label: "RTO", style: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
  pending_pickup: { label: "Pending pickup", style: "bg-stone-100 text-stone-700 ring-stone-300", dot: "bg-stone-400" },
};

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/* ---------- building blocks ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`} />
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ring-1 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] ${
        checked ? "bg-gradient-to-br from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))] ring-[rgb(var(--a1)/0.4)]" : "bg-stone-300 ring-stone-300"
      }`}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(24px)" : "translateX(4px)" }}
      />
    </button>
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
          <span className="mt-auto block text-4xl font-semibold tracking-tight text-slate-900" style={serif}>{value}</span>
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

function ModalShell({ title, subtitle, onClose, children, footer, maxWidth = "max-w-md" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
      <div className={`relative w-full ${maxWidth} overflow-hidden rounded-[var(--radius-card)] bg-white shadow-2xl ring-1 ring-[rgb(var(--brand-line)/0.5)]`}>
        <GoldLine className="inset-x-8" />
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold leading-tight text-slate-900" style={serif}>{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-stone-200 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{children}</span>
    </div>
  );
}

/* ---------- page ---------- */

export default function ShippingPage() {
  const [tab, setTab] = useState("shipments"); // shipments | carriers
  const [shipments] = useState(MOCK_SHIPMENTS);
  const [carriers, setCarriers] = useState(MOCK_CARRIERS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trackingView, setTrackingView] = useState(null);
  const [editingCarrier, setEditingCarrier] = useState(null); // { id, name, baseRate, zonesCovered }

  const filtered = useMemo(
    () =>
      shipments.filter((s) => {
        const q = query.toLowerCase();
        const matchesQuery = s.vendor.toLowerCase().includes(q) || s.tracking.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [shipments, query, statusFilter]
  );

  const stats = useMemo(() => {
    const by = (status) => shipments.filter((s) => s.status === status);
    const countBy = (key) =>
      Object.entries(
        shipments.reduce((acc, s) => ({ ...acc, [s[key]]: (acc[s[key]] || 0) + 1 }), {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, value]) => ({ label, value }));
    return {
      inTransit: by("in_transit"),
      delivered: by("delivered"),
      delayed: by("delayed"),
      rto: by("rto"),
      pickup: by("pending_pickup").length,
      byCarrier: countBy("carrier"),
    };
  }, [shipments]);

  const toggleCarrier = (id, val) => {
    setCarriers((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: val } : c)));
    // TODO: PATCH `${apiUrl()}/admin/shipping/carriers/${id}` { enabled: val }
  };

  const saveCarrier = () => {
    setCarriers((prev) =>
      prev.map((c) =>
        c.id === editingCarrier.id
          ? { ...c, baseRate: Number(editingCarrier.baseRate) || 0, zonesCovered: editingCarrier.zonesCovered }
          : c
      )
    );
    // TODO: PATCH `${apiUrl()}/admin/shipping/carriers/${editingCarrier.id}` { baseRate, zonesCovered }
    setEditingCarrier(null);
  };

  const listRows = (list) => list.slice(0, 3).map((s) => ({ label: s.vendor, value: s.id }));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Logistics control
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Shipping
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Track shipments across vendors and manage which carriers are active on the platform.
            </p>
          </div>

          <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
            <GlanceStat icon={Truck} value={stats.inTransit.length} label="in transit" />
            <GlanceStat icon={Clock} value={stats.pickup} label="awaiting pickup" />
            <GlanceStat icon={AlertTriangle} value={stats.delayed.length + stats.rto.length} label="need attention" />
          </div>
        </div>
      </section>

      {/* Flip stat cards */}
      <section aria-label="Shipping metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} /> Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatFlipCard label="In transit" value={stats.inTransit.length} helper="on the way to buyers" icon={Truck} palette={palettes[1]} backTitle="Shipments by carrier" rows={stats.byCarrier} />
          <StatFlipCard label="Delivered" value={stats.delivered.length} helper="completed deliveries" icon={PackageCheck} palette={palettes[0]} backTitle="Recently delivered" rows={listRows(stats.delivered)} />
          <StatFlipCard label="Delayed" value={stats.delayed.length} helper="past the promised date" icon={Clock} palette={palettes[3]} backTitle="Delayed shipments" rows={listRows(stats.delayed)} />
          <StatFlipCard label="RTO" value={stats.rto.length} helper="returning to origin" icon={AlertTriangle} palette={palettes[2]} backTitle="Returning shipments" rows={listRows(stats.rto)} />
        </div>
      </section>

      {/* Tabbed panel */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />

        <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 rounded-[var(--radius-card)] bg-stone-100 p-1" role="tablist">
            {[
              { key: "shipments", label: "Shipments" },
              { key: "carriers", label: "Carriers & rates" },
            ].map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-[var(--radius-control)] px-4 py-1.5 text-sm font-medium transition ${
                  tab === t.key
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-[rgb(var(--brand-line)/0.4)]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "shipments" ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, vendor or tracking ID" className={`${inputClass} pl-9`} />
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
                  <option value="pending_pickup">Pending pickup</option>
                  <option value="in_transit">In transit</option>
                  <option value="delayed">Delayed</option>
                  <option value="delivered">Delivered</option>
                  <option value="rto">RTO</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          ) : (
            <button className={goldButton}>
              <Plus size={14} /> Add carrier
            </button>
          )}
        </div>

        {tab === "shipments" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-left text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Order</th>
                  <th className="px-3 py-3">Vendor</th>
                  <th className="px-3 py-3">Carrier</th>
                  <th className="px-3 py-3">Tracking ID</th>
                  <th className="px-3 py-3">Destination</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-stone-50">
                    <td className="px-6 py-3 font-semibold text-slate-900">{s.id}</td>
                    <td className="px-3 py-3 text-slate-700">{s.vendor}</td>
                    <td className="px-3 py-3 text-slate-700">{s.carrier}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{s.tracking}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={12} className="text-[rgb(var(--brand-text))]" />
                        {s.destination}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={s.status} />
                      <p className="mt-1 text-xs text-slate-400">{s.eta}</p>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => setTrackingView(s)} className={ghostButton + " py-1.5"}>
                        <Truck size={13} /> Track
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-14 text-center text-slate-500">
                      No shipments match this search. Try another order, vendor or tracking ID.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-left text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Carrier</th>
                  <th className="px-3 py-3">Zones covered</th>
                  <th className="px-3 py-3">Base rate</th>
                  <th className="px-3 py-3">COD available</th>
                  <th className="px-3 py-3">Active</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {carriers.map((c, i) => (
                  <tr key={c.id} className="transition-colors hover:bg-stone-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palettes[i % palettes.length].chip} text-base font-semibold text-white`}
                          style={serif}
                        >
                          {initials(c.name)}
                        </span>
                        <span className="font-semibold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{c.zonesCovered}</td>
                    <td className="px-3 py-3">
                      <span className="text-lg font-semibold text-[rgb(var(--brand-dark))]" style={serif}>₹{c.baseRate}</span>
                      <span className="text-xs text-slate-500"> / shipment</span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${
                          c.codAvailable ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-stone-100 text-stone-700 ring-stone-300"
                        }`}
                      >
                        {c.codAvailable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Toggle checked={c.enabled} onChange={(val) => toggleCarrier(c.id, val)} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => setEditingCarrier({ ...c })} className={ghostButton + " py-1.5"}>
                        <Settings2 size={13} /> Edit rate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tracking modal */}
      {trackingView && (
        <ModalShell
          title={`Tracking ${trackingView.id}`}
          subtitle={trackingView.vendor}
          onClose={() => setTrackingView(null)}
          footer={<button onClick={() => setTrackingView(null)} className={goldButton}>Close</button>}
        >
          <InfoRow label="Carrier">{trackingView.carrier}</InfoRow>
          <InfoRow label="Tracking ID">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              {trackingView.tracking}
              <button
                type="button"
                aria-label="Copy tracking ID"
                onClick={() => navigator.clipboard?.writeText(trackingView.tracking)}
                className="text-slate-400 hover:text-[rgb(var(--brand-dark))]"
              >
                <Copy size={12} />
              </button>
            </span>
          </InfoRow>
          <InfoRow label="Destination">{trackingView.destination}</InfoRow>
          <InfoRow label="Status"><StatusPill status={trackingView.status} /></InfoRow>
          <InfoRow label="Estimate">{trackingView.eta}</InfoRow>
        </ModalShell>
      )}

      {/* Edit carrier modal */}
      {editingCarrier && (
        <ModalShell
          title={`Edit ${editingCarrier.name} rate`}
          onClose={() => setEditingCarrier(null)}
          maxWidth="max-w-sm"
          footer={
            <>
              <button onClick={() => setEditingCarrier(null)} className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50">
                Cancel
              </button>
              <button onClick={saveCarrier} className={goldButton}>
                <Check size={14} /> Save changes
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800">Base rate (₹ / shipment)</label>
              <input
                type="number"
                min={0}
                value={editingCarrier.baseRate}
                onChange={(e) => setEditingCarrier((prev) => ({ ...prev, baseRate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800">Zones covered</label>
              <input
                type="text"
                value={editingCarrier.zonesCovered}
                onChange={(e) => setEditingCarrier((prev) => ({ ...prev, zonesCovered: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}