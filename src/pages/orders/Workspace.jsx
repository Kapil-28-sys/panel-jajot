import React, { useEffect, useMemo, useRef, useState } from "react";
import { PackageCheck, Clock3, Undo2 } from "lucide-react";
import { apiUrl } from "../../config/api";

/* =========================================================
   THEME — driven by the same CSS variables as Dashboard,
   Inventory, Attributes and Banners (--brand, --hero-*,
   --tint-*, etc.). Fallback values are used only if a
   variable isn't defined.
   ========================================================= */
const styles = `
.orders-workspace {
  --accent: rgb(var(--brand, 180 120 20));
  --accent-dark: rgb(var(--brand-dark, 140 90 10));
  --accent-text: rgb(var(--brand-text, 140 90 10));
  --accent-soft: rgb(var(--tint-100, 250 243 224));
  --accent-dim: rgb(var(--brand-line, 200 160 80) / 0.55);
  --line: rgb(var(--brand-line, 200 160 80));
  --bg: rgb(var(--page-bg, 247 245 240));
  --surface: #ffffff;
  --border: #e7e5e4;
  --border-soft: #f1efec;
  --ink: #0f172a;
  --ink-dim: #475569;
  --ink-faint: #94a3b8;
  --ok: #065f46;
  --rose: #9f1239;
  --radius-c: var(--radius-card, 14px);
  --radius-k: var(--radius-control, 8px);
  --display: var(--font-display, Georgia, serif);

  background: var(--bg);
  color: var(--ink);
  padding: 24px;
  min-height: 100vh;
}
.orders-workspace * { box-sizing: border-box; }
.orders-workspace a:focus-visible,
.orders-workspace button:focus-visible,
.orders-workspace .card:focus-visible { outline: 2px solid var(--line); outline-offset: 2px; }

/* hero — same look as the other pages */
.orders-workspace .hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding: 32px 36px;
  border-radius: var(--radius-c);
  background: linear-gradient(135deg, rgb(var(--hero-a, 253 248 235)), rgb(var(--hero-b, 250 240 215)), rgb(var(--hero-c, 247 232 195)));
  box-shadow: 0 0 0 1px rgb(var(--brand-line, 200 160 80) / 0.4);
}
.orders-workspace .gold-line {
  position: absolute;
  top: 0;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(to right, transparent, var(--line), transparent);
}
.orders-workspace .hero .gold-line { left: 64px; right: 64px; }
.orders-workspace .card .gold-line { left: 40px; right: 40px; }
.orders-workspace .hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--accent-dark);
}
.orders-workspace .hero h1 {
  margin: 8px 0 0;
  font-family: var(--display);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.orders-workspace .hero-copy {
  margin: 10px 0 0;
  max-width: 520px;
  font-size: 13.5px;
  line-height: 1.6;
  color: #475569;
}
.orders-workspace .glance { display: flex; flex-wrap: wrap; row-gap: 14px; }
.orders-workspace .glance-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-left: 1px solid rgb(var(--brand-line, 200 160 80) / 0.4);
  color: var(--accent-text);
}
.orders-workspace .glance-stat:first-child { padding-left: 0; border-left: none; }
.orders-workspace .glance-stat:last-child { padding-right: 0; }
.orders-workspace .glance-stat strong {
  display: block;
  font-family: var(--display);
  font-size: 26px;
  line-height: 1;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.orders-workspace .glance-stat span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

/* fixed 2x2 grid of big cards */
.orders-workspace .grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
@media (max-width: 760px) {
  .orders-workspace { padding: 16px; }
  .orders-workspace .grid { grid-template-columns: 1fr; }
  .orders-workspace .hero { padding: 24px 20px; }
  .orders-workspace .hero h1 { font-size: 28px; }
}

.orders-workspace .card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 360px;
  padding: 20px 22px;
  background: var(--surface);
  border-radius: var(--radius-c);
  box-shadow: 0 0 0 1px #e7e5e4;
  transition: box-shadow 0.16s ease, opacity 0.16s ease;
}
.orders-workspace .card:hover { box-shadow: 0 0 0 1px var(--accent-dim), 0 6px 16px rgba(15, 23, 42, 0.07); }
.orders-workspace .card.is-dragging { opacity: 0.35; }
.orders-workspace .card.is-drag-over { box-shadow: 0 0 0 2px var(--accent); }

.orders-workspace .card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2px;
}
.orders-workspace .card-title {
  margin: 0;
  font-family: var(--display);
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
}
.orders-workspace .drag-handle {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin: -4px;
  padding: 4px;
  border-radius: var(--radius-k);
  color: var(--ink-faint);
  cursor: grab;
  transition: background 0.12s ease, color 0.12s ease;
}
.orders-workspace .drag-handle:hover { background: var(--accent-soft); color: var(--accent-text); }
.orders-workspace .drag-handle:active { cursor: grabbing; }
.orders-workspace .card-link {
  display: inline-block;
  margin: 2px 0 14px 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-text);
  text-decoration: none;
}
.orders-workspace .card-link:hover { text-decoration: underline; }

.orders-workspace .period-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--ink-dim);
}
.orders-workspace .pill {
  padding: 3px 11px;
  border: 1px solid #d6d3d1;
  border-radius: var(--radius-k);
  background: #fff;
  font-size: 12px;
  color: var(--ink);
  cursor: pointer;
}
.orders-workspace .checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12.5px;
  color: var(--ink);
}
.orders-workspace .checkbox-row input { margin: 0; accent-color: var(--accent); }

.orders-workspace .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  text-align: center;
  color: var(--ink-dim);
}
.orders-workspace .empty-state .empty-icon { width: 64px; height: 64px; margin-bottom: 12px; opacity: 0.55; }
.orders-workspace .empty-state .empty-title {
  margin-bottom: 4px;
  font-family: var(--display);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
}
.orders-workspace .empty-state .empty-sub { max-width: 260px; font-size: 12.5px; color: var(--ink-dim); }

.orders-workspace .state-msg {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-dim);
}
.orders-workspace .state-msg.is-error { color: var(--rose); }

.orders-workspace .stat-list { display: flex; flex-direction: column; gap: 18px; margin-top: 6px; }
.orders-workspace .stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-soft);
}
.orders-workspace .stat-row:last-child { padding-bottom: 0; border-bottom: none; }
.orders-workspace .stat-label { font-size: 14px; color: var(--ink); }
.orders-workspace .stat-value {
  padding: 0;
  border: none;
  background: none;
  font-family: var(--display);
  font-size: 24px;
  font-weight: 600;
  color: var(--accent-text);
  text-decoration: none;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.orders-workspace .stat-value:hover { text-decoration: underline; }
.orders-workspace .stat-sub {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  font-weight: 400;
  text-align: right;
  color: var(--ink-dim);
}

.orders-workspace .success-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}
.orders-workspace .success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #ecfdf5;
}
.orders-workspace .success-icon svg { width: 28px; height: 28px; }
.orders-workspace .success-text { max-width: 260px; font-size: 14px; color: var(--ink); }

.orders-workspace .order-list { display: flex; flex-direction: column; gap: 12px; margin-top: 2px; overflow-y: auto; }
.orders-workspace .order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 11px;
  border-bottom: 1px solid var(--border-soft);
}
.orders-workspace .order-row:last-child { padding-bottom: 0; border-bottom: none; }
.orders-workspace .order-main { min-width: 0; }
.orders-workspace .order-id {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-text);
  text-decoration: none;
}
.orders-workspace .order-id:hover { text-decoration: underline; }
.orders-workspace .order-meta {
  overflow: hidden;
  font-size: 12px;
  color: var(--ink-dim);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.orders-workspace .order-right { flex-shrink: 0; text-align: right; }
.orders-workspace .order-total {
  font-family: var(--display);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.orders-workspace .order-pill {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-k);
  font-size: 11px;
  font-weight: 600;
}

.orders-workspace .rates-list { display: flex; flex-direction: column; gap: 18px; margin-top: 12px; }

.orders-workspace .drop-caret {
  position: absolute;
  top: -10px;
  left: 20px;
  right: 20px;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--accent), var(--accent-dark));
}

@media (prefers-reduced-motion: reduce) {
  .orders-workspace .card, .orders-workspace .drag-handle { transition: none; }
}
`;

// status -> small pill used on individual order rows
const ORDER_STATUS_META = {
  requested: { label: "Pending", bg: "#fef3c7", color: "#92400e" },
  pending: { label: "Pending", bg: "#fef3c7", color: "#92400e" },
  approved: { label: "Approved", bg: "#d1fae5", color: "#065f46" },
  transit: { label: "In transit", bg: "#e0f2fe", color: "#075985" },
  in_transit: { label: "In transit", bg: "#e0f2fe", color: "#075985" },
  completed: { label: "Completed", bg: "#d1fae5", color: "#065f46" },
  rejected: { label: "Rejected", bg: "#ffe4e6", color: "#9f1239" },
};

const CARD_ORDER_STORAGE_KEY = "ordersWorkspaceCardOrder";
const DEFAULT_CARD_ORDER = ["orders", "returns", "claims", "deliveryRates"];

// mirrors the authConfig()/adminToken pattern used elsewhere (Orders.jsx, ManageReturns.jsx)
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

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

function loadStoredCardOrder() {
  try {
    const raw = localStorage.getItem(CARD_ORDER_STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CARD_ORDER;
    // guard against a stale saved order missing/adding keys after a code change
    const valid = parsed.filter((key) => DEFAULT_CARD_ORDER.includes(key));
    const missing = DEFAULT_CARD_ORDER.filter((key) => !valid.includes(key));
    return [...valid, ...missing];
  } catch {
    return DEFAULT_CARD_ORDER;
  }
}

// Same feed ManageReturns.jsx reads (GET /api/orders/vendordata/:vendorId).
// Records are order-item / return-action rows; both the Orders card and the
// Returns card derive their view from this one fetch instead of hitting the
// backend twice. If your backend later exposes a dedicated orders endpoint
// with real fulfillment status (Shipped/Delivered/etc.), point this at that
// instead and drop the "derived from returns feed" framing below.
function useVendorData() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      const vendorId = getVendorId();
      if (!vendorId) {
        if (!cancelled) {
          setError("Couldn't determine vendor from your session. Please log in again.");
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(apiUrl(`/api/orders/vendordata/${vendorId}`), { ...authConfig() });
        const body = await safeJson(res);

        if (!res.ok || !body?.success) {
          throw new Error(body?.message || `Request failed (${res.status})`);
        }

        if (!cancelled) setRecords(body.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return { records, loading, error };
}

// Groups the raw item-level records into one row per underlying order, so the
// Orders card shows real orders instead of one row per line item / return.
function groupIntoOrders(records) {
  const byOrder = new Map();

  records.forEach((r) => {
    const order = r.orderId || {};
    const item = r.orderItemId || {};
    const key = order._id || order.order_number || r._id;
    if (!key) return;

    const lineTotal = Number(item.total ?? item.unit_price ?? 0);

    if (!byOrder.has(key)) {
      byOrder.set(key, {
        id: key,
        orderNumber: order.order_number || "—",
        date: order.createdAt || r.createdAt,
        total: 0,
        itemCount: 0,
        status: (r.status || "").toLowerCase(),
        lastActivity: r.createdAt,
      });
    }

    const entry = byOrder.get(key);
    entry.total += lineTotal;
    entry.itemCount += 1;
    // keep the status/timestamp from whichever record is most recent
    if (r.createdAt && (!entry.lastActivity || new Date(r.createdAt) > new Date(entry.lastActivity))) {
      entry.lastActivity = r.createdAt;
      entry.status = (r.status || "").toLowerCase();
    }
  });

  return Array.from(byOrder.values()).sort(
    (a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0)
  );
}

const DragHandle = (props) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="drag-handle" aria-hidden="true" {...props}>
    <circle cx="5" cy="3" r="1.3" />
    <circle cx="11" cy="3" r="1.3" />
    <circle cx="5" cy="8" r="1.3" />
    <circle cx="11" cy="8" r="1.3" />
    <circle cx="5" cy="13" r="1.3" />
    <circle cx="11" cy="13" r="1.3" />
  </svg>
);

// Amazon Seller Central style draggable widget: grab the dots, drag over
// another card, drop to swap places. Native HTML5 DnD, no external lib.
function CardShell({ title, headerLink, children, cardKey, dragState, dragHandlers }) {
  const { draggedKey, dragOverKey } = dragState;
  const { onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop } = dragHandlers;

  const isDragging = draggedKey === cardKey;
  const isDragOver = dragOverKey === cardKey && draggedKey !== cardKey;

  return (
    <div
      className={`card${isDragging ? " is-dragging" : ""}${isDragOver ? " is-drag-over" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, cardKey)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, cardKey)}
      onDragLeave={() => onDragLeave(cardKey)}
      onDrop={(e) => onDrop(e, cardKey)}
    >
      <span className="gold-line" />
      {isDragOver && <div className="drop-caret" />}
      <div className="card-header">
        <p className="card-title">{title}</p>
        <DragHandle />
      </div>
      {headerLink && (
        <a className="card-link" href={headerLink.href} target="_blank" rel="noopener noreferrer">
          {headerLink.label}
        </a>
      )}
      {children}
    </div>
  );
}

function OrdersCard(props) {
  const { records, loading, error } = props;
  const orders = useMemo(() => groupIntoOrders(records), [records]);
  const recent = orders.slice(0, 6);

  return (
    <CardShell
      {...props}
      title="Orders"
      headerLink={{
        href: "https://sellercentral.amazon.in/amazonsell/orders/mfn",
        label: "Manage orders",
      }}
    >
      <div className="period-row">
        <span className="pill">Last 90 days ▾</span>
        <span className="pill">IN · Choose marketplaces (1) ▾</span>
      </div>
      <div className="checkbox-row">
        <input type="checkbox" id="amzb" />
        <label htmlFor="amzb">Show Amazon Business only</label>
      </div>

      {loading ? (
        <div className="state-msg">Loading orders…</div>
      ) : error ? (
        <div className="state-msg is-error">{error}</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 64 64" fill="none">
            <rect x="10" y="18" width="44" height="34" rx="2" stroke="#B7BDC0" strokeWidth="2" />
            <path d="M10 26h44" stroke="#B7BDC0" strokeWidth="2" />
            <path d="M22 18v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" stroke="#B7BDC0" strokeWidth="2" />
            <circle cx="26" cy="38" r="2" fill="#B7BDC0" />
            <circle cx="38" cy="38" r="2" fill="#B7BDC0" />
          </svg>
          <div className="empty-title">No orders in this period</div>
          <div className="empty-sub">Try selecting a different time period to see more results.</div>
        </div>
      ) : (
        <div className="order-list">
          {recent.map((o) => {
            const meta = ORDER_STATUS_META[o.status] || { label: o.status || "Unknown", bg: "#f5f5f4", color: "#475569" };
            return (
              <div className="order-row" key={o.id}>
                <div className="order-main">
                  <a
                    className="order-id"
                    href={`https://sellercentral.amazon.in/amazonsell/orders/mfn?orderId=${o.orderNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {o.orderNumber}
                  </a>
                  <span className="order-meta">
                    {formatDate(o.date)} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="order-right">
                  <div className="order-total">{formatCurrency(o.total)}</div>
                  <span className="order-pill" style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}

function ReturnsCard(props) {
  const { records, loading, error } = props;
  const stats = useMemo(() => {
    const pending = records.filter((r) => ["requested", "pending"].includes((r.status || "").toLowerCase())).length;
    const completed = records.filter((r) => (r.status || "").toLowerCase() === "completed").length;
    return [
      {
        label: "Pending actions",
        value: pending,
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/gp/returns/list/v2?returnRequestState=pendingActions&pendingActionsFilterBy=pendingActions",
      },
      {
        label: "Completed",
        value: completed,
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/gp/returns/list/v2?returnRequestState=completed",
      },
      {
        label: "Total returns",
        value: records.length,
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/gp/returns/list/v2",
      },
    ];
  }, [records]);

  return (
    <CardShell
      {...props}
      title="Returns"
      headerLink={{
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/gp/returns/list/v2",
        label: "Manage returns",
      }}
    >
      <div className="period-row">
        <span className="pill">Seller fulfilled ▾</span>
        <span className="pill">Last 90 days ▾</span>
      </div>

      {loading ? (
        <div className="state-msg">Loading returns…</div>
      ) : error ? (
        <div className="state-msg is-error">{error}</div>
      ) : (
        <div className="stat-list">
          {stats.map((s) => (
            <div className="stat-row" key={s.label}>
              <span className="stat-label">{s.label}</span>
              <a className="stat-value" href={s.href} target="_blank" rel="noopener noreferrer">
                {s.value}
              </a>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function ClaimsCard(props) {
  return (
    <CardShell {...props} title="Claims">
      <div style={{ height: 24 }} />
      <div className="success-box">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#047857" />
            <path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="success-text">
          You do not have any outstanding claims or chargebacks. Great job!
        </div>
      </div>
    </CardShell>
  );
}

function DeliveryRatesCard(props) {
  const rates = [
    {
      label: "Late shipment",
      value: "0%",
      target: "Target under 2%",
      href: "https://sellercentral.amazon.in/amazonsell/orders/container/performance/detail/shipping?t=lsr",
    },
    {
      label: "Pre-fulfilment cancel",
      value: "0%",
      target: "Target under 2%",
      href: "https://sellercentral.amazon.in/amazonsell/orders/container/performance/detail/shipping?t=cr",
    },
  ];

  return (
    <CardShell
      {...props}
      title="Delivery Rates"
      headerLink={{
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/performance/detail/shipping",
        label: "View shipping performance",
      }}
    >
      <div className="rates-list">
        {rates.map((r) => (
          <div className="stat-row" key={r.label}>
            <span className="stat-label">{r.label}</span>
            <span style={{ textAlign: "right" }}>
              <a className="stat-value" href={r.href} target="_blank" rel="noopener noreferrer">
                {r.value}
              </a>
              <span className="stat-sub">{r.target}</span>
            </span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

const CARD_COMPONENTS = {
  orders: OrdersCard,
  returns: ReturnsCard,
  claims: ClaimsCard,
  deliveryRates: DeliveryRatesCard,
};

export default function OrdersWorkspace() {
  const { records, loading, error } = useVendorData();
  const [cardOrder, setCardOrder] = useState(DEFAULT_CARD_ORDER);
  const [draggedKey, setDraggedKey] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const dragImageRef = useRef(null);

  useEffect(() => {
    setCardOrder(loadStoredCardOrder());
  }, []);

  // hero numbers — derived from the same records the cards already use
  const heroStats = useMemo(() => {
    const orderCount = groupIntoOrders(records).length;
    const pending = records.filter((r) => ["requested", "pending"].includes((r.status || "").toLowerCase())).length;
    return { orderCount, pending, returns: records.length };
  }, [records]);

  function persistOrder(next) {
    setCardOrder(next);
    try {
      localStorage.setItem(CARD_ORDER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures (e.g. private browsing) — order just won't persist
    }
  }

  function onDragStart(e, key) {
    setDraggedKey(key);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", key);
    } catch {
      // some browsers require this even if unused
    }
  }

  function onDragOver(e, key) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (key !== dragOverKey) setDragOverKey(key);
  }

  function onDragLeave(key) {
    setDragOverKey((current) => (current === key ? null : current));
  }

  function onDrop(e, targetKey) {
    e.preventDefault();
    setDragOverKey(null);
    if (!draggedKey || draggedKey === targetKey) return;

    const next = [...cardOrder];
    const fromIndex = next.indexOf(draggedKey);
    const toIndex = next.indexOf(targetKey);
    if (fromIndex === -1 || toIndex === -1) return;

    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedKey);
    persistOrder(next);
  }

  function onDragEnd() {
    setDraggedKey(null);
    setDragOverKey(null);
  }

  const dragState = { draggedKey, dragOverKey };
  const dragHandlers = { onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop };

  return (
    <div className="orders-workspace" ref={dragImageRef}>
      <style>{styles}</style>

      <section className="hero">
        <span className="gold-line" />
        <div>
          <p className="hero-kicker">
            <PackageCheck size={14} strokeWidth={1.6} />
            Order management
          </p>
          <h1>Orders</h1>
          <p className="hero-copy">
            Track recent orders, returns and delivery performance in one place. Drag the cards to arrange them your way.
          </p>
        </div>
        <div className="glance">
          <div className="glance-stat">
            <PackageCheck size={18} strokeWidth={1.5} />
            <div>
              <strong>{loading ? "—" : heroStats.orderCount}</strong>
              <span>orders</span>
            </div>
          </div>
          <div className="glance-stat">
            <Clock3 size={18} strokeWidth={1.5} />
            <div>
              <strong>{loading ? "—" : heroStats.pending}</strong>
              <span>pending actions</span>
            </div>
          </div>
          <div className="glance-stat">
            <Undo2 size={18} strokeWidth={1.5} />
            <div>
              <strong>{loading ? "—" : heroStats.returns}</strong>
              <span>total returns</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid">
        {cardOrder.map((key) => {
          const Card = CARD_COMPONENTS[key];
          if (!Card) return null;
          return (
            <Card
              key={key}
              cardKey={key}
              records={records}
              loading={loading}
              error={error}
              dragState={dragState}
              dragHandlers={dragHandlers}
            />
          );
        })}
      </div>
    </div>
  );
}