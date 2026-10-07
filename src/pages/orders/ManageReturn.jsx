import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package,
  Clock,
  Wallet,
  CheckCircle2,
  Search,
  Eye,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  Gem,
  RotateCw,
  RotateCcw,
} from "lucide-react";
import { apiUrl } from "../../config/api";

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
    front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]",
    back: "from-[rgb(var(--p4-b1))] to-[rgb(var(--p4-b2))]",
    chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]",
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
];

// status -> pill classes + row rail (left border) + display label
const STATUS_META = {
  requested: { label: "Pending action", pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", rail: "border-l-amber-500" },
  pending: { label: "Pending action", pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", rail: "border-l-amber-500" },
  approved: { label: "Approved", pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", rail: "border-l-emerald-500" },
  transit: { label: "In transit", pill: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500", rail: "border-l-sky-500" },
  in_transit: { label: "In transit", pill: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500", rail: "border-l-sky-500" },
  completed: { label: "Completed", pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", rail: "border-l-emerald-500" },
  rejected: { label: "Rejected", pill: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500", rail: "border-l-rose-500" },
};

const FALLBACK_META = {
  label: "Unknown",
  pill: "bg-stone-50 text-stone-700 ring-stone-200",
  dot: "bg-stone-400",
  rail: "border-l-stone-400",
};

const STATUS_OPTIONS = ["pending", "approved", "transit", "completed", "rejected"];

const TABS = [
  { key: "pendingActions", label: "Pending actions", statuses: ["requested", "pending"] },
  { key: "all", label: "All returns", statuses: null },
  { key: "inTransit", label: "In transit", statuses: ["transit", "in_transit"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
];

/* ---------- API helpers (unchanged) ---------- */

// mirrors the authConfig()/adminToken pattern used elsewhere (Orders.jsx, Products.jsx)
function authConfig() {
  const token = localStorage.getItem("adminToken");
  const valid = token && token !== "null" && token !== "undefined";
  return valid ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

// no external lib — same base64url decode pattern used to pull vendorId out of adminToken
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getVendorId() {
  const token = localStorage.getItem("adminToken");
  if (!token || token === "null" || token === "undefined") return null;
  const decoded = decodeToken(token);
  return decoded?.id || decoded?._id || decoded?.vendorId || null;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Status lives on the same record this list endpoint returns
// (GET /api/orders/vendordata/:vendorId), so the update reuses that same
// route family instead of a separate one — just addressed by the return's
// own _id and sent as PATCH. If your backend expects PUT, or a different
// param/body shape, this is the one place to adjust.
async function updateReturnStatus(returnId, status) {
  const res = await fetch(apiUrl(`/api/orders/vendordata/${returnId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(authConfig().headers || {}) },
    body: JSON.stringify({ status }),
  });
  const body = await safeJson(res);
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `Update failed (${res.status})`);
  }
  return body;
}

/* ---------- formatting helpers (unchanged) ---------- */

function formatDate(iso, withTime) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const base = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (!withTime) return base;
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${base}, ${time}`;
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatAddress(addr) {
  if (!addr) return "—";
  return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country]
    .filter(Boolean)
    .join(", ");
}

// Flattens one returns record from GET /orders/vendordata/:vendorId, keeping the
// raw nested record around too so the detail modal has everything it needs.
function mapReturnRecord(r) {
  const order = r.orderId || {};
  const item = r.orderItemId || {};
  const product = r.productId || {};
  const variant = r.variantId || {};
  const thumb = (variant.images && variant.images[0]) || (product.images && product.images[0]) || null;
  const refundAmount = Number(item.total ?? item.unit_price ?? 0);

  return {
    id: r._id,
    orderId: order.order_number || order._id || "—",
    date: formatDate(r.createdAt),
    productName: item.product_name || product.productName || "—",
    sku: variant.sku || product.sku || "—",
    thumb,
    qty: r.quantity ?? item.quantity ?? 1,
    reason: r.reason || "—",
    notes: r.notes || "",
    status: (r.status || "").toLowerCase(),
    refundAmount,
    refund: formatCurrency(refundAmount),
    raw: r,
  };
}

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

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-[var(--radius-control)] bg-stone-200/80 ${className}`} />;
}

function SkeletonRows({ rows = 5 }) {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="flex items-center gap-3" key={i}>
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="h-5 w-24 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Clickable status pill -> small floating menu (no external lib) listing the
// other statuses. Used in the table row and in the modal.
function StatusEditor({ status, returnId, busy, onChange, align = "left" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const meta = STATUS_META[status] || { ...FALLBACK_META, label: status || "Unknown" };

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEscape);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={open}
        className="rounded-[var(--radius-control)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] disabled:cursor-default disabled:opacity-70"
      >
        <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.pill}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {busy ? "Updating…" : meta.label}
          <ChevronDown size={12} className="opacity-60" />
        </span>
      </button>

      {open && (
        <ul
          className={`absolute z-20 mt-1.5 w-44 overflow-hidden rounded-[var(--radius-control)] border border-stone-200 bg-white py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {STATUS_OPTIONS.map((key) => {
            const optMeta = STATUS_META[key];
            const isActive = key === status;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (key !== status) onChange(returnId, key);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-stone-50 ${
                    isActive ? "bg-stone-50 font-semibold text-slate-900" : "text-slate-600"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${optMeta.dot}`} />
                  {optMeta.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

function ReturnDetailModal({ record, busy, onClose, onStatusChange }) {
  useEffect(() => {
    function onEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  if (!record) return null;
  const r = record.raw;
  const order = r.orderId || {};
  const item = r.orderItemId || {};
  const product = r.productId || {};
  const variant = r.variantId || {};
  const customer = r.customerId || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Return for ${record.productName}`}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] bg-white ring-1 ring-[rgb(var(--brand-line)/0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <GoldLine className="inset-x-10" />

        <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] px-6 py-5">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Return for order {order.order_number || "—"}
            </p>
            <h3 className="mt-1 truncate text-2xl font-semibold text-slate-900" style={serif}>
              {record.productName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-[var(--radius-control)] p-1.5 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-wrap gap-4 rounded-[var(--radius-control)] border border-stone-200 p-4">
            {record.thumb ? (
              <img
                src={record.thumb}
                alt={record.productName}
                className="h-16 w-16 shrink-0 rounded-[var(--radius-control)] border border-stone-200 object-cover"
              />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-[var(--radius-control)] border border-stone-200 bg-stone-50" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-slate-900">{record.productName}</div>
              <div className="mt-0.5 text-sm text-slate-500">
                Brand: {product.brandName || "—"}, SKU: {variant.sku || product.sku || "—"}
              </div>
              <div className="text-sm text-slate-500">
                Variant: {variant.variantName || "—"}, Qty returned: {record.qty}
              </div>
              <div className="mt-2">
                <StatusEditor status={record.status} returnId={record.id} busy={busy} onChange={onStatusChange} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-xs font-medium text-amber-800">Reason for return</div>
            <div className="mt-0.5 text-sm font-medium text-amber-900">{record.reason}</div>
            {record.notes && <div className="mt-1 text-sm text-amber-800">Customer note: {record.notes}</div>}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--radius-control)] border border-stone-200 p-4">
              <h4 className="mb-1 text-lg font-semibold text-slate-900" style={serif}>
                Customer
              </h4>
              <div className="divide-y divide-stone-100">
                <DetailRow label="Name" value={customer.name || "—"} />
                <DetailRow label="Email" value={<span className="block max-w-[180px] truncate">{customer.email || "—"}</span>} />
                <DetailRow label="Phone" value={customer.number || "—"} />
                <DetailRow label="Shipping" value={formatAddress(order.shipping_address)} />
                <DetailRow label="Billing" value={formatAddress(order.billing_address)} />
              </div>
            </div>
            <div className="rounded-[var(--radius-control)] border border-stone-200 p-4">
              <h4 className="mb-1 text-lg font-semibold text-slate-900" style={serif}>
                Order and refund
              </h4>
              <div className="divide-y divide-stone-100">
                <DetailRow label="Order number" value={order.order_number || "—"} />
                <DetailRow label="Order placed" value={formatDate(order.createdAt)} />
                <DetailRow label="Return requested" value={formatDate(r.createdAt, true)} />
                <DetailRow label="Payment method" value={order.payment_method || "—"} />
                <DetailRow label="Unit price" value={formatCurrency(item.unit_price)} />
                <DetailRow label="Refund amount" value={formatCurrency(item.total ?? item.unit_price)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function ManageReturns() {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function fetchReturns() {
      setLoading(true);
      setError(null);

      const vendorId = getVendorId();
      if (!vendorId) {
        setError("Couldn't determine vendor from your session. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl(`/api/orders/vendordata/${vendorId}`), { ...authConfig() });
        const body = await safeJson(res);

        if (!res.ok || !body?.success) {
          throw new Error(body?.message || `Request failed (${res.status})`);
        }

        setReturns((body.data || []).map(mapReturnRecord));
      } catch (err) {
        setError(err.message || "Failed to load returns");
      } finally {
        setLoading(false);
      }
    }

    fetchReturns();
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedId ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const selectedReturn = useMemo(
    () => returns.find((r) => r.id === selectedId) || null,
    [returns, selectedId]
  );

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach((t) => {
      counts[t.key] = t.statuses ? returns.filter((r) => t.statuses.includes(r.status)).length : returns.length;
    });
    return counts;
  }, [returns]);

  const summary = useMemo(() => {
    const total = returns.length;
    const pending = returns.filter((r) => ["requested", "pending"].includes(r.status)).length;
    const completed = returns.filter((r) => r.status === "completed").length;
    const refundValue = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, refundValue, completionRate };
  }, [returns]);

  // Display-only breakdowns for the back of the summary cards.
  const breakdown = useMemo(() => {
    const byLabel = {};
    returns.forEach((r) => {
      const label = (STATUS_META[r.status] || FALLBACK_META).label;
      byLabel[label] = byLabel[label] || { count: 0, value: 0 };
      byLabel[label].count += 1;
      byLabel[label].value += r.refundAmount || 0;
    });
    return Object.entries(byLabel).sort((a, b) => b[1].count - a[1].count);
  }, [returns]);

  const pendingValue = useMemo(
    () =>
      returns
        .filter((r) => ["requested", "pending"].includes(r.status))
        .reduce((sum, r) => sum + (r.refundAmount || 0), 0),
    [returns]
  );

  const rejectedCount = returns.filter((r) => r.status === "rejected").length;

  const visibleReturns = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab || !tab.statuses) return returns;
    return returns.filter((r) => tab.statuses.includes(r.status));
  }, [returns, activeTab]);

  const filtered = visibleReturns.filter(
    (r) =>
      r.orderId.toLowerCase().includes(query.toLowerCase()) ||
      r.productName.toLowerCase().includes(query.toLowerCase())
  );

  async function handleStatusChange(returnId, nextStatus) {
    const previous = returns.find((r) => r.id === returnId)?.status;
    setUpdatingId(returnId);
    setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, status: nextStatus } : r)));

    try {
      await updateReturnStatus(returnId, nextStatus);
      setToast({ type: "success", message: `Status updated to "${STATUS_META[nextStatus]?.label}".` });
    } catch (err) {
      setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, status: previous } : r)));
      setToast({ type: "error", message: err.message || "Couldn't update status." });
    } finally {
      setUpdatingId(null);
    }
  }

  const dash = (value) => (loading ? "—" : value);

  const metrics = [
    {
      label: "Total returns",
      value: dash(summary.total),
      icon: Package,
      palette: palettes[0],
      helper: "Last 90 days",
      backTitle: "Returns by status",
      backRows: breakdown.slice(0, 4).map(([label, data]) => ({ label, value: data.count })),
    },
    {
      label: "Needs action",
      value: dash(summary.pending),
      icon: Clock,
      palette: palettes[1],
      helper: "Awaiting your decision",
      backTitle: "Waiting on you",
      backRows: [
        { label: "Open returns", value: summary.pending },
        { label: "Refund at stake", value: formatCurrency(pendingValue), valueClass: gold },
      ],
    },
    {
      label: "Refund value",
      value: dash(formatCurrency(summary.refundValue)),
      icon: Wallet,
      palette: palettes[2],
      helper: "Across all statuses",
      backTitle: "Refund by status",
      backRows: breakdown.slice(0, 4).map(([label, data]) => ({ label, value: formatCurrency(data.value) })),
    },
    {
      label: "Completion rate",
      value: dash(`${summary.completionRate}%`),
      icon: CheckCircle2,
      palette: palettes[3],
      helper: "Resolved returns",
      backTitle: "Outcome",
      backRows: [
        { label: "Completed", value: summary.completed },
        { label: "Rejected", value: rejectedCount },
        { label: "Still open", value: Math.max(summary.total - summary.completed - rejectedCount, 0) },
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
              Vendor workspace
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Manage returns
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Review return requests, decide on refunds, and follow each return until it is resolved.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={Clock} value={dash(summary.pending)} label="need your action" />
              <GlanceStat icon={RotateCcw} value={dash(summary.total)} label="total returns" />
              <GlanceStat icon={CheckCircle2} value={dash(`${summary.completionRate}%`)} label="resolved" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
              >
                Export report
              </button>
              <button
                type="button"
                className="rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]"
              >
                Return settings
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Summary flip cards */}
      <section aria-label="Returns summary">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} />
          Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <FlipCard
              key={metric.label}
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
                  {loading || metric.backRows.length === 0 ? (
                    <span className="text-sm text-white/60">Nothing to show yet.</span>
                  ) : (
                    metric.backRows.map((row) => <BackRow key={row.label} {...row} />)
                  )}
                </>
              }
            />
          ))}
        </div>
      </section>

      {/* Returns table */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />

        {/* tabs */}
        <div className="flex flex-wrap gap-1 border-b border-stone-200 px-4 pt-3">
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))] ${
                  active
                    ? "border-[rgb(var(--brand))] text-[rgb(var(--brand-text))]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    active ? "bg-[rgb(var(--tint-100))] text-[rgb(var(--brand-text))]" : "bg-stone-100 text-slate-500"
                  }`}
                >
                  {tabCounts[t.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-6 py-4">
          <label className="relative block w-full max-w-xs">
            <span className="sr-only">Search returns</span>
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by order ID or product name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-control)] border border-stone-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]"
            />
          </label>
          {["Last 90 days ▾", "IN · Marketplaces (1) ▾", "Return reason ▾"].map((label) => (
            <button
              key={label}
              type="button"
              className="h-9 rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
            >
              {label}
            </button>
          ))}
        </div>

        {/* body */}
        {loading ? (
          <SkeletonRows rows={5} />
        ) : error ? (
          <div className="py-14 text-center">
            <div className="mb-1 font-semibold text-rose-700">Couldn't load returns</div>
            <div className="text-sm text-slate-500">{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mb-1 text-lg font-semibold text-slate-900" style={serif}>
              No returns found
            </div>
            <div className="text-sm text-slate-500">Try a different search term or change your filters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-left text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Product</th>
                  <th className="w-32 px-6 py-3 font-semibold">Return date</th>
                  <th className="w-28 px-6 py-3 text-right font-semibold">Refund</th>
                  <th className="w-44 px-6 py-3 font-semibold">Status</th>
                  <th className="w-16 px-6 py-3 text-center font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r, idx) => {
                  const meta = STATUS_META[r.status] || FALLBACK_META;
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-stone-50">
                      <td className={`border-l-4 px-6 py-3 ${meta.rail}`}>
                        <div className="flex items-center gap-3">
                          {r.thumb ? (
                            <img
                              src={r.thumb}
                              alt={r.productName}
                              className="h-10 w-10 shrink-0 rounded-[var(--radius-control)] border border-stone-200 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 shrink-0 rounded-[var(--radius-control)] border border-stone-200 bg-stone-50" />
                          )}
                          <div className="min-w-0">
                            <div className="max-w-[280px] truncate font-semibold text-slate-900">{r.productName}</div>
                            <div className="whitespace-nowrap text-xs text-slate-500">
                              Order {r.orderId}, Qty {r.qty}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-slate-600">{r.date}</td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-lg font-semibold text-slate-900" style={serif}>
                        {r.refund}
                      </td>
                      <td className="px-6 py-3">
                        <StatusEditor
                          status={r.status}
                          returnId={r.id}
                          busy={updatingId === r.id}
                          onChange={handleStatusChange}
                          align={idx >= filtered.length - 2 ? "right" : "left"}
                        />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          title="View full details"
                          aria-label={`View details for ${r.productName}`}
                          className="inline-flex items-center justify-center rounded-[var(--radius-control)] p-2 text-slate-500 transition-colors hover:bg-stone-100 hover:text-[rgb(var(--brand-text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
                        >
                          <Eye size={17} strokeWidth={1.6} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* footer */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-6 py-3">
            <span className="text-xs text-slate-500">
              1–{filtered.length} of {filtered.length} returns
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
        )}
      </section>

      {selectedReturn && (
        <ReturnDetailModal
          record={selectedReturn}
          busy={updatingId === selectedReturn.id}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[100] rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.type === "error" ? "bg-rose-700" : "bg-slate-900"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

