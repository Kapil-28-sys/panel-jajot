import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Package, AlertTriangle, CheckCircle2, XCircle, Filter, Download, Edit3, Trash2, Eye,
  ArrowUpDown, ChevronLeft, ChevronRight, Loader2, RefreshCw, X, Tag, Building2,
  Calendar, Hash, Link2, Boxes, IndianRupee, Layers, Gem, RotateCw, Search,
} from "lucide-react";

/**
 * AllProductsAdmin.jsx
 * Styled to match the Dashboard (gold hairlines, serif display type, flip cards).
 * Data logic (list + per-product detail fetch, normalize, filters, sort, paging) is unchanged.
 */

const API_URL = "https://amazon-multi-vendor-3.onrender.com/api/products";

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

const STATUS_STYLES = {
  active: { tag: "bg-emerald-50 text-emerald-800 ring-emerald-200", icon: CheckCircle2, label: "Active" },
  draft: { tag: "bg-amber-50 text-amber-800 ring-amber-200", icon: AlertTriangle, label: "Draft" },
  inactive: { tag: "bg-stone-50 text-stone-700 ring-stone-200", icon: XCircle, label: "Inactive" },
  rejected: { tag: "bg-rose-50 text-rose-800 ring-rose-200", icon: XCircle, label: "Rejected" },
};

const STOCK_STYLES = {
  in_stock: { tag: "bg-emerald-50 text-emerald-800 ring-emerald-200", label: "In stock" },
  low_stock: { tag: "bg-amber-50 text-amber-800 ring-amber-200", label: "Low stock" },
  out_of_stock: { tag: "bg-rose-50 text-rose-800 ring-rose-200", label: "Out of stock" },
};

const statusStyle = (s) => STATUS_STYLES[(s || "").toLowerCase()] || STATUS_STYLES.inactive;
const stockStyle = (s) =>
  STOCK_STYLES[(s || "").toLowerCase()] || { tag: "bg-stone-50 text-stone-700 ring-stone-200", label: s || "Unknown" };

const fmt = (n) => n.toLocaleString("en-US");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const fmtRupee = (n) => (typeof n === "number" ? `₹${fmt(n)}` : "—");

/* ---------- data normalisation (unchanged) ---------- */

function normalize(raw) {
  const variants = (raw.variants || []).map((v) => ({
    id: v._id,
    name: v.variantName || "—",
    sku: v.sku || "—",
    productUrl: v.productUrl || null,
    attributes: (v.attributes || []).filter((a) => a.value),
    images: (v.images || []).filter((u) => u && u.startsWith("http")),
    isActive: !!v.isActive,
    mrp: v?.offer?.mrp ?? null,
    sellingPrice: v?.offer?.sellingPrice ?? null,
    salePrice: v?.offer?.salePrice ?? null,
    itemCondition: v?.offer?.itemCondition || null,
    handlingTime: v?.offer?.handlingTime ?? null,
    stock: v?.inventory?.stock ?? null,
    maxQty: v?.inventory?.maxQty ?? null,
    stockStatus: v?.inventory?.stockStatus || null,
  }));

  const activeVariants = variants.filter((v) => v.isActive);
  const sellPrices = variants.map((v) => v.salePrice ?? v.sellingPrice).filter((n) => typeof n === "number");
  const minPrice = sellPrices.length ? Math.min(...sellPrices) : null;
  const maxPrice = sellPrices.length ? Math.max(...sellPrices) : null;
  const totalStock = variants.reduce((sum, v) => sum + (typeof v.stock === "number" ? v.stock : 0), 0);
  const inStock = variants.some((v) => v.stockStatus === "in_stock" && (v.stock ?? 0) > 0);

  return {
    id: raw._id,
    sku: raw.sku || "—",
    name: raw.productName || raw.itemName || "Untitled product",
    itemName: raw.itemName || null,
    brand: raw.brandName || "—",
    category: raw?.categoryId?.name || "Uncategorized",
    categorySlug: raw?.categoryId?.slug || null,
    subcategoryId: raw.subcategoryId || null,
    subtosubcategoryid: raw.subtosubcategoryid || null,
    vendor: raw?.vendorId?.companyname || raw?.vendorId?.name || "—",
    vendorCity: raw?.vendorId?.city || null,
    vendorState: raw?.vendorId?.state || null,
    vendorEmail: raw?.vendorId?.email || null,
    vendorPhone: raw?.vendorId?.number || null,
    status: raw.status || "draft",
    isActive: !!raw.isActive,
    tags: raw.tags || [],
    image: (raw.images && raw.images.find((u) => u && u.startsWith("http"))) || null,
    images: (raw.images || []).filter((u) => u && u.startsWith("http")),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    productUrl: raw.productUrl || null,
    externalProductId: raw.externalProductId || null,
    productType: raw.productType || null,
    recommendedBrowseNode: raw.recommendedBrowseNode || null,
    description: raw?.description?.productDescription || "",
    bulletPoints: raw?.description?.bulletPoints || [],
    attributes: (raw.attributes || []).filter((a) => a.value),
    attributesMeta: raw.attributesMeta || [],
    productDetails: raw.productDetails || {},
    dimensions: raw.dimensions || {},
    packaging: raw.packaging || {},
    safetyCompliance: raw.safetyCompliance || {},
    externalInfo: raw.externalInfo || {},
    giftOptions: raw.giftOptions || {},
    metadata: raw.metadata || "",
    metaKeywords: raw.metaKeywords || [],
    searchKeywords: raw.searchKeywords || [],
    variants,
    variantCount: variants.length,
    activeVariantCount: activeVariants.length,
    minPrice,
    maxPrice,
    totalStock,
    inStock,
  };
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

function IconChip({ icon: Icon, palette }) {
  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-white`}>
      <Icon size={18} strokeWidth={1.6} />
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

function FilterSelect({ icon: Icon, label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 py-2 text-sm transition focus-within:border-[rgb(var(--brand-line))] focus-within:ring-2 focus-within:ring-[rgb(var(--brand-line)/0.3)]">
      {Icon && <Icon size={13} className="text-[rgb(var(--brand-text))]" />}
      <span className="text-slate-500">{label}</span>
      <select value={value} onChange={onChange} className="max-w-[160px] cursor-pointer bg-transparent font-medium text-slate-900 outline-none">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Th({ label, k, sortKey, onClick }) {
  const active = sortKey === k;
  return (
    <th className="px-3 py-3">
      <button
        onClick={() => onClick(k)}
        className={`flex items-center gap-1 ${active ? "font-semibold text-slate-900" : "text-slate-500"} hover:text-slate-900`}
      >
        {label} <ArrowUpDown size={11} className={active ? "text-[rgb(var(--brand-text))]" : "opacity-40"} />
      </button>
    </th>
  );
}

/* ---------- modal pieces ---------- */

function ModalSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 border-b border-stone-200 pb-1.5 text-xl font-semibold text-slate-900" style={serif}>{title}</h3>
      {children}
    </div>
  );
}

function MiniFact({ label, value }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-stone-200 bg-[rgb(var(--tint-50))] px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="break-words text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function FactGrid({ facts, min = 200 }) {
  const shown = facts.filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false);
  if (!shown.length) return null;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
      {shown.map(([l, v]) => <MiniFact key={l} label={l} value={v} />)}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 border-b border-stone-100 py-2">
      <Icon size={14} className="mt-0.5 shrink-0 text-[rgb(var(--brand-text))]" />
      <div className="flex-1">
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className="mt-0.5 break-words text-sm text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function Chip({ children, tone = "stone" }) {
  const tones = {
    stone: "bg-stone-100 text-slate-700",
    gold: "bg-[rgb(var(--tint-200))] text-[rgb(var(--brand-dark))]",
  };
  return <span className={`rounded-full px-3 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

function VariantCard({ v }) {
  const st = stockStyle(v.stockStatus);
  const discount = v.mrp && v.salePrice && v.mrp > v.salePrice ? Math.round(((v.mrp - v.salePrice) / v.mrp) * 100) : null;
  return (
    <div className="flex gap-3 rounded-[var(--radius-card)] border border-stone-200 bg-white p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-stone-100 ring-1 ring-[rgb(var(--brand-line)/0.3)]">
        {v.images[0] ? (
          <img src={v.images[0]} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <Package size={20} className="text-stone-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">{v.name}</div>
            <div className="font-mono text-[11px] text-slate-500">{v.sku}</div>
          </div>
          <span className={`whitespace-nowrap rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${st.tag}`}>{st.label}</span>
        </div>

        {v.attributes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {v.attributes.map((a, i) => (
              <span key={i} className="rounded-[var(--radius-control)] border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs">
                {a.name}: <strong>{a.value}</strong>
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          {v.salePrice != null && <span className="text-xl font-semibold text-[rgb(var(--brand-dark))]" style={serif}>{fmtRupee(v.salePrice)}</span>}
          {v.mrp != null && v.mrp !== v.salePrice && <span className="text-xs text-slate-500 line-through">{fmtRupee(v.mrp)}</span>}
          {discount != null && <span className="text-xs font-semibold text-emerald-700">{discount}% off</span>}
        </div>

        <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>Stock: <strong className="text-slate-900">{v.stock ?? "—"}</strong></span>
          <span>Max qty/order: <strong className="text-slate-900">{v.maxQty ?? "—"}</strong></span>
          {v.itemCondition && <span>Condition: <strong className="text-slate-900">{v.itemCondition}</strong></span>}
          {v.handlingTime != null && <span>Handling: <strong className="text-slate-900">{v.handlingTime}d</strong></span>}
        </div>
      </div>
    </div>
  );
}

function dims(d) {
  return d && (d.length || d.width || d.height) ? `${d.length ?? "—"} × ${d.width ?? "—"} × ${d.height ?? "—"} cm` : null;
}

function ProductModal({ product: p, onClose }) {
  const st = statusStyle(p.status);
  const StIcon = st.icon;
  const gallery = p.images && p.images.length ? p.images : p.image ? [p.image] : [];
  const pd = p.productDetails || {};
  const sc = p.safetyCompliance || {};
  const ex = p.externalInfo || {};
  const gift = p.giftOptions || {};
  const hasPd = Object.keys(pd).some((k) => (Array.isArray(pd[k]) ? pd[k].length > 0 : !!pd[k]));

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius-card)] bg-white shadow-2xl ring-1 ring-[rgb(var(--brand-line)/0.5)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] px-6 py-4">
          <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent" />
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={12} strokeWidth={1.6} /> Product details
            </p>
            <h2 className="truncate text-2xl font-semibold leading-tight text-slate-900" style={serif}>{p.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-wrap gap-6">
            <div className="flex w-44 flex-wrap gap-2">
              {gallery.length > 0 ? (
                gallery.slice(0, 4).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-20 w-20 rounded-[var(--radius-control)] object-cover ring-1 ring-[rgb(var(--brand-line)/0.4)]"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ))
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[var(--radius-control)] bg-stone-100">
                  <Package size={22} className="text-stone-400" />
                </div>
              )}
            </div>

            <div className="min-w-[260px] flex-1">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${st.tag}`}>
                  <StIcon size={12} /> {st.label}
                </span>
                {p.minPrice != null && (
                  <span className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-[rgb(var(--tint-200))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--brand-dark))] ring-1 ring-[rgb(var(--brand-line)/0.4)]">
                    <IndianRupee size={12} /> {fmtRupee(p.minPrice)}
                    {p.maxPrice != null && p.maxPrice !== p.minPrice ? ` – ${fmtRupee(p.maxPrice)}` : ""}
                  </span>
                )}
                {p.variantCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-stone-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-stone-200">
                    <Layers size={12} /> {p.variantCount} variant{p.variantCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <DetailRow icon={Tag} label="Brand" value={p.brand} />
              {p.itemName && p.itemName !== p.name && <DetailRow icon={Tag} label="Item name" value={p.itemName} />}
              <DetailRow icon={Filter} label="Category" value={p.category} />
              <DetailRow icon={Package} label="Product type" value={p.productType} />
              <DetailRow icon={Filter} label="Browse node" value={p.recommendedBrowseNode} />
              <DetailRow icon={Building2} label="Vendor" value={p.vendor} />
              {(p.vendorCity || p.vendorState) && (
                <DetailRow icon={Building2} label="Vendor location" value={[p.vendorCity, p.vendorState].filter(Boolean).join(", ")} />
              )}
              <DetailRow icon={Link2} label="Vendor email" value={p.vendorEmail} />
              <DetailRow icon={Link2} label="Vendor phone" value={p.vendorPhone} />
              <DetailRow icon={Hash} label="SKU" value={p.sku} />
              <DetailRow icon={Hash} label="External product ID" value={p.externalProductId} />
              <DetailRow icon={Link2} label="Product URL" value={p.productUrl} />
              <DetailRow icon={CheckCircle2} label="Active" value={p.isActive ? "Yes" : "No"} />
              <DetailRow icon={Boxes} label="Total stock across variants" value={p.variantCount > 0 ? `${fmt(p.totalStock)} units` : null} />
              <DetailRow icon={Calendar} label="Created" value={fmtDate(p.createdAt)} />
              <DetailRow icon={Calendar} label="Last updated" value={fmtDate(p.updatedAt)} />
            </div>
          </div>

          {p.description && (
            <ModalSection title="Description">
              <p className="text-sm leading-relaxed text-slate-700">{p.description}</p>
            </ModalSection>
          )}

          {p.bulletPoints?.length > 0 && (
            <ModalSection title="Highlights">
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                {p.bulletPoints.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </ModalSection>
          )}

          {p.variants?.length > 0 && (
            <ModalSection title={`Variants, pricing & stock (${p.variants.length})`}>
              <div className="flex flex-col gap-3">{p.variants.map((v) => <VariantCard key={v.id} v={v} />)}</div>
            </ModalSection>
          )}

          {p.attributesMeta?.length > 0 && (
            <ModalSection title="Variant options">
              <div className="flex flex-col gap-3">
                {p.attributesMeta.map((a, i) => (
                  <div key={i}>
                    <div className="mb-1.5 text-xs font-semibold text-slate-600">{a.name}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(a.values || []).map((val, j) => (
                        <span key={j} className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium">{val}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ModalSection>
          )}

          {p.attributes?.length > 0 && (
            <ModalSection title="Specifications">
              <FactGrid min={160} facts={p.attributes.map((a) => [a.name, `${a.value}${a.unit ? ` ${a.unit}` : ""}`])} />
            </ModalSection>
          )}

          {hasPd && (
            <ModalSection title="Manufacturing & specs">
              <FactGrid
                facts={[
                  ["Manufacturer", pd.manufacturer],
                  ["Manufacturer contact", pd.manufacturerContactInfo],
                  ["Model number", pd.modelNumber],
                  ["Part number", pd.partNumber],
                  ["Material", pd.material],
                  ["Item type", pd.itemTypeName],
                  ["Item shape", pd.itemShape],
                  ["Generic keyword", pd.genericKeyword],
                  ["Target audience", pd.targetAudienceKeyword],
                  ["Occasion", pd.occasion],
                  ["Theme", pd.theme],
                  ["Unit count", pd.unitCount ? `${pd.unitCount} ${pd.unitCountType || ""}` : null],
                  ["Special features", pd.specialFeatures?.length ? pd.specialFeatures.join(", ") : null],
                  ["Included components", pd.includedComponents?.length ? pd.includedComponents.join(", ") : null],
                ]}
              />
            </ModalSection>
          )}

          {(p.dimensions?.itemWeight || p.dimensions?.itemDimensions?.length || p.packaging?.packagingType) && (
            <ModalSection title="Dimensions & packaging">
              <FactGrid
                facts={[
                  ["Item dimensions (L×W×H)", dims(p.dimensions?.itemDimensions)],
                  ["Package dimensions (L×W×H)", dims(p.dimensions?.packageDimensions)],
                  ["Item weight", p.dimensions?.itemWeight ? `${p.dimensions.itemWeight} ${p.dimensions.itemWeightUnit || "g"}` : null],
                  ["Package weight", p.dimensions?.packageWeight ? `${p.dimensions.packageWeight} ${p.dimensions.itemWeightUnit || "g"}` : null],
                  ["Packaging", p.packaging?.packagingType],
                  ["Source type", p.packaging?.sourceType],
                  ["Fulfillment", p.packaging?.fulfillmentChannel],
                  ["Number of packs", p.packaging?.numberOfPacks],
                ]}
              />
            </ModalSection>
          )}

          {(sc.countryRegionOfOrigin || sc.regulatoryComplianceCertification) && (
            <ModalSection title="Safety & compliance">
              <FactGrid
                facts={[
                  ["Country of origin", sc.countryRegionOfOrigin],
                  ["Certifications", sc.regulatoryComplianceCertification],
                  ["Dangerous goods", sc.dangerousGoodsRegulation],
                  ["Age restriction", sc.buyerAgeRestriction],
                  ["Safety attestation", sc.safetyAttestation],
                  ["Attestation address", sc.safetyAttestationAddress],
                  ["Cautionary statement", sc.mandatoryCautionaryStatement],
                  ["Ships globally", sc.shipsGlobally !== undefined ? (sc.shipsGlobally ? "Yes" : "No") : null],
                ]}
              />
            </ModalSection>
          )}

          {(ex.externalProductInfoEntity || ex.importerContactInformation || ex.packerContactInformation) && (
            <ModalSection title="Import & external info">
              <FactGrid
                facts={[
                  ["Product origin", ex.externalProductInfo],
                  ["Origin entity", ex.externalProductInfoEntity],
                  ["Importer contact", ex.importerContactInformation],
                  ["Packer contact", ex.packerContactInformation],
                ]}
              />
            </ModalSection>
          )}

          {(gift.giftMessageAvailable !== undefined || gift.giftWrapAvailable !== undefined) && (
            <ModalSection title="Gift options">
              <FactGrid
                facts={[
                  ["Gift message", gift.giftMessageAvailable !== undefined ? (gift.giftMessageAvailable ? "Available" : "Not available") : null],
                  ["Gift wrap", gift.giftWrapAvailable !== undefined ? (gift.giftWrapAvailable ? "Available" : "Not available") : null],
                ]}
              />
            </ModalSection>
          )}

          {(p.searchKeywords?.length > 0 || p.metaKeywords?.length > 0) && (
            <ModalSection title="Keywords">
              {p.searchKeywords?.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1 text-xs text-slate-500">Search keywords</div>
                  <div className="flex flex-wrap gap-1.5">{p.searchKeywords.map((k, i) => <Chip key={i} tone="gold">{k}</Chip>)}</div>
                </div>
              )}
              {p.metaKeywords?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs text-slate-500">Meta keywords</div>
                  <div className="flex flex-wrap gap-1.5">{p.metaKeywords.map((k, i) => <Chip key={i}>{k}</Chip>)}</div>
                </div>
              )}
            </ModalSection>
          )}

          {p.tags?.length > 0 && (
            <ModalSection title="Tags">
              <div className="flex flex-wrap gap-1.5">{p.tags.map((t, i) => <Chip key={i}>{t}</Chip>)}</div>
            </ModalSection>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function AllProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiTotal, setApiTotal] = useState(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [vendor, setVendor] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [viewProduct, setViewProduct] = useState(null);
  const pageSize = 8;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}?page=1&limit=100`);
      if (!res.ok) throw new Error(`API returned ${res.status} ${res.statusText}`);
      const json = await res.json();
      const list = json.data || [];

      // The list endpoint has no `variants`; fetch each detail in parallel and merge.
      const withVariants = await Promise.all(
        list.map(async (raw) => {
          try {
            const dRes = await fetch(`${API_URL}/${raw._id}`);
            if (!dRes.ok) return raw;
            const dJson = await dRes.json();
            const detail = dJson.data || dJson.product || dJson;
            return { ...raw, variants: detail.variants || [] };
          } catch {
            return raw;
          }
        })
      );

      const rows = withVariants.map(normalize);
      setProducts(rows);
      setApiTotal(json?.pagination?.total ?? rows.length);
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()], [products]);
  const vendors = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.vendor).filter((v) => v && v !== "—"))).sort()],
    [products]
  );

  const filtered = useMemo(() => {
    const rows = products.filter((p) => {
      const q = query.toLowerCase();
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      const matchesCat = category === "All" || p.category === category;
      const matchesVendor = vendor === "All" || p.vendor === vendor;
      const matchesStatus = statusFilter === "All" || p.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesQuery && matchesCat && matchesVendor && matchesStatus;
    });
    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (sortKey === "createdAt" || sortKey === "updatedAt") return (new Date(av) - new Date(bv)) * dir;
      if (sortKey === "minPrice" || sortKey === "totalStock") return ((av ?? -Infinity) - (bv ?? -Infinity)) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [products, query, category, vendor, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every((p) => selected.has(p.id));
  const toggleSelectAll = () => {
    const next = new Set(selected);
    pageRows.forEach((p) => (allPageSelected ? next.delete(p.id) : next.add(p.id)));
    setSelected(next);
  };

  const stats = useMemo(() => {
    const total = apiTotal ?? products.length;
    const active = products.filter((p) => p.status.toLowerCase() === "active").length;
    const draft = products.filter((p) => p.status.toLowerCase() === "draft").length;
    const totalStock = products.reduce((sum, p) => sum + (p.totalStock || 0), 0);
    const catCount = {};
    products.forEach((p) => { catCount[p.category] = (catCount[p.category] || 0) + 1; });
    const topCategories = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, value]) => ({ label, value }));
    return { total, active, draft, totalStock, topCategories };
  }, [products, apiTotal]);

  const changeFilter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Catalog management
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              All products
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              {loading ? "Loading catalog…" : `Showing ${fmt(filtered.length)} of ${fmt(stats.total)} products across every vendor, with pricing and stock from each variant.`}
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={CheckCircle2} value={fmt(stats.active)} label="active listings" />
              <GlanceStat icon={AlertTriangle} value={fmt(stats.draft)} label="drafts" />
              <GlanceStat icon={Boxes} value={fmt(stats.totalStock)} label="units in stock" />
            </div>
            <div className="flex gap-2">
              <button className={goldButton} onClick={loadProducts} disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
              </button>
              <button className={ghostButton + " py-2 text-sm"}><Download size={14} /> Export</button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-l-4 border-stone-200 border-l-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>Couldn't load products from the API ({error}). If the server is waking up, wait a moment and select Refresh.</p>
        </div>
      )}

      {/* Flip stat cards */}
      <section aria-label="Catalog metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} /> Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatFlipCard
            label="Total products" value={fmt(stats.total)} helper="in the marketplace catalog" icon={Package} palette={palettes[1]}
            backTitle="Status split"
            rows={[
              { label: "Active", value: fmt(stats.active) },
              { label: "Draft", value: fmt(stats.draft) },
              { label: "Other", value: fmt(Math.max(products.length - stats.active - stats.draft, 0)) },
            ]}
          />
          <StatFlipCard
            label="Active" value={fmt(stats.active)} helper="live on the storefront" icon={CheckCircle2} palette={palettes[0]}
            backTitle="Live share"
            rows={[{ label: "Share of loaded", value: `${products.length ? Math.round((stats.active / products.length) * 100) : 0}%` }]}
          />
          <StatFlipCard
            label="Categories" value={fmt(categories.length - 1)} helper="with at least one product" icon={Filter} palette={palettes[2]}
            backTitle="Top categories" rows={stats.topCategories}
          />
          <StatFlipCard
            label="Units in stock" value={fmt(stats.totalStock)} helper="across all variants" icon={Boxes} palette={palettes[3]}
            backTitle="Stock overview"
            rows={[
              { label: "Draft listings", value: fmt(stats.draft) },
              { label: "Vendors", value: fmt(vendors.length - 1) },
            ]}
          />
        </div>
      </section>

      {/* Table panel */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />

        <div className="space-y-4 border-b border-stone-200 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
              <Package size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
              Product list
              <span className="text-xs font-normal text-slate-500" style={{ fontFamily: "inherit" }}>{filtered.length} shown</span>
            </h2>
            <div className="relative w-full sm:w-72">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={changeFilter(setQuery)}
                placeholder="Search name, SKU or brand"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect icon={Filter} label="Category" value={category} onChange={changeFilter(setCategory)} options={categories} />
            <FilterSelect icon={Building2} label="Vendor" value={vendor} onChange={changeFilter(setVendor)} options={vendors} />
            <FilterSelect label="Status" value={statusFilter} onChange={changeFilter(setStatusFilter)} options={["All", "Active", "Draft", "Inactive", "Rejected"]} />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[rgb(var(--brand-line)/0.3)] bg-[rgb(var(--tint-50))] px-6 py-3 text-sm">
            <span className="font-medium text-slate-800">{selected.size} selected</span>
            <button className={ghostButton}><Edit3 size={13} /> Bulk edit</button>
            <button className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100">
              <Trash2 size={13} /> Remove
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-800">Clear</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-sm text-slate-500">
            <Loader2 size={26} className="animate-spin text-[rgb(var(--brand-text))]" />
            Fetching products from the API…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-left text-xs font-medium">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label="Select all on this page" checked={allPageSelected} onChange={toggleSelectAll} className="h-3.5 w-3.5 accent-[rgb(var(--brand))]" />
                  </th>
                  <Th label="Product" k="name" sortKey={sortKey} onClick={toggleSort} />
                  <Th label="Brand" k="brand" sortKey={sortKey} onClick={toggleSort} />
                  <Th label="Vendor" k="vendor" sortKey={sortKey} onClick={toggleSort} />
                  <Th label="Status" k="status" sortKey={sortKey} onClick={toggleSort} />
                  <th className="px-4 py-3 text-right text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pageRows.map((p) => {
                  const st = statusStyle(p.status);
                  const StIcon = st.icon;
                  const isSel = selected.has(p.id);
                  return (
                    <tr key={p.id} className={`transition-colors hover:bg-stone-50 ${isSel ? "bg-[rgb(var(--tint-50))]" : ""}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" aria-label={`Select ${p.name}`} checked={isSel} onChange={() => toggleSelect(p.id)} className="h-3.5 w-3.5 accent-[rgb(var(--brand))]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-stone-100 ring-1 ring-[rgb(var(--brand-line)/0.3)]">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
                              />
                            ) : null}
                            <div className={`${p.image ? "hidden" : "flex"} h-full w-full items-center justify-center`}>
                              <Package size={16} className="text-stone-400" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[300px] truncate font-semibold text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{p.brand}</td>
                      <td className="px-3 py-3 text-slate-700">{p.vendor}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${st.tag}`}>
                          <StIcon size={12} /> {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setViewProduct(p)} className={ghostButton + " py-1.5"}>
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-14 text-center text-slate-500">
                      No products match your filters. Try clearing the search or category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-6 py-3 text-xs text-slate-500">
          <span>
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] border border-stone-300 bg-white hover:border-[rgb(var(--brand-line))] disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-7 min-w-[28px] rounded-[var(--radius-control)] border px-2 text-xs ${
                  n === page
                    ? "border-[rgb(var(--brand-line))] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] font-semibold text-white"
                    : "border-stone-300 bg-white text-slate-700 hover:border-[rgb(var(--brand-line))]"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] border border-stone-300 bg-white hover:border-[rgb(var(--brand-line))] disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {viewProduct && <ProductModal product={viewProduct} onClose={() => setViewProduct(null)} />}
    </div>
  );
}