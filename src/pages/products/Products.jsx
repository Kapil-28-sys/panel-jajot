// Products.jsx — workspace-style UI. Logic, services and shared components unchanged.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertTriangle, Eye, PackageCheck, PackagePlus, Pencil, Trash2, X,
  CheckCircle, Archive as ArchiveIcon, Copy, Boxes, Save, Power, PowerOff, RefreshCw, Search, Gem, RotateCw, BellRing,
} from "lucide-react";
import { inr, vendorName, vendors } from "../../data/marketplaceData";
import DataPager from "../../components/common/DataPager";
import ConfirmDialog from "../../components/common/ui/ConfirmDialog";
import EmptyState from "../../components/common/ui/EmptyState";
import ErrorState from "../../components/common/ui/ErrorState";
import { TableSkeleton } from "../../components/common/ui/Loader";
import * as productsApi from "../../services/productApi";
import * as categoryApi from "../../services/categoryApi";

/* ───────── helpers (logic unchanged) ───────── */
const STATUS_OPTIONS = ["All", "Active", "Draft", "Suppressed", "Pending"];
const STATUS_DOT = { active: "bg-emerald-500", suppressed: "bg-red-500", draft: "bg-slate-400", pending: "bg-amber-500" };
const normStatus = (s) => (s ?? "").toString().trim().toLowerCase();
const idStr = (v) => (v == null ? "" : typeof v === "object" ? String(v._id ?? v.id ?? "").trim() : String(v).trim());
const isEmpty = (v) =>
  v == null || v === "" || (Array.isArray(v) && !v.length) ||
  (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);

function deriveProductMetrics(p) {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  if (!variants.length) return { stock: p.stock ?? p.totalStock ?? 0, variantCount: 0 };
  const stock = variants.reduce((t, v) => t + Number(v.inventory?.stock ?? v.stock ?? 0), 0);
  return { stock, variantCount: variants.length };
}

function matchesInventoryLevel(stock, level) {
  if (!level) return true;
  if (level === "low") return stock < 15;
  if (level === "medium") return stock >= 15 && stock < 50;
  if (level === "high") return stock >= 50;
  return true;
}

// GET /products and /products/vendor/:id don't populate variant.inventory. Rows from
// /products/inventory/vendor/:id carry POPULATED productId/variantId objects, so ids
// are unwrapped with idStr() on both sides. Also carries maxQty / isActive.
function mergeInventoryRows(list, rows) {
  return list.map((p) => {
    const pid = p._id ?? p.id;
    if (!Array.isArray(p.variants) || !p.variants.length) return p;
    const variants = p.variants.map((v) => {
      const m = rows.find((r) => idStr(r.productId ?? r.product) === idStr(pid) && idStr(r.variantId ?? r.variant) === idStr(v._id));
      if (!m) return v;
      return {
        ...v,
        inventory: {
          ...v.inventory,
          stock: m.stock ?? v.inventory?.stock,
          maxQty: m.maxQty ?? v.inventory?.maxQty,
          isActive: m.isActive ?? v.inventory?.isActive,
        },
      };
    });
    return { ...p, variants };
  });
}


/* ───────── design layer — same tokens as the marketplace Dashboard ───────── */
const serif = { fontFamily: "var(--font-display)" };
const gold = "text-[rgb(var(--brand-on-dark))]";
const FOCUS = "focus:border-[rgb(var(--brand))] focus:ring-2 focus:ring-[rgb(var(--brand)/0.18)]";
const field = `rounded-[var(--radius-control)] border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-stone-300 ${FOCUS}`;
const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]";
const btnGhost = "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-50 disabled:opacity-50";

const palettes = [
  { front: "from-[rgb(var(--a1-f1))] via-[rgb(var(--a1-f2))] to-[rgb(var(--a1-f3))]", back: "from-[rgb(var(--a1-b1))] to-[rgb(var(--a1-b2))]", chip: "from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))]" },
  { front: "from-[rgb(var(--a2-f1))] via-[rgb(var(--a2-f2))] to-[rgb(var(--a2-f3))]", back: "from-[rgb(var(--a2-b1))] to-[rgb(var(--a2-b2))]", chip: "from-[rgb(var(--a2))] to-[rgb(var(--a2-dark))]" },
  { front: "from-[rgb(var(--a3-f1))] via-[rgb(var(--a3-f2))] to-[rgb(var(--a3-f3))]", back: "from-[rgb(var(--a3-b1))] to-[rgb(var(--a3-b2))]", chip: "from-[rgb(var(--a3))] to-[rgb(var(--a3-dark))]" },
  { front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]", back: "from-[rgb(var(--p4-b1))] to-[rgb(var(--p4-b2))]", chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]" },
];

function GoldLine({ className = "inset-x-10" }) {
  return <span className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`} />;
}

function FlipCard({ label, palette, front, back, className = "h-44" }) {
  const [flipped, setFlipped] = useState(false);
  const face = "absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br p-5";
  const hide = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  return (
    <div className={`${className} transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0`} style={{ perspective: "1400px" }}>
      <button
        type="button" aria-pressed={flipped}
        aria-label={`${label}: ${flipped ? "show summary" : "show details"}`}
        onClick={() => setFlipped((v) => !v)}
        className="relative block h-full w-full rounded-[var(--radius-card)] text-left transition-transform duration-[800ms] ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--brand-line))] motion-reduce:transition-none"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <span aria-hidden={flipped} className={`${face} ${palette.front} text-slate-900 ring-1 ring-[rgb(var(--brand-line)/0.35)]`} style={hide}>
          <GoldLine />
          <span className="relative flex h-full flex-col">{front}</span>
          <RotateCw size={12} className="absolute bottom-4 right-4 text-slate-400" aria-hidden="true" />
        </span>
        <span aria-hidden={!flipped} className={`${face} ${palette.back} text-white ring-1 ring-[rgb(var(--brand-line)/0.5)]`} style={{ ...hide, transform: "rotateY(180deg)" }}>
          <GoldLine />
          <span className="relative flex h-full flex-col">{back}</span>
        </span>
      </button>
    </div>
  );
}

const BackTitle = ({ children }) => <span className={`mb-2 block text-xl font-semibold leading-tight ${gold}`} style={serif}>{children}</span>;
const BackRow = ({ label, value, valueClass = "text-white" }) => (
  <span className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5 text-sm last:border-0">
    <span className="truncate text-white/60">{label}</span>
    <span className={`shrink-0 font-semibold ${valueClass}`}>{value}</span>
  </span>
);

function MetricFlipCard({ metric }) {
  const Icon = metric.icon;
  return (
    <FlipCard
      label={metric.label} palette={metric.palette}
      front={<>
        <span className="flex items-start justify-between">
          <span className="text-sm font-medium text-slate-600">{metric.label}</span>
          <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${metric.palette.chip} text-white`}><Icon size={18} strokeWidth={1.6} /></span>
        </span>
        <span className="mt-auto block text-4xl font-semibold tracking-tight text-slate-900" style={serif}>{metric.value}</span>
        <span className="mt-0.5 block pr-6 text-xs text-slate-600">{metric.helper}</span>
      </>}
      back={<>
        <BackTitle>{metric.backTitle}</BackTitle>
        {metric.backRows.length === 0
          ? <span className="text-sm text-white/60">Nothing to show yet.</span>
          : metric.backRows.map((r) => <BackRow key={r.label} {...r} />)}
      </>}
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

/* ───────── small UI pieces ───────── */
const spin = (c) => `inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${c}`;

function StatusPill({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[normStatus(status)] ?? "bg-slate-400"}`} />
      {status}
    </span>
  );
}

function StockMeter({ stock, status }) {
  const color = normStatus(status) === "suppressed" ? "bg-red-500" : stock < 15 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex w-32 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(stock, 100)}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-bold tabular-nums text-slate-900">{stock}</span>
    </div>
  );
}

function RowAction({ title, onClick, disabled, hover = "", children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-slate-500 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 ${hover}`}
    >
      {children}
    </button>
  );
}

/* ───────── detail drawer ───────── */
function Field({ label, value }) {
  if (isEmpty(value)) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-900">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</p>
    </div>
  );
}

function BulletList({ label, items }) {
  if (isEmpty(items)) return null;
  return (
    <div className="sm:col-span-2">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-900">
        {(Array.isArray(items) ? items : [items]).map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-t border-stone-200 pt-4 first:border-0 first:pt-0">
      <h4 className="mb-3 text-sm font-semibold text-[rgb(var(--brand-text))]">{title}</h4>
      {children}
    </section>
  );
}

function VariantEditRow({ variant, vendorId, productId, onSaved }) {
  const [stock, setStock] = useState(variant.inventory?.stock ?? variant.stock ?? "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setStock(variant.inventory?.stock ?? variant.stock ?? ""); }, [variant.inventory?.stock, variant.stock]);

  const isActive = normStatus(variant.status || "active") !== "inactive";
  const attrs = Array.isArray(variant.attributes)
    ? variant.attributes.map((a) => `${a.name}: ${a.value}`)
    : Object.entries(variant.attributes ?? {}).map(([k, v]) => `${k}: ${v}`);
  const o = variant.offer ?? {};
  const price = (v) => (v != null ? inr(v) : "—");

  // PUT returns the updated inventory doc; pass it up so the parent patches state without a refetch.
  const saveStock = async () => {
    setSaving(true); setError("");
    try {
      const res = await productsApi.updateVariantInventory(vendorId, productId, variant._id, { stock: Number(stock || 0) });
      const updated = res.data?.data ?? res.data;
      setStock(updated?.stock ?? stock);
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
      onSaved?.(updated);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to update stock.");
    } finally { setSaving(false); }
  };

  const toggleStatus = async () => {
    setStatusBusy(true); setError("");
    try {
      await productsApi.updateVariantStatus(variant._id, isActive ? "inactive" : "active");
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to update variant status.");
    } finally { setStatusBusy(false); }
  };

  return (
    <tr className="hover:bg-stone-50">
      <td className="py-2 pr-3 font-mono text-slate-800">{variant.sku}</td>
      <td className="py-2 pr-3 text-slate-800">{attrs.join(", ")}</td>
      <td className="py-2 pr-3 text-slate-500 line-through">{price(o.mrp ?? o.price)}</td>
      <td className="py-2 pr-3 text-slate-800">{price(o.sellingPrice ?? o.price)}</td>
      <td className="py-2 pr-3 font-bold text-slate-900">{price(o.salePrice)}</td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1.5">
          <input
            type="number" value={stock} onChange={(e) => setStock(e.target.value)}
            className="w-16 rounded-[var(--radius-control)] border border-stone-200 px-1.5 py-1 text-xs outline-none focus:border-[rgb(var(--brand))]"
          />
          <RowAction title="Save stock" onClick={saveStock} disabled={saving} hover="hover:text-emerald-600">
            {saving ? <span className={spin("border-emerald-300 border-t-emerald-600")} /> : <Save size={13} />}
          </RowAction>
          {savedFlash && <CheckCircle size={13} className="text-emerald-600" />}
        </div>
      </td>
      <td className="py-2 pr-3 text-slate-800">{o.itemCondition ?? "—"}</td>
      <td className="py-2 pr-3">
        <RowAction
          title={isActive ? "Deactivate variant" : "Activate variant"} onClick={toggleStatus} disabled={statusBusy}
          hover={isActive ? "text-emerald-600 hover:text-red-600" : "hover:text-emerald-600"}
        >
          {statusBusy ? <span className={spin("border-stone-300 border-t-slate-700")} /> : isActive ? <Power size={13} /> : <PowerOff size={13} />}
        </RowAction>
        {error && <p className="text-[10px] text-red-500">{error}</p>}
      </td>
    </tr>
  );
}

function ViewDrawer({ loading, error, payload, fallbackName, onClose, onRefresh }) {
  const p = payload?.product ?? null;
  const variants = payload?.variants ?? [];
  const vendorIdForProduct = typeof p?.vendorId === "object" ? p.vendorId?._id : p?.vendorId;
  const d = p?.description ?? {};
  const det = p?.productDetails ?? {};
  const dims = p?.dimensions ?? {};
  const pk = p?.packaging ?? {};
  const sf = p?.safetyCompliance ?? {};
  const gift = p?.giftOptions ?? {};
  const images = p?.images ?? [];
  const attributesMeta = p?.attributesMeta ?? [];
  const name = p?.productName ?? p?.itemName ?? fallbackName ?? "—";
  const lwh = (x) => (x ? `${x.length} × ${x.width} × ${x.height}` : null);
  const date = (x) => (x ? new Date(x).toLocaleString("en-IN") : null);

  // [title, fields, bullet-lists] — empty values are hidden, empty sections are skipped
  const basic = [["Product name", p?.productName], ["Item name", p?.itemName], ["Brand", p?.brandName], ["Product type", p?.productType], ["Browse node", p?.recommendedBrowseNode], ["External ID", p?.externalProductId], ["Vendor", p ? vendorName(p.vendorId) : null], ["Category ID", p?.categoryId], ["Product ID", p?._id]];
  const more = [
    ["Product details", [["Manufacturer", det.manufacturer], ["Model number", det.modelNumber], ["Part number", det.partNumber], ["Item type", det.itemTypeName], ["Generic keyword", det.genericKeyword], ["Target audience", det.targetAudienceKeyword], ["Material", det.material], ["Item shape", det.itemShape], ["Theme", det.theme], ["Occasion", det.occasion], ["Unit count", det.unitCount != null ? `${det.unitCount} ${det.unitCountType ?? ""}` : null], ["Manufacturer contact", det.manufacturerContactInfo]], [["Special features", det.specialFeatures], ["Included components", det.includedComponents]]],
    ["Dimensions & weight", [["Item dimensions (L×W×H)", lwh(dims.itemDimensions)], ["Package dimensions (L×W×H)", lwh(dims.packageDimensions)], ["Item weight", dims.itemWeight != null ? `${dims.itemWeight} ${dims.itemWeightUnit ?? ""}` : null], ["Package weight", dims.packageWeight]], []],
    ["Packaging", [["Packaging type", pk.packagingType], ["Source type", pk.sourceType], ["Fulfillment channel", pk.fulfillmentChannel], ["Number of packs", pk.numberOfPacks]], []],
    ["Safety & compliance", [["Country / region of origin", sf.countryRegionOfOrigin], ["Dangerous goods", sf.dangerousGoodsRegulation], ["Buyer age restriction", sf.buyerAgeRestriction], ["Regulatory certification", sf.regulatoryComplianceCertification], ["Safety attestation", sf.safetyAttestation], ["Attestation address", sf.safetyAttestationAddress], ["Ships globally", sf.shipsGlobally], ["Cautionary statement", sf.mandatoryCautionaryStatement]], []],
    ["Gift options", [["Gift wrap available", gift.giftWrapAvailable], ["Gift message available", gift.giftMessageAvailable]], []],
    ["SEO & keywords", [["Metadata", p?.metadata]], [["Meta keywords", p?.metaKeywords], ["Search keywords", p?.searchKeywords]]],
    ["Timestamps", [["Created at", date(p?.createdAt)], ["Updated at", date(p?.updatedAt)]], []],
  ];
  const grid = "grid gap-3 sm:grid-cols-2";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="flex h-full w-full max-w-2xl flex-col bg-white shadow-pop" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-text))]"><Gem size={13} strokeWidth={1.6} /> Product details</p>
            <h3 className="truncate text-2xl font-semibold text-slate-900" style={serif}>{name}</h3>
          </div>
          <RowAction title="Close" onClick={onClose} hover="hover:text-slate-900"><X size={16} /></RowAction>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-amber-500" /> Loading full product details…
            </div>
          )}
          {!loading && error && <div className="py-10 text-center text-sm text-red-500">⚠ {error}</div>}

          {!loading && !error && p && (
            <>
              {images.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <img key={i} src={img} alt={`${name} ${i + 1}`} className="h-24 w-24 shrink-0 rounded-[var(--radius-control)] object-cover ring-1 ring-slate-200" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ))}
                </div>
              )}

              <Section title="Basic info">
                <div className={grid}>{basic.map(([l, v]) => <Field key={l} label={l} value={v} />)}</div>
              </Section>

              {variants.length > 0 && (
                <Section title={`Variants (${variants.length})`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-slate-500">
                          {["SKU", "Attributes", "MRP", "Selling", "Sale", "Stock", "Condition", "Status"].map((h) => <th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {variants.map((v) => <VariantEditRow key={v._id} variant={v} vendorId={vendorIdForProduct} productId={p._id} onSaved={onRefresh} />)}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {(d.productDescription || d.bulletPoints?.length > 0) && (
                <Section title="Description">
                  {d.productDescription && <p className="mb-3 whitespace-pre-wrap text-sm text-slate-800">{d.productDescription}</p>}
                  {d.bulletPoints?.length > 0 && <ul className="list-disc space-y-1 pl-4 text-sm text-slate-900">{d.bulletPoints.map((b, i) => <li key={i}>{b}</li>)}</ul>}
                </Section>
              )}

              {more.map(([title, rows, lists]) => {
                if (!rows.some(([, v]) => !isEmpty(v)) && !lists.some(([, v]) => !isEmpty(v))) return null;
                return (
                  <Section key={title} title={title}>
                    <div className={grid}>
                      {rows.map(([l, v]) => <Field key={l} label={l} value={v} />)}
                      {lists.map(([l, v]) => <BulletList key={l} label={l} items={v} />)}
                    </div>
                  </Section>
                );
              })}

              {attributesMeta.length > 0 && (
                <Section title="Attributes">
                  <div className="space-y-2">
                    {attributesMeta.map((a) => (
                      <div key={a._id ?? a.name}>
                        <p className="text-xs font-medium text-slate-400">{a.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(a.values ?? []).map((v, i) => <span key={i} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">{v}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ═════════════════════════ PAGE ═════════════════════════ */
export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();

  const vendorIdFromStorage = (() => {
    const flat = localStorage.getItem("vendorId");
    if (flat && flat.trim() && flat !== "null" && flat !== "undefined") return flat;
    try {
      const raw = localStorage.getItem("adminSession");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.vendorId) return parsed.vendorId;
        if (parsed?.user?.vendorId) return parsed.user.vendorId;
      }
    } catch { /* not JSON */ }
    return null;
  })();
  const scopeToOwnVendor = Boolean(vendorIdFromStorage);

  const [catalog, setCatalog] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [vendorId, setVendorId] = useState("all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryFacetValues, setCategoryFacetValues] = useState(null); // kept: facet response from endpoint #16

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [actionState, setActionState] = useState({ id: null, type: null });
  const [inventorySyncing, setInventorySyncing] = useState(false);
  const [categoryLookup, setCategoryLookup] = useState({});

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewPayload, setViewPayload] = useState(null);
  const [viewFallback, setViewFallback] = useState("");
  const [viewProductId, setViewProductId] = useState(null);

  const flash = (msg, ms = 4000) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), ms); };

  // GET /products returns raw category ids, so names are resolved from /categories.
  useEffect(() => {
    categoryApi.getCategories()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.categories ?? data.data ?? []);
        const map = {};
        list.forEach((c) => {
          const id = c._id ?? c.id;
          if (id) map[id] = c.name || c.categoryName || c.title || "Unnamed";
        });
        setCategoryLookup(map);
      })
      .catch(() => setCategoryLookup({}));
  }, []);

  const openView = async (p) => {
    const id = p._id ?? p.id;
    setViewProductId(id); setViewOpen(true); setViewLoading(true);
    setViewError(""); setViewPayload(null); setViewFallback(p.productName ?? p.name ?? "");
    try {
      const res = await productsApi.getProductById(id);
      setViewPayload(res.data);
    } catch (e) {
      setViewError(e.response?.data?.message || e.message || "Failed to load product details.");
    } finally { setViewLoading(false); }
  };

  // With the fresh inventory doc from the PUT, patch state in place; otherwise refetch.
  const refreshView = async (inv) => {
    if (inv) {
      const vId = idStr(inv.variantId);
      const pId = idStr(inv.productId);
      setViewPayload((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants.map((v) =>
            idStr(v._id) === vId
              ? { ...v, inventory: { ...v.inventory, stock: inv.stock, maxQty: inv.maxQty, isActive: inv.isActive } }
              : v
          ),
        };
      });
      setCatalog((prev) => mergeInventoryRows(prev, [{ productId: pId, variantId: vId, stock: inv.stock, maxQty: inv.maxQty, isActive: inv.isActive }]));
      return;
    }
    if (!viewProductId) return;
    try {
      const res = await productsApi.getProductById(viewProductId);
      setViewPayload(res.data);
      const updated = res.data?.product ?? res.data;
      if (updated?._id) setCatalog((prev) => prev.map((p) => ((p._id ?? p.id) === updated._id ? { ...p, ...updated } : p)));
    } catch { /* keep last-known payload */ }
  };

  const closeView = () => { setViewOpen(false); setViewPayload(null); setViewError(""); setViewProductId(null); };

  useEffect(() => {
    const msg = location.state?.added ? "Product added successfully!" : location.state?.updated ? "Product updated successfully!" : "";
    if (!msg) return;
    setSuccessMsg(msg);
    window.history.replaceState({}, "");
    const t = setTimeout(() => setSuccessMsg(""), 4000);
    return () => clearTimeout(t);
  }, [location.state]);

  // Vendor sessions use endpoint #20 and merge real stock from #17; admins use #2.
  const fetchProducts = async () => {
    setProductsLoading(true); setProductsError("");
    try {
      const res = scopeToOwnVendor ? await productsApi.getProductsByVendor(vendorIdFromStorage) : await productsApi.getProducts();
      const d = res.data;
      let list = Array.isArray(d) ? d : (d.data ?? d.products ?? []);
      if (scopeToOwnVendor) {
        try {
          const inv = await productsApi.getInventoryByVendor(vendorIdFromStorage);
          const rows = Array.isArray(inv.data) ? inv.data : (inv.data?.data ?? inv.data?.inventory ?? []);
          list = mergeInventoryRows(list, rows);
        } catch { /* inventory merge failed */ }
      }
      setCatalog(list);
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || "Failed to load products.");
    } finally { setProductsLoading(false); }
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setProductsLoading(true); setProductsError("");
        try {
          const res = await productsApi.searchProducts(query.trim());
          const d = res.data;
          setCatalog(Array.isArray(d) ? d : (d.data ?? d.products ?? d.results ?? []));
        } catch (e) {
          setProductsError(e.response?.data?.message || e.message || "Search failed.");
        } finally { setProductsLoading(false); }
      } else {
        fetchProducts();
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!categoryFilter) { setCategoryFacetValues(null); return; }
    productsApi.getProductFiltersByCategory(categoryFilter)
      .then((res) => setCategoryFacetValues(res.data))
      .catch(() => setCategoryFacetValues(null));
  }, [categoryFilter]);

  const syncInventoryFromVendor = async () => {
    if (!vendorIdFromStorage) return;
    setInventorySyncing(true); setProductsError("");
    try {
      const res = await productsApi.getInventoryByVendor(vendorIdFromStorage);
      const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data?.inventory ?? []);
      setCatalog((prev) => mergeInventoryRows(prev, rows));
      flash("Inventory synced from server.", 3000);
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || "Failed to sync inventory.");
    } finally { setInventorySyncing(false); }
  };

  const visibleProducts = useMemo(
    () => catalog.filter((p) => {
      const pv = typeof p.vendorId === "object" && p.vendorId !== null ? p.vendorId._id : p.vendorId;
      const matchV = scopeToOwnVendor ? pv === vendorIdFromStorage : (vendorId === "all" || pv === vendorId);
      const matchS = statusFilter === "All" || normStatus(p.status ?? "Active") === normStatus(statusFilter);
      const matchC = !categoryFilter || idStr(p.categoryId) === idStr(categoryFilter);
      const matchI = matchesInventoryLevel(deriveProductMetrics(p).stock, inventoryFilter);
      return matchV && matchS && matchC && matchI;
    }),
    [catalog, vendorId, statusFilter, scopeToOwnVendor, vendorIdFromStorage, categoryFilter, inventoryFilter]
  );

  const pagedProducts = visibleProducts.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => { setPageSize(size); setPage(1); };
  const pagedIds = pagedProducts.map((p) => p._id ?? p.id).filter(Boolean);
  const allPagedSelected = pagedIds.length > 0 && pagedIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id) => {
    if (!id) return;
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      pagedIds.forEach((id) => (allPagedSelected ? n.delete(id) : n.add(id)));
      return n;
    });
  const clearSelection = () => setSelectedIds(new Set());
  const selectedList = () => Array.from(selectedIds).filter(Boolean);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const id = deleteTarget._id ?? deleteTarget.id;
      await productsApi.deleteProduct(id);
      setCatalog((prev) => prev.filter((p) => (p._id ?? p.id) !== id));
      flash("Product deleted successfully!");
    } catch (e) {
      console.error("Delete failed:", e.response?.status, e.response?.data ?? e.message);
      setProductsError(
        e.response?.data?.message ||
        (e.response?.status ? `Failed to delete product (server said: ${e.response.status}).` : null) ||
        e.message || "Failed to delete product. Please try again."
      );
    } finally { setDeleting(false); setDeleteTarget(null); }
  };

  const runBulkStatusUpdate = async (status) => {
    const ids = selectedList();
    if (!ids.length) { setProductsError("No valid product IDs selected — try reselecting the rows."); return; }
    setBulkBusy(true); setProductsError("");
    try {
      await productsApi.bulkUpdateProducts(ids, { status });
      setCatalog((prev) => prev.map((p) => (ids.includes(p._id ?? p.id) ? { ...p, status } : p)));
      flash(`${ids.length} product(s) updated to ${status}.`);
      clearSelection();
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || "Bulk update failed.");
    } finally { setBulkBusy(false); }
  };

  const handleBulkDelete = async () => {
    const ids = selectedList();
    if (!ids.length) { setProductsError("No valid product IDs selected — try reselecting the rows."); return; }
    setBulkDeleting(true); setProductsError("");
    try {
      await productsApi.bulkDeleteProducts(ids);
      setCatalog((prev) => prev.filter((p) => !ids.includes(p._id ?? p.id)));
      flash(`${ids.length} product(s) deleted.`);
      clearSelection();
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || "Bulk delete failed.");
    } finally { setBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  const runProductAction = async (product, type) => {
    const id = product._id ?? product.id;
    setActionState({ id, type }); setProductsError("");
    try {
      let res;
      if (type === "publish") res = await productsApi.publishProduct(id);
      else if (type === "archive") res = await productsApi.archiveProduct(id);
      else if (type === "duplicate") res = await productsApi.duplicateProduct(id);
      const returned = res?.data?.product ?? res?.data?.data ?? res?.data ?? null;

      if (type === "duplicate") {
        const np = returned && typeof returned === "object" && (returned._id || returned.id) ? returned : null;
        if (np) setCatalog((prev) => [np, ...prev]); else await fetchProducts();
        flash("Product duplicated successfully!");
      } else {
        const newStatus = (returned && typeof returned === "object" && returned.status) || (type === "publish" ? "Active" : "Suppressed");
        setCatalog((prev) => prev.map((p) => ((p._id ?? p.id) === id ? { ...p, status: newStatus } : p)));
        flash(type === "publish" ? "Product published successfully!" : "Product archived successfully!");
      }
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || `Failed to ${type} product. Please try again.`);
    } finally { setActionState({ id: null, type: null }); }
  };

  const facetCategories = useMemo(() => {
    const seen = new Map();
    catalog.forEach((p) => {
      const raw = p.categoryId;
      const id = idStr(raw);
      if (!id || seen.has(id)) return;
      seen.set(id, { _id: id, name: (raw && typeof raw === "object" ? raw.name : null) ?? categoryLookup[id] ?? p.category ?? id });
    });
    return Array.from(seen.values());
  }, [catalog, categoryLookup]);

  const countFor = (s) => (s === "All" ? catalog.length : catalog.filter((p) => normStatus(p.status ?? "Active") === normStatus(s)).length);
  const lowCount = visibleProducts.filter((p) => deriveProductMetrics(p).stock < 15).length;
  const suppressedCount = visibleProducts.filter((p) => normStatus(p.status) === "suppressed").length;
  const hasFilters = statusFilter !== "All" || categoryFilter || inventoryFilter;
  const selectCls = field;

  const totalUnits = visibleProducts.reduce((t, p) => t + deriveProductMetrics(p).stock, 0);
  const lowItems = visibleProducts.filter((p) => deriveProductMetrics(p).stock < 15);
  const suppressedItems = visibleProducts.filter((p) => normStatus(p.status) === "suppressed");
  const byStatus = Object.entries(visibleProducts.reduce((a, p) => { const k = p.status ?? "Active"; a[k] = (a[k] || 0) + 1; return a; }, {}));
  const levelCount = (l) => visibleProducts.filter((p) => matchesInventoryLevel(deriveProductMetrics(p).stock, l)).length;
  const nm = (p) => p.productName ?? p.name ?? "—";
  const metrics = [
    { label: "Visible listings", value: visibleProducts.length, icon: Eye, palette: palettes[0], helper: "catalog records in view", backTitle: "Listings by status", backRows: byStatus.slice(0, 4).map(([k, v]) => ({ label: k, value: v })) },
    { label: "Low stock", value: lowItems.length, icon: AlertTriangle, palette: palettes[1], helper: "needs replenishment", backTitle: "Running low", backRows: lowItems.slice(0, 4).map((p) => ({ label: nm(p), value: `${deriveProductMetrics(p).stock} left`, valueClass: "text-rose-300" })) },
    { label: "Suppressed", value: suppressedItems.length, icon: PackageCheck, palette: palettes[2], helper: "requires catalog action", backTitle: "Needs catalog action", backRows: suppressedItems.slice(0, 4).map((p) => ({ label: nm(p), value: vendorName(p.vendorId) })) },
    { label: "Units in stock", value: totalUnits.toLocaleString("en-IN"), icon: Boxes, palette: palettes[3], helper: "across visible listings", backTitle: "Stock levels", backRows: [{ label: "Low (<15)", value: levelCount("low"), valueClass: "text-rose-300" }, { label: "Medium (15–49)", value: levelCount("medium") }, { label: "High (50+)", value: levelCount("high"), valueClass: "text-emerald-300" }] },
  ];

  return (
    <div className="space-y-6 pb-20">
      <ConfirmDialog
        open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete product?"
        description={`"${deleteTarget?.productName ?? deleteTarget?.name ?? ""}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Yes, delete"
      />
      <ConfirmDialog
        open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete} loading={bulkDeleting}
        title={`Delete ${selectedIds.size} products?`}
        description={`This will permanently remove ${selectedIds.size} selected products. This cannot be undone.`}
        confirmLabel={`Yes, delete ${selectedIds.size}`}
      />
      {viewOpen && <ViewDrawer loading={viewLoading} error={viewError} payload={viewPayload} fallbackName={viewFallback} onClose={closeView} onRefresh={refreshView} />}

      {successMsg && (
        <div role="status" className="fixed right-5 top-5 z-[80] flex items-center gap-2 rounded-[var(--radius-control)] bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-pop">
          <CheckCircle size={15} className="text-emerald-400" /> {successMsg}
        </div>
      )}

      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-6 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-8">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]"><Gem size={14} strokeWidth={1.6} /> Inventory command center</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl" style={serif}>Products and catalog</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {scopeToOwnVendor ? "Your listings — stock health, ASIN status, and catalog ownership." : "Monitor vendor listings, stock health, ASIN status, and catalog ownership."}
            </p>
          </div>
          <div className="flex flex-col gap-4 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={BellRing} value={lowCount + suppressedCount} label="need attention" />
              <GlanceStat icon={Boxes} value={catalog.length} label="total listings" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {scopeToOwnVendor && (
                <button onClick={syncInventoryFromVendor} disabled={inventorySyncing} className={btnGhost} title="Pull latest stock numbers from /products/inventory/vendor/:vendorId">
                  {inventorySyncing ? <span className={spin("border-stone-300 border-t-slate-700")} /> : <RefreshCw size={15} strokeWidth={1.6} />} Sync inventory
                </button>
              )}
              <button onClick={() => navigate("/vendor/products/add")} className={btnPrimary}><PackagePlus size={16} strokeWidth={1.6} /> Add listing</button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Key metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500"><RotateCw size={12} /> Select a card to flip it for a breakdown.</p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => <MetricFlipCard key={m.label} metric={m} />)}
        </div>
      </section>

      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine />
                <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 px-3" aria-label="Status">
          {STATUS_OPTIONS.map((s) => {
            const on = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${on ? "border-[rgb(var(--brand))] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {s}
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? "bg-[rgb(var(--tint-100))] text-[rgb(var(--brand-text))]" : "bg-stone-100 text-slate-500"}`}>{countFor(s)}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-4 py-2.5">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search products (2+ chars searches server)" className={`${field} w-full !pl-9`} />
          </div>
          {!scopeToOwnVendor && (
            <select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setPage(1); }} className={field}>
              <option value="all">All vendors</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          {facetCategories.length > 0 && (
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className={selectCls}>
              <option value="">All categories</option>
              {facetCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
          <select value={inventoryFilter} onChange={(e) => { setInventoryFilter(e.target.value); setPage(1); }} className={selectCls}>
            <option value="">Any stock level</option>
            {["low", "medium", "high"].map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)} stock</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setStatusFilter("All"); setCategoryFilter(""); setInventoryFilter(""); setPage(1); }}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--brand-text))] hover:underline"
            >
              <X size={13} /> Reset filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-[rgb(var(--tint-100))] to-[rgb(var(--tint-200))] text-xs text-slate-600">
              <tr className="border-b border-stone-200">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={allPagedSelected} onChange={toggleSelectAllOnPage} aria-label="Select all on page" className="h-4 w-4 rounded-[var(--radius-control)] border-stone-300 accent-[rgb(var(--brand))]" />
                </th>
                <th className="px-3 py-2.5 font-semibold">Product</th>
                <th className="px-3 py-2.5 font-semibold">Vendor</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Stock</th>
                <th className="w-52 px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {productsLoading && <tr><td colSpan={6} className="p-0"><TableSkeleton rows={6} columns={6} /></td></tr>}

              {!productsLoading && productsError && <tr><td colSpan={6} className="p-0"><ErrorState message={productsError} onRetry={fetchProducts} /></td></tr>}

              {!productsLoading && !productsError && pagedProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={Boxes} title="No products found"
                      description="Try adjusting your search or filters, or add your first listing."
                      actionLabel="Add listing" onAction={() => navigate("/vendor/products/add")}
                    />
                  </td>
                </tr>
              )}

              {!productsLoading && !productsError && pagedProducts.map((p) => {
                const name = p.productName ?? p.name ?? "—";
                const status = p.status ?? "Active";
                const image = p.image ?? p.images?.[0] ?? p.variants?.[0]?.images?.[0] ?? "";
                const asin = p.asin ?? p.sku ?? p.variants?.[0]?.sku ?? "—";
                const category = (p.categoryId && typeof p.categoryId === "object" ? p.categoryId.name : null) ?? categoryLookup[idStr(p.categoryId)] ?? p.category ?? "—";
                const productId = p._id ?? p.id;
                const isPublished = normStatus(status) === "active";
                const isBusy = actionState.id === productId;
                const isChecked = selectedIds.has(productId);
                const { stock } = deriveProductMetrics(p);

                return (
                  <tr key={productId} className={`group transition-colors hover:bg-stone-50 ${isChecked ? "bg-[rgb(var(--tint-100)/0.6)]" : ""}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(productId)} aria-label={`Select ${name}`} className="h-4 w-4 rounded-[var(--radius-control)] border-stone-300 accent-[rgb(var(--brand))]" />
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => openView(p)} className="flex items-center gap-3 text-left">
                        {image ? (
                          <img src={image} alt="" className="h-10 w-10 rounded-[var(--radius-control)] object-cover ring-1 ring-slate-200" />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-stone-100 text-[10px] text-slate-300 ring-1 ring-slate-200">N/A</span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[240px] truncate font-bold text-slate-900 group-hover:text-[rgb(var(--brand-text))]">{name}</span>
                          <span className="block text-xs text-slate-500">{asin} · {category}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-medium">{vendorName(p.vendorId)}</td>
                    <td className="px-3 py-2.5"><StatusPill status={status} /></td>
                    <td className="px-3 py-2.5"><StockMeter stock={stock} status={status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                          {isPublished ? (
                            <RowAction title="Archive" onClick={() => runProductAction(p, "archive")} disabled={isBusy} hover="hover:text-amber-600">
                              {isBusy && actionState.type === "archive" ? <span className={spin("border-amber-300 border-t-amber-600")} /> : <ArchiveIcon size={15} />}
                            </RowAction>
                          ) : (
                            <RowAction title="Publish" onClick={() => runProductAction(p, "publish")} disabled={isBusy} hover="hover:text-emerald-600">
                              {isBusy && actionState.type === "publish" ? <span className={spin("border-emerald-300 border-t-emerald-600")} /> : <CheckCircle size={15} />}
                            </RowAction>
                          )}
                          <RowAction title="Duplicate" onClick={() => runProductAction(p, "duplicate")} disabled={isBusy} hover="hover:text-slate-900">
                            {isBusy && actionState.type === "duplicate" ? <span className={spin("border-stone-300 border-t-slate-700")} /> : <Copy size={15} />}
                          </RowAction>
                          <RowAction title="Delete" onClick={() => setDeleteTarget(p)} hover="hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></RowAction>
                        </div>
                        <RowAction title="Manage inventory" onClick={() => openView(p)} hover="hover:text-purple-600"><Boxes size={15} /></RowAction>
                        <RowAction title="Edit" onClick={() => navigate(`/vendor/products/${productId}/edit`)} hover="hover:text-[rgb(var(--brand-text))]"><Pencil size={15} /></RowAction>
                        <RowAction title="View details" onClick={() => openView(p)} hover="hover:text-blue-600"><Eye size={15} /></RowAction>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DataPager total={visibleProducts.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={updatePageSize} />
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-white shadow-pop">
          <span className="px-3 text-sm font-bold tabular-nums">{selectedIds.size} selected</span>
          <button onClick={() => runBulkStatusUpdate("Active")} disabled={bulkBusy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-white/10 disabled:opacity-50"><CheckCircle size={14} /> Publish</button>
          <button onClick={() => runBulkStatusUpdate("Suppressed")} disabled={bulkBusy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-white/10 disabled:opacity-50"><ArchiveIcon size={14} /> Archive</button>
          <button onClick={() => setBulkDeleteOpen(true)} disabled={bulkBusy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-white/10 disabled:opacity-50"><Trash2 size={14} /> Delete</button>
          {bulkBusy && <span className="ml-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          <button onClick={clearSelection} aria-label="Clear selection" className="ml-1 flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}