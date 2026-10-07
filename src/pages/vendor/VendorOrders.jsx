import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  Gem,
  Loader2,
  RotateCcw,
  RotateCw,
  Search,
  Timer,
  Truck,
  X,
} from "lucide-react";
import DataPager from "../../components/common/DataPager";

const inr = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

/* ---------- design tokens (same CSS variables as the Dashboard) ---------- */

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

const fallbackBadge = "bg-stone-50 text-stone-700 ring-stone-200";

const statusClass = {
  Delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Shipped: "bg-sky-50 text-sky-800 ring-sky-200",
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  Returned: "bg-rose-50 text-rose-800 ring-rose-200",
  Cancelled: fallbackBadge,
};

const paymentStatusClass = {
  Paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  Failed: "bg-rose-50 text-rose-800 ring-rose-200",
  Refunded: fallbackBadge,
};

// Keep this list in sync with whatever your backend accepts for `status`.
const STATUS_OPTIONS = ["Pending", "Shipped", "Delivered", "Returned", "Cancelled"];

/* ---------- helpers (unchanged) ---------- */

const toTitleCase = (str = "") => (str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "-");

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Backend billing_address / shipping_address is an object
// { line1, line2, city, state, pincode, country } - convert it to a readable string.
const formatAddress = (addr) => {
  if (!addr) return null;
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country].filter(
    Boolean
  );
  return parts.length ? parts.join(", ") : null;
};

// "adminSession" in localStorage holds email, name, role, allowedPaths and vendorId.
const ADMIN_SESSION_KEY = "adminSession";

const getAdminSession = () => {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse adminSession:", err);
    return null;
  }
};

const getVendorIdFromSession = () => {
  const session = getAdminSession();
  return session?.vendorId || null;
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

function DetailLabel({ children }) {
  return <p className="text-xs font-medium text-slate-500">{children}</p>;
}

/* ---------- Order details modal ---------- */

function OrderDetailsModal({ order, onClose, onStatusChange, statusUpdating }) {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.id}`}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius-card)] bg-white ring-1 ring-[rgb(var(--brand-line)/0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <GoldLine className="inset-x-10" />

        <div className="flex items-center justify-between border-b border-stone-200 bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] px-6 py-5">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Order details
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900" style={serif}>
              {order.id}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="rounded-[var(--radius-control)] p-1.5 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <DetailLabel>Vendor</DetailLabel>
              <p className="mt-1 font-semibold text-slate-900">{order.vendorName}</p>
              <p className="text-xs text-slate-500">{order.vendorEmail}</p>
            </div>
            <div>
              <DetailLabel>Placed on</DetailLabel>
              <p className="mt-1 font-semibold text-slate-900">{order.dateTime}</p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-2">
            <div>
              <DetailLabel>Shipping address</DetailLabel>
              <p className="mt-1 text-sm text-slate-700">{order.shippingAddress}</p>
            </div>
            <div>
              <DetailLabel>Billing address</DetailLabel>
              <p className="mt-1 text-sm text-slate-700">{order.billingAddress}</p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-3">
            <div>
              <DetailLabel>Payment method</DetailLabel>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                <Truck size={14} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
                {order.channel}
              </div>
            </div>
            <div>
              <DetailLabel>Payment status</DetailLabel>
              <span
                className={`mt-1 inline-flex rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${
                  paymentStatusClass[order.paymentStatus] || fallbackBadge
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <div>
              <DetailLabel>Order status</DetailLabel>
              <select
                value={order.status}
                disabled={statusUpdating}
                onChange={(e) => onStatusChange(order, e.target.value)}
                className={`mt-1 w-full rounded-[var(--radius-control)] border-0 px-2.5 py-1.5 text-xs font-semibold ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))] ${
                  statusClass[order.status] || fallbackBadge
                } ${statusUpdating ? "opacity-60" : ""}`}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-5">
            <h3 className="mb-2 text-lg font-semibold text-slate-900" style={serif}>
              Items
            </h3>
            <div className="overflow-x-auto rounded-[var(--radius-control)] border border-stone-200">
              <table className="w-full text-sm">
                <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold">Unit price</th>
                    <th className="px-4 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-slate-900">{item.name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{inr(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{inr(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-stone-200">
                  <tr>
                    <td colSpan={3} className="px-4 pt-3 text-right font-medium text-slate-600">
                      Subtotal
                    </td>
                    <td className="px-4 pt-3 text-right font-semibold text-slate-900">{inr(order.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 pb-3 text-right font-medium text-slate-600">
                      Total
                    </td>
                    <td className="px-4 pb-3 text-right text-xl font-semibold text-[rgb(var(--brand-text))]" style={serif}>
                      {inr(order.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Order ID: <span className="font-mono">{order.mongoId}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function Orders() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal + status-update state
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      setLoading(true);
      setError(null);

      const vendorId = getVendorIdFromSession();

      if (!vendorId) {
        if (!cancelled) {
          setError("Vendor ID not found. Please login again.");
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`https://amazon-multi-vendor-3.onrender.com/api/orders/vendor/${vendorId}`);
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error("API returned an unsuccessful response");
        if (!cancelled) setOrders(json.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize API orders into the shape the table/cards/modal expect
  const normalizedOrders = useMemo(
    () =>
      orders.map((order) => {
        const shippingAddr = formatAddress(order.shipping_address);
        const billingAddr = formatAddress(order.billing_address);

        return {
          id: order.order_number,
          mongoId: order._id,
          vendorName: order.vendorId?.companyname?.trim() || order.vendorId?.email || "Unknown vendor",
          vendorEmail: order.vendorId?.email || "-",
          customerAddress: shippingAddr || billingAddr || "Guest customer",
          shippingAddress: shippingAddr || "-",
          billingAddress: billingAddr || "-",
          channel: order.payment_method || "-",
          paymentStatus: toTitleCase(order.payment_status),
          date: formatDate(order.createdAt),
          dateTime: formatDateTime(order.createdAt),
          itemCount: order.items?.length || 0,
          items: (order.items || []).map((item) => ({
            id: item._id,
            name: item.product_name || "Unnamed product",
            quantity: item.quantity || 0,
            unitPrice: item.unit_price || 0,
            total: item.total ?? (item.unit_price || 0) * (item.quantity || 0),
          })),
          subtotal: order.subtotal,
          total: order.total,
          currency: order.currency || "INR",
          status: toTitleCase(order.status),
          raw: order,
        };
      }),
    [orders]
  );

  const visibleOrders = useMemo(
    () =>
      normalizedOrders.filter((order) => {
        const itemNames = order.items.map((i) => i.name).join(" ");
        const haystack = `${order.id} ${order.customerAddress} ${order.status} ${order.vendorName} ${itemNames}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [normalizedOrders, query]
  );

  const pagedOrders = visibleOrders.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const selectedOrder = useMemo(
    () => normalizedOrders.find((o) => o.mongoId === selectedOrderId) || null,
    [normalizedOrders, selectedOrderId]
  );

  // ---- Status update handler ----
  // NOTE: confirm this endpoint/method/payload against your actual backend route
  // for updating an order's status (it may be PUT/PATCH and a different path).
  const handleStatusChange = async (order, newStatusLabel) => {
    const previousStatusRaw = order.raw.status;
    const newStatusApiValue = newStatusLabel.toLowerCase();

    setStatusUpdatingId(order.mongoId);
    // Optimistic update so the badge/select reflects the change immediately
    setOrders((prev) =>
      prev.map((o) => (o._id === order.mongoId ? { ...o, status: newStatusApiValue } : o))
    );

    try {
      const res = await fetch(
        `https://amazon-multi-vendor-3.onrender.com/api/orders/${order.mongoId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatusApiValue }),
        }
      );
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error("API returned an unsuccessful response");
    } catch (err) {
      // Revert on failure
      setOrders((prev) =>
        prev.map((o) => (o._id === order.mongoId ? { ...o, status: previousStatusRaw } : o))
      );
      window.alert(`Could not update status: ${err.message || "unknown error"}`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /* ---- display-only summaries ---- */
  const orderValue = visibleOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const paidCount = visibleOrders.filter((order) => order.paymentStatus === "Paid").length;

  // Back of each status card: value and payment breakdown for that status.
  const backRowsFor = (status) => {
    const list = visibleOrders.filter((order) => order.status === status);
    const counts = list.reduce((acc, order) => {
      acc[order.paymentStatus] = (acc[order.paymentStatus] || 0) + 1;
      return acc;
    }, {});
    return [
      { label: "Order value", value: inr(list.reduce((sum, order) => sum + (order.total || 0), 0)), valueClass: gold },
      ...Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, value]) => ({ label: `Payment ${label.toLowerCase()}`, value })),
    ];
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
              <GlanceStat icon={CheckCircle2} value={paidCount} label="paid orders" />
            </div>

            <label className="relative block w-full lg:w-80">
              <span className="sr-only">Search orders</span>
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search orders, products, address"
                className="w-full rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/80 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Status flip cards */}
      <section aria-label="Order status summary">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} />
          Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statusMeta.map((item) => {
            const palette = palettes[item.status];
            const count = visibleOrders.filter((order) => order.status === item.status).length;
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
                    <BackTitle>{item.status} orders</BackTitle>
                    {count === 0 ? (
                      <span className="text-sm text-white/60">Nothing to show yet.</span>
                    ) : (
                      backRowsFor(item.status).map((row) => <BackRow key={row.label} {...row} />)
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
          {!loading && !error && <span className="text-xs text-slate-500">{visibleOrders.length} orders</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading orders…</span>
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center text-sm text-rose-700">
            Failed to load orders: {error}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No orders found. Try a different search term.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Order</th>
                    <th className="px-6 py-3 font-semibold">Vendor</th>
                    <th className="px-6 py-3 font-semibold">Address</th>
                    <th className="px-6 py-3 font-semibold">Payment</th>
                    <th className="px-6 py-3 font-semibold">Total</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 text-center font-semibold">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {pagedOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[rgb(var(--brand-text))]">{order.id}</p>
                        <p className="text-xs text-slate-500">
                          {order.dateTime}, {order.itemCount} item(s)
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{order.vendorName}</p>
                        <p className="text-xs text-slate-500">{order.vendorEmail}</p>
                      </td>
                      <td className="max-w-[220px] truncate px-6 py-4 text-slate-700" title={order.customerAddress}>
                        {order.customerAddress}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Truck size={15} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
                          {order.channel}
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${
                            paymentStatusClass[order.paymentStatus] || fallbackBadge
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-lg font-semibold text-slate-900" style={serif}>
                        {inr(order.total)}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={order.status}
                          disabled={statusUpdatingId === order.mongoId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          aria-label={`Status for ${order.id}`}
                          className={`rounded-[var(--radius-control)] border-0 px-2.5 py-1 text-xs font-semibold ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))] ${
                            statusClass[order.status] || fallbackBadge
                          } ${statusUpdatingId === order.mongoId ? "opacity-60" : ""}`}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.mongoId)}
                          className="inline-flex items-center justify-center rounded-[var(--radius-control)] p-2 text-slate-500 transition-colors hover:bg-stone-100 hover:text-[rgb(var(--brand-text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
                          title="View order details"
                          aria-label={`View details for ${order.id}`}
                        >
                          <Eye size={17} strokeWidth={1.6} />
                        </button>
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
          </>
        )}
      </section>

      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={handleStatusChange}
        statusUpdating={statusUpdatingId === selectedOrder?.mongoId}
      />
    </div>
  );
}