import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Check,
  X,
  Info,
  Settings2,
  ImageIcon,
  ShieldCheck,
  ShieldOff,
  Store,
  Loader2,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  Gem,
  Layers,
  Percent,
  CalendarDays,
} from "lucide-react";

/**
 * BannerPermissions.jsx
 * Super Admin > Banners
 * Styled to match the Dashboard (gold hairlines, serif display type, flip cards).
 *
 * API (unchanged):
 *   GET   /api/admin/banners
 *   GET   /api/admin/banners/:id
 *   PATCH /api/admin/banners/:id/toggle
 *   PATCH /api/banners/:id
 */

const API_BASE = "https://amazon-multi-vendor-3.onrender.com";

/* ---------- shared design tokens (same as Dashboard) ---------- */

const serif = { fontFamily: "var(--font-display)" };

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

const gold = "text-[rgb(var(--brand-on-dark))]";

const goldButton =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2 text-sm font-medium text-white ring-1 ring-[rgb(var(--brand-line)/0.6)] transition hover:from-[rgb(var(--brand-hover))] hover:to-[rgb(var(--brand-dark-hover))] disabled:opacity-60";

const ghostButton =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[rgb(var(--brand-line))] hover:bg-[rgb(var(--tint-50))] disabled:opacity-50";

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-2 focus:ring-[rgb(var(--brand-line)/0.3)]";

/* ---------- helpers ---------- */

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.message || message;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ---------- building blocks ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
    />
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ring-1 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] ${
        disabled
          ? "cursor-not-allowed bg-stone-200 ring-stone-200"
          : checked
          ? "bg-gradient-to-br from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))] ring-[rgb(var(--a1)/0.4)]"
          : "bg-stone-300 ring-stone-300"
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

function StatFlipCard({ label, value, helper, icon, palette, backTitle, rows }) {
  return (
    <FlipCard
      label={label}
      palette={palette}
      front={
        <>
          <span className="flex items-start justify-between">
            <span className="text-sm font-medium text-slate-600">{label}</span>
            <IconChip icon={icon} palette={palette} />
          </span>
          <span className="mt-auto block text-4xl font-semibold tracking-tight text-slate-900" style={serif}>
            {value}
          </span>
          <span className="mt-0.5 block pr-6 text-xs text-slate-600">{helper}</span>
        </>
      }
      back={
        <>
          <BackTitle>{backTitle}</BackTitle>
          {rows.length === 0 ? (
            <span className="text-sm text-white/60">Nothing to show yet.</span>
          ) : (
            rows.map((row) => <BackRow key={row.label} {...row} />)
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

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : "bg-rose-50 text-rose-800 ring-rose-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`} />
      {active ? "Live" : "Off"}
    </span>
  );
}

/* ---------- page ---------- */

export default function BannerPermissions() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [pendingIds, setPendingIds] = useState(new Set());

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch("/api/admin/banners");
      const list = Array.isArray(res) ? res : res?.data || [];
      setBanners(list);
    } catch (err) {
      setLoadError(err.message || "Failed to load banners.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return banners.filter((b) => {
      const matchesQuery =
        b.title?.toLowerCase().includes(q) ||
        b.vendorId?.name?.toLowerCase().includes(q) ||
        b.vendorId?.companyname?.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && b.is_active) ||
        (statusFilter === "inactive" && !b.is_active);
      return matchesQuery && matchesStatus;
    });
  }, [banners, query, statusFilter]);

  const stats = useMemo(() => {
    const vendorMap = {};
    banners.forEach((b) => {
      const name = b.vendorId?.name || "Unknown";
      vendorMap[name] = (vendorMap[name] || 0) + 1;
    });
    return {
      total: banners.length,
      active: banners.filter((b) => b.is_active).length,
      inactive: banners.filter((b) => !b.is_active).length,
      vendors: new Set(banners.map((b) => b.vendorId?._id)).size,
      products: banners.reduce((sum, b) => sum + (b.product_count || 0), 0),
      topVendors: Object.entries(vendorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, value]) => ({ label, value })),
    };
  }, [banners]);

  const setRowPending = (id, isPending) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleActive = async (bannerId, value) => {
    setActionError(null);
    const prevBanners = banners;
    setBanners((prev) => prev.map((b) => (b._id === bannerId ? { ...b, is_active: value } : b)));
    setRowPending(bannerId, true);
    try {
      await apiFetch(`/api/admin/banners/${bannerId}/toggle`, { method: "PATCH" });
    } catch (err) {
      setBanners(prevBanners);
      setActionError(err.message || "Failed to update banner.");
    } finally {
      setRowPending(bannerId, false);
    }
  };

  const bulkSetActive = async (bannerIds, value) => {
    setActionError(null);
    // The endpoint flips state, so only hit rows that actually need to change.
    const idsToToggle = bannerIds.filter((id) => {
      const banner = banners.find((b) => b._id === id);
      return banner && !!banner.is_active !== value;
    });
    if (idsToToggle.length === 0) {
      setSelected([]);
      return;
    }
    const prevBanners = banners;
    setBanners((prev) => prev.map((b) => (idsToToggle.includes(b._id) ? { ...b, is_active: value } : b)));
    idsToToggle.forEach((id) => setRowPending(id, true));
    try {
      await Promise.all(idsToToggle.map((id) => apiFetch(`/api/admin/banners/${id}/toggle`, { method: "PATCH" })));
    } catch (err) {
      setBanners(prevBanners);
      setActionError(err.message || "Failed to update banners.");
    } finally {
      idsToToggle.forEach((id) => setRowPending(id, false));
    }
    setSelected([]);
  };

  const toggleSelected = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((b) => selected.includes(b._id));

  const openEditModal = async (banner) => {
    setEditing(banner);
    setActionError(null);
    setEditLoading(true);
    try {
      const fresh = await apiFetch(`/api/admin/banners/${banner._id}`);
      const data = fresh?.data || fresh;
      if (data) setEditing({ ...banner, ...data });
    } catch (err) {
      console.error("Failed to refresh banner detail:", err);
    } finally {
      setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setActionError(null);
    const original = banners.find((b) => b._id === editing._id);
    try {
      await apiFetch(`/api/banners/${editing._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editing.title,
          discount_percentage: editing.discount_percentage,
          starts_at: editing.starts_at,
          ends_at: editing.ends_at,
        }),
      });
      if (original && !!original.is_active !== !!editing.is_active) {
        await apiFetch(`/api/admin/banners/${editing._id}/toggle`, { method: "PATCH" });
      }
      setBanners((prev) => prev.map((b) => (b._id === editing._id ? editing : b)));
      setEditing(null);
    } catch (err) {
      setActionError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
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
              Super Admin banner control
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Storefront banners
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Review vendor banners, switch them on or off for the storefront, and adjust discounts and run dates.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={ShieldCheck} value={stats.active} label="banners live" />
              <GlanceStat icon={Layers} value={stats.products} label="products linked" />
              <GlanceStat icon={Store} value={stats.vendors} label={stats.vendors === 1 ? "vendor" : "vendors"} />
            </div>
            <button className={goldButton}>Export banner report</button>
          </div>
        </div>
      </section>

      {/* Error banner */}
      {actionError && (
        <div className="flex items-start justify-between gap-2 rounded-[var(--radius-control)] border border-l-4 border-stone-200 border-l-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} aria-label="Dismiss error" className="text-rose-400 hover:text-rose-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Flip stat cards */}
      <section aria-label="Banner metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} />
          Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatFlipCard
            label="Total banners"
            value={stats.total}
            helper="submitted by vendors"
            icon={ImageIcon}
            palette={palettes[1]}
            backTitle="Banners by vendor"
            rows={stats.topVendors}
          />
          <StatFlipCard
            label="Active"
            value={stats.active}
            helper="showing on storefront"
            icon={ShieldCheck}
            palette={palettes[0]}
            backTitle="Live share"
            rows={[
              { label: "Live", value: stats.active },
              { label: "Share of total", value: `${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}%` },
            ]}
          />
          <StatFlipCard
            label="Inactive"
            value={stats.inactive}
            helper="hidden from storefront"
            icon={ShieldOff}
            palette={palettes[2]}
            backTitle="Switched off"
            rows={[
              { label: "Off", value: stats.inactive },
              { label: "Share of total", value: `${stats.total ? Math.round((stats.inactive / stats.total) * 100) : 0}%` },
            ]}
          />
          <StatFlipCard
            label="Vendors"
            value={stats.vendors}
            helper="with at least one banner"
            icon={Store}
            palette={palettes[3]}
            backTitle="Top vendors"
            rows={stats.topVendors}
          />
        </div>
      </section>

      {/* Info note */}
      <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-l-4 border-stone-200 border-l-[rgb(var(--brand))] bg-[rgb(var(--tint-50))] px-4 py-3 text-sm text-slate-700">
        <Info size={16} className="mt-0.5 shrink-0 text-[rgb(var(--brand-text))]" />
        <p>Turning a banner off removes it from the storefront immediately without deleting it. You can turn it back on any time.</p>
      </div>

      {/* Table panel */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
            <ImageIcon size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
            All banners
            <span className="text-xs font-normal text-slate-500" style={{ fontFamily: "inherit" }}>
              {filtered.length} shown
            </span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search banner or vendor"
                className={`${inputClass} pl-9`}
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className={`${inputClass} appearance-none pr-9`}
              >
                <option value="all">All banners</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <button onClick={loadBanners} className={`${ghostButton} py-2.5`}>
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk bar */}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[rgb(var(--brand-line)/0.3)] bg-[rgb(var(--tint-50))] px-6 py-3 text-sm">
            <span className="font-medium text-slate-800">{selected.length} selected</span>
            <button
              onClick={() => bulkSetActive(selected, true)}
              className="rounded-[var(--radius-control)] bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
            >
              Activate
            </button>
            <button
              onClick={() => bulkSetActive(selected, false)}
              className="rounded-[var(--radius-control)] bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100"
            >
              Deactivate
            </button>
            <button onClick={() => setSelected([])} className="text-xs text-slate-500 hover:text-slate-800">
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin text-[rgb(var(--brand-text))]" />
            Loading banners…
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 py-20 text-sm text-rose-700">
            <AlertTriangle size={18} />
            <p>{loadError}</p>
            <button onClick={loadBanners} className={`${ghostButton} mt-1`}>
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-left text-xs font-medium text-slate-500">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all visible banners"
                      checked={allVisibleSelected}
                      onChange={() => setSelected(allVisibleSelected ? [] : filtered.map((b) => b._id))}
                      className="h-3.5 w-3.5 accent-[rgb(var(--brand))]"
                    />
                  </th>
                  <th className="px-3 py-3">Banner</th>
                  <th className="px-3 py-3">Vendor</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Discount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Runs</th>
                  <th className="px-3 py-3">Products</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((b) => {
                  const rowPending = pendingIds.has(b._id);
                  const isSelected = selected.includes(b._id);
                  return (
                    <tr key={b._id} className={`transition-colors hover:bg-stone-50 ${isSelected ? "bg-[rgb(var(--tint-50))]" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${b.title}`}
                          checked={isSelected}
                          onChange={() => toggleSelected(b._id)}
                          className="h-3.5 w-3.5 accent-[rgb(var(--brand))]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {b.image_url ? (
                            <img
                              src={b.image_url}
                              alt={b.title}
                              className="h-10 w-16 shrink-0 rounded-[var(--radius-control)] object-cover ring-1 ring-[rgb(var(--brand-line)/0.4)]"
                            />
                          ) : (
                            <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-stone-50 text-stone-300 ring-1 ring-stone-200">
                              <ImageIcon size={14} />
                            </div>
                          )}
                          <p className="max-w-[200px] truncate font-semibold text-slate-900">{b.title}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900">{b.vendorId?.name || "—"}</p>
                        <p className="text-xs text-slate-500">{b.vendorId?.companyname}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{b.categoryId?.name || "—"}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-0.5 text-lg font-semibold text-[rgb(var(--brand-dark))]" style={serif}>
                          {b.discount_percentage ?? 0}
                          <Percent size={13} strokeWidth={2} />
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Toggle
                            checked={!!b.is_active}
                            disabled={rowPending}
                            onChange={(val) => toggleActive(b._id, val)}
                          />
                          <StatusPill active={!!b.is_active} />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        <p>{formatDate(b.starts_at)}</p>
                        <p>to {formatDate(b.ends_at)}</p>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{b.product_count ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditModal(b)} className={ghostButton}>
                          <Settings2 size={13} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-14 text-center text-slate-500">
                      No banners match this search. Try a different title or vendor name.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-[rgb(var(--brand-line)/0.5)] shadow-2xl">
            <GoldLine className="inset-x-8" />

            <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] px-6 py-4">
              <h2 className="truncate text-2xl font-semibold text-slate-900" style={serif}>
                Edit banner
                <span className="ml-2 text-base font-medium text-slate-500">{editing.title}</span>
              </h2>
              <button onClick={() => setEditing(null)} aria-label="Close" className="text-slate-400 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {editLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={12} className="animate-spin text-[rgb(var(--brand-text))]" />
                  Refreshing latest data…
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">Title</label>
                <input
                  type="text"
                  value={editing.title || ""}
                  onChange={(e) => setEditing((prev) => ({ ...prev, title: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-[var(--radius-control)] border border-stone-200 bg-[rgb(var(--tint-50))] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Active</p>
                  <p className="text-xs text-slate-500">Show this banner on the storefront</p>
                </div>
                <Toggle checked={!!editing.is_active} onChange={(val) => setEditing((prev) => ({ ...prev, is_active: val }))} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">Discount percentage</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.discount_percentage ?? 0}
                  onChange={(e) => setEditing((prev) => ({ ...prev, discount_percentage: Number(e.target.value) }))}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <CalendarDays size={13} className="text-[rgb(var(--brand-text))]" />
                    Starts
                  </label>
                  <input
                    type="date"
                    value={editing.starts_at ? editing.starts_at.slice(0, 10) : ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        starts_at: e.target.value ? new Date(e.target.value).toISOString() : prev.starts_at,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <CalendarDays size={13} className="text-[rgb(var(--brand-text))]" />
                    Ends
                  </label>
                  <input
                    type="date"
                    value={editing.ends_at ? editing.ends_at.slice(0, 10) : ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        ends_at: e.target.value ? new Date(e.target.value).toISOString() : prev.ends_at,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-200 px-6 py-4">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving} className={goldButton}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}