// EditProduct.jsx
// path: src/pages/products/EditProduct.jsx
//
// Same schema, tabs, and field set as AddProduct.jsx (single-product mode) —
// fetches the existing product with GET /products/:id, prefills every tab,
// and saves with PUT /products/:id instead of POST /products/add.
// UI restyled to the marketplace Dashboard design tokens. Logic unchanged.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronUp, ChevronDown, ArrowLeft, Plus, Trash2,
  Tag, Layers, X, GripVertical, Image as ImageIcon, Check, Sparkles, Box,
  FileText, Image, Palette, Shield, Search, Hash, AlertCircle, Package, Zap, Gem,
} from "lucide-react";

const BASE_URL          = "https://amazon-multi-vendor-3.onrender.com/api";
const PRODUCT_URL       = (id) => `${BASE_URL}/products/${id}`;
const CATEGORIES_URL    = `${BASE_URL}/categories`;
const SUBCATEGORIES_URL = `${BASE_URL}/subcategories`;
const SUBTOSUB_URL      = `${BASE_URL}/subtosubcategories`;
const CATEGORYATTR_URL  = `${BASE_URL}/categoryattribute`;

const OPTIONS_TYPES = ["dropdown", "multiselect", "color"];

const authConfig = () => {
  const token = localStorage.getItem("adminToken");
  const isUsableToken = token && token !== "null" && token !== "undefined";
  return isUsableToken ? { Authorization: `Bearer ${token}` } : {};
};

const readCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
const readSubCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subCategories)) return payload.subCategories;
  if (Array.isArray(payload?.subcategories)) return payload.subcategories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
const readSubToSubCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.subtosubcategories)) return payload.subtosubcategories;
  return [];
};
const normalizeCategory    = (c) => (c ? { ...c, name: c.name || c.categoryName || c.title || "Unnamed" } : c);
const normalizeSubCategory = (s) => (s ? { ...s, name: s.name || s.subCategoryName || s.title || "Unnamed" } : s);
const normalizeSubToSub    = (i) => (i ? { ...i, name: i.categoryvalue || i.name || "Unnamed" } : i);
const subCategoryCatId = (val) => (val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "");
const subToSubRefId    = (val) => (val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "");
const idOf = (val) => (val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "");

// ── Variant attribute/offer schema bridge ──────────────────────
// The UI keeps variant.attributes as an array [{ name, value }] because
// that's easy to edit row-by-row. The API stores/returns attributes as a
// plain object { Name: value }, and offer as { price, salePrice, discount }
// rather than { mrp, sellingPrice, salePrice }. These two helpers convert
// between the two shapes so neither side has to change.
const attrsToArray = (attrs) => {
  if (Array.isArray(attrs)) return attrs;
  if (attrs && typeof attrs === "object") return Object.entries(attrs).map(([name, value]) => ({ name, value }));
  return [];
};
const attrsArrayToObject = (attrs) => {
  const out = {};
  (Array.isArray(attrs) ? attrs : []).forEach((a) => { if (a?.name) out[a.name] = a.value; });
  return out;
};

/* ───────── design layer — same tokens as the marketplace Dashboard ───────── */
const serif = { fontFamily: "var(--font-display)" };
const GRAD = "bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]";
const BRAND_TXT = "text-[rgb(var(--brand-text))]";
const TINT = "bg-[rgb(var(--tint-100))]";
const LINE = "border-[rgb(var(--brand-line))]";
const FOCUS = "focus:border-[rgb(var(--brand))] focus:ring-2 focus:ring-[rgb(var(--brand)/0.18)]";
const ACCENT = "accent-[rgb(var(--brand))]";
const RCARD = "rounded-[var(--radius-card)]";
const RCTL = "rounded-[var(--radius-control)]";
const spinner = "inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-[rgb(var(--brand))]";

const inp =
  `mt-1 w-full ${RCTL} border border-stone-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none ${FOCUS} ` +
  "bg-white transition-all placeholder:text-slate-400 hover:border-stone-300";
const selectInp =
  `mt-1 w-full ${RCTL} border border-stone-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none ${FOCUS} ` +
  "bg-white transition-all hover:border-stone-300 cursor-pointer";
const listInp =
  `flex-1 ${RCTL} border border-stone-200 px-3.5 py-2.5 text-sm outline-none ${FOCUS} transition-all hover:border-stone-300`;
const btnPrimary =
  `inline-flex items-center justify-center gap-2 ${RCTL} ${GRAD} px-4 py-2.5 text-sm font-semibold text-white ` +
  "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost =
  `inline-flex items-center justify-center gap-2 ${RCTL} border border-stone-200 bg-white px-4 py-2.5 ` +
  "text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-50 disabled:opacity-50";
const btnBrandOutline =
  `${RCTL} border ${LINE} px-3.5 py-2 text-xs font-semibold ${BRAND_TXT} transition-colors hover:bg-[rgb(var(--tint-100))]`;
const btnMini =
  `${RCTL} border border-stone-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors`;
const iconRemove =
  `flex h-8 w-8 shrink-0 items-center justify-center ${RCTL} text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors`;
const labelCls = "block text-sm font-semibold text-slate-800";
const miniLabel = "block text-xs font-semibold text-slate-700";
const eyebrow = "text-xs font-medium text-slate-400";

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`} />
  );
}

function GlanceStat({ value, label }) {
  return (
    <div className="px-5 first:pl-0 last:pr-0">
      <p className="text-2xl font-semibold leading-none text-slate-900" style={serif}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center ${RCTL} ${GRAD}`}>
        {Icon && <Icon size={15} strokeWidth={1.6} className="text-white" />}
      </div>
      <h3 className="text-xl font-semibold text-slate-900" style={serif}>{label}</h3>
      <div className="h-px flex-1 bg-stone-200" />
    </div>
  );
}

function generateSlug(text) {
  return (text || "").toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function cartesian(arrays) {
  if (!arrays.length) return [[]];
  const [first, ...rest] = arrays;
  const restCombos = cartesian(rest);
  return first.flatMap((v) => restCombos.map((combo) => [v, ...combo]));
}
function variantSignature(attrs) {
  return attrs.map((a) => `${a.name}:${a.value}`).sort().join("|");
}
function buildVariantsFromMeta(attributesMeta) {
  const filled = attributesMeta.filter(
    (g) => g.forVariations !== false && g.name.trim() && g.values.some((v) => v.trim())
  );
  if (!filled.length) return [];
  const combos = cartesian(filled.map((g) => g.values.filter((v) => v.trim())));
  return combos.map((combo) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true, manageStock: true, sku: "", gtin: "",
    attributes: filled.map((g, i) => ({ name: g.name, value: combo[i] })),
    images: [], description: "", weight: "",
    dimensions: { length: "", width: "", height: "" },
    shippingClass: "", taxClass: "", stockStatus: "instock",
    inventory: { stock: "", quantity: "" },
    offer: { mrp: "", sellingPrice: "", salePrice: "", handlingTime: 2, itemCondition: "New", maximumOrderQuantity: 5 },
  }));
}
function regenerateVariants(existing, attributesMeta) {
  const fresh = buildVariantsFromMeta(attributesMeta);
  const byKey = new Map(existing.map((v) => [variantSignature(v.attributes), v]));
  return fresh.map((v) => {
    const match = byKey.get(variantSignature(v.attributes));
    return match ? { ...match, id: v.id, attributes: v.attributes } : v;
  });
}

function AttrField({ attr, value, onChange }) {
  const change = (e) => onChange(attr._id, e.target.value);
  const label = <>{attr.name}{attr.required && <span className="ml-1 text-rose-600">*</span>}</>;
  if (attr.type === "dropdown") {
    return (
      <label className="block text-sm font-medium text-slate-800">{label}
        <select value={value} onChange={change} className={selectInp}>
          <option value="">Select…</option>
          {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="block text-sm font-medium text-slate-800">{label}
      <input type={attr.type === "number" ? "number" : "text"} value={value} onChange={change}
        placeholder={`Enter ${attr.name.toLowerCase()}`} className={inp} />
    </label>
  );
}

function ValueTokenBox({ options, values, onChange, allowCreate }) {
  const [pending, setPending] = useState("");
  const remaining = options.filter((o) => !values.includes(o));
  const allSelected = options.length > 0 && values.length === options.length;
  const add = (v) => { const val = (v || "").trim(); if (!val || values.includes(val)) return; onChange([...values, val]); };
  const remove = (v) => onChange(values.filter((x) => x !== v));
  return (
    <div>
      <div className={`mt-1 flex min-h-[42px] flex-wrap items-center gap-1.5 ${RCTL} border border-stone-200 bg-white px-2.5 py-2 transition-all focus-within:border-[rgb(var(--brand))] focus-within:ring-2 focus-within:ring-[rgb(var(--brand)/0.18)]`}>
        {values.map((v) => (
          <span key={v} className={`inline-flex items-center gap-1 ${RCTL} bg-stone-100 py-1 pl-2 pr-1 text-xs font-medium text-slate-800`}>
            {v}
            <button type="button" onClick={() => remove(v)}
              className={`flex h-4 w-4 items-center justify-center ${RCTL} text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600`}>
              <X size={10} />
            </button>
          </span>
        ))}
        {remaining.length > 0 && (
          <select value="" onChange={(e) => add(e.target.value)}
            className="min-w-[110px] flex-1 cursor-pointer border-0 bg-transparent text-xs text-slate-500 outline-none">
            <option value="">{values.length ? "Add another value…" : "Select value(s)…"}</option>
            {remaining.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {values.length === 0 && remaining.length === 0 && !allowCreate && (
          <span className="text-xs text-slate-400">No options configured.</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onChange([...options])} disabled={!options.length || allSelected} className={btnMini}>Select all</button>
        <button type="button" onClick={() => onChange([])} disabled={!values.length} className={btnMini}>Select none</button>
        {allowCreate && (
          <div className="ml-auto flex items-center gap-1.5">
            <input value={pending} onChange={(e) => setPending(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(pending); setPending(""); } }}
              placeholder="New value…"
              className={`w-28 ${RCTL} border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-[rgb(var(--brand))]`} />
            <button type="button" onClick={() => { add(pending); setPending(""); }}
              className={`${RCTL} border border-dashed ${LINE} px-2.5 py-1 text-xs font-semibold ${BRAND_TXT} transition-colors hover:bg-[rgb(var(--tint-100))]`}>
              Create value
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AttributePanel({ group, onUpdate, onRemove }) {
  const [open, setOpen] = useState(true);
  const isCategory = !!group.fromCategory;
  return (
    <div className={`overflow-hidden ${RCARD} border border-stone-200 bg-white`}>
      <div className="flex cursor-pointer items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/70 px-4 py-3"
        onClick={() => setOpen((o) => !o)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <GripVertical size={14} className="shrink-0 text-slate-300" />
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center ${RCTL} bg-[rgb(var(--tint-200))]`}>
            <Tag size={12} className={BRAND_TXT} />
          </span>
          <p className="truncate text-sm font-semibold text-slate-900">{group.name || "Untitled attribute"}</p>
          {isCategory && (
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">From category</span>
          )}
          {group.values.length > 0 && (
            <span className={`shrink-0 text-xs font-semibold ${BRAND_TXT}`}>
              {group.values.length} value{group.values.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-xs font-semibold text-rose-600 hover:underline">
            Remove
          </button>
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </div>
      {open && (
        <div className="space-y-4 px-4 py-4">
          <label className={`block ${eyebrow}`}>
            Name
            {isCategory ? (
              <p className="mt-1 text-sm font-semibold text-slate-900">{group.name}</p>
            ) : (
              <input value={group.name} onChange={(e) => onUpdate({ ...group, name: e.target.value })}
                placeholder="e.g. Color" className={inp} />
            )}
          </label>
          <label className={`block ${eyebrow}`}>
            Value(s)
            <ValueTokenBox
              options={isCategory ? group.options : group.values}
              values={group.values}
              onChange={(values) => onUpdate({ ...group, values })}
              allowCreate={!isCategory}
            />
          </label>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={group.visible !== false}
                onChange={(e) => onUpdate({ ...group, visible: e.target.checked })}
                className={`h-4 w-4 rounded border-stone-300 ${ACCENT}`} />
              Visible on the product page
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={group.forVariations !== false}
                onChange={(e) => onUpdate({ ...group, forVariations: e.target.checked })}
                className={`h-4 w-4 rounded border-stone-300 ${ACCENT}`} />
              Used for variations
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function AttributesMetaBuilder({ attributesMeta, setAttributesMeta, attributes }) {
  const dropdownAttrs = attributes.filter(
    (a) => OPTIONS_TYPES.includes(a.type) && Array.isArray(a.options) && a.options.length > 0
  );
  const addedIds = new Set(attributesMeta.filter((g) => g.fromCategory).map((g) => g.catId));
  const availableAttrs = dropdownAttrs.filter((a) => !addedIds.has(a._id));
  const [pendingAttrId, setPendingAttrId] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const addExisting = () => {
    const attr = dropdownAttrs.find((a) => a._id === pendingAttrId);
    if (!attr) return;
    setAttributesMeta((prev) => [...prev, {
      id: attr._id, catId: attr._id, fromCategory: true,
      name: attr.name, options: attr.options, values: [], visible: true, forVariations: true,
    }]);
    setPendingAttrId("");
  };
  const addNew = () => setAttributesMeta((prev) => [...prev, {
    id: `custom-${Date.now()}`, fromCategory: false,
    name: "", options: [], values: [], visible: true, forVariations: true,
  }]);
  const updateGroup = (id, next) => setAttributesMeta((prev) => prev.map((g) => (g.id === id ? next : g)));
  const removeGroup = (id) => setAttributesMeta((prev) => prev.filter((g) => g.id !== id));
  const saveAttributes = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); };

  return (
    <div className="space-y-4">
      <div className={`${RCARD} border border-stone-200 bg-stone-50/60 p-4`}>
        <p className="mb-3 text-sm text-slate-500">
          Add descriptive pieces of information customers can use to find this product, like "Color" or "Size" —
          then pick which values apply, and which attributes should generate variations.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={addNew} className={btnBrandOutline}>Add new</button>
          {availableAttrs.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={pendingAttrId} onChange={(e) => setPendingAttrId(e.target.value)} className={`${selectInp} mt-0 w-52`}>
                <option value="">Add existing…</option>
                {availableAttrs.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
              <button type="button" onClick={addExisting} disabled={!pendingAttrId} className={`${btnPrimary} !px-3.5 !py-2 !text-xs`}>Add</button>
            </div>
          )}
        </div>
      </div>

      {attributesMeta.length === 0 && (
        <div className={`${RCARD} border-2 border-dashed border-stone-200 bg-stone-50/50 px-4 py-10 text-center`}>
          <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center ${RCTL} bg-stone-100`}>
            <Tag size={20} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500">No attributes added yet</p>
        </div>
      )}

      <div className="space-y-3">
        {attributesMeta.map((g) => (
          <AttributePanel key={g.id} group={g}
            onUpdate={(next) => updateGroup(g.id, next)}
            onRemove={() => removeGroup(g.id)} />
        ))}
      </div>

      {attributesMeta.length > 0 && (
        <div className="flex items-center gap-3 pt-1">
          <button type="button" onClick={saveAttributes} className={btnPrimary}>Save attributes</button>
          {savedFlash && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Check size={13} strokeWidth={3} /> Attributes saved
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const STOCK_STATUSES = [
  ["instock", "In stock"], ["outofstock", "Out of stock"], ["onbackorder", "On backorder"],
];

function VariantRow({ variant, index, attributesMeta, forceOpen, forceOpenTick, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpenTick]);

  const upd = (patch) => onChange({ ...variant, ...patch });
  const updNested = (key, patch) => onChange({ ...variant, [key]: { ...variant[key], ...patch } });
  const missingPrice = !variant.offer.mrp && !variant.offer.sellingPrice;

  const optionsFor = (attrName) => {
    const group = attributesMeta.find((g) => g.name === attrName);
    return group ? (group.fromCategory ? group.options : group.values) : [];
  };
  const setAttrValue = (attrName, value) => {
    upd({ attributes: variant.attributes.map((a) => (a.name === attrName ? { ...a, value } : a)) });
  };
  const chipField = `${RCTL} border border-stone-200 bg-white px-2 py-1 text-xs font-semibold ${BRAND_TXT} outline-none focus:border-[rgb(var(--brand))]`;

  return (
    <div className={`${RCARD} border ${missingPrice ? "border-[rgb(var(--brand-line)/0.6)]" : "border-stone-200"} overflow-hidden bg-white`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgb(var(--tint-100)/0.4)]">
        <GripVertical size={14} className="shrink-0 text-slate-300" />
        <span className="w-10 shrink-0 font-mono text-xs text-slate-400">#{index + 1}</span>
        <div className="flex min-w-[160px] flex-1 flex-wrap gap-2">
          {variant.attributes.map((a) => {
            const opts = optionsFor(a.name);
            return (
              <label key={a.name} className="inline-flex items-center gap-1.5 text-xs">
                <span className="hidden font-medium text-slate-400 sm:inline">{a.name}:</span>
                {opts.length ? (
                  <select value={a.value} onChange={(e) => setAttrValue(a.name, e.target.value)} className={`${chipField} cursor-pointer`}>
                    {!opts.includes(a.value) && a.value && <option value={a.value}>{a.value}</option>}
                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={a.value} onChange={(e) => setAttrValue(a.name, e.target.value)} className={`w-20 ${chipField}`} />
                )}
              </label>
            );
          })}
        </div>
        {missingPrice && (
          <span className={`hidden shrink-0 rounded-full border border-[rgb(var(--brand-line)/0.6)] ${TINT} px-2 py-0.5 text-[11px] font-semibold ${BRAND_TXT} sm:inline`}>
            No price
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-rose-600 hover:underline">Remove</button>
          <button type="button" onClick={() => setOpen((o) => !o)} className={`text-xs font-semibold ${BRAND_TXT} hover:underline`}>
            {open ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-6 border-t border-stone-200 px-4 py-5 md:grid-cols-[112px_1fr]">
          <div className="flex flex-col items-center gap-2">
            <div className={`flex h-24 w-24 items-center justify-center overflow-hidden ${RCTL} border-2 border-dashed border-stone-200 bg-stone-50`}>
              {variant.images[0]
                ? <img src={variant.images[0]} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                : <ImageIcon size={22} className="text-slate-300" />}
            </div>
            <input value={variant.images[0] ?? ""} onChange={(e) => upd({ images: e.target.value ? [e.target.value] : [] })}
              placeholder="Image URL"
              className={`w-full ${RCTL} border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-[rgb(var(--brand))]`} />
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className={miniLabel}>SKU
                <input value={variant.sku} onChange={(e) => upd({ sku: e.target.value })} placeholder="SKU-001" className={inp} />
              </label>
              <label className={miniLabel}>GTIN, UPC, EAN, or ISBN
                <input value={variant.gtin ?? ""} onChange={(e) => upd({ gtin: e.target.value })} placeholder="Optional" className={inp} />
              </label>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={variant.enabled !== false} onChange={(e) => upd({ enabled: e.target.checked })}
                  className={`h-4 w-4 rounded border-stone-300 ${ACCENT}`} />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={!!variant.manageStock} onChange={(e) => upd({ manageStock: e.target.checked })}
                  className={`h-4 w-4 rounded border-stone-300 ${ACCENT}`} />
                Manage stock?
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={miniLabel}>Regular price (₹)
                <input type="number" value={variant.offer.mrp} onChange={(e) => updNested("offer", { mrp: e.target.value })}
                  placeholder="Variation price (required)" className={inp} />
              </label>
              <label className={miniLabel}>Sale price (₹)
                <input type="number" value={variant.offer.salePrice} onChange={(e) => updNested("offer", { salePrice: e.target.value })}
                  placeholder="Optional" className={inp} />
              </label>
              <label className={miniLabel}>Selling price (₹)
                <input type="number" value={variant.offer.sellingPrice} onChange={(e) => updNested("offer", { sellingPrice: e.target.value })}
                  placeholder="0.00" className={inp} />
              </label>
              <label className={miniLabel}>Max order qty
                <input type="number" min="1" value={variant.offer.maximumOrderQuantity}
                  onChange={(e) => updNested("offer", { maximumOrderQuantity: Number(e.target.value) })} className={inp} />
              </label>
            </div>
            {variant.manageStock ? (
              <label className={miniLabel}>Quantity
                <input type="number" value={variant.inventory.stock}
                  onChange={(e) => updNested("inventory", { stock: e.target.value, quantity: e.target.value })}
                  placeholder="0" className={inp} />
              </label>
            ) : (
              <label className={miniLabel}>Stock status
                <select value={variant.stockStatus} onChange={(e) => upd({ stockStatus: e.target.value })} className={selectInp}>
                  {STOCK_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <label className={miniLabel}>Weight (kg)
                <input type="number" value={variant.weight} onChange={(e) => upd({ weight: e.target.value })} className={inp} />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["length", "width", "height"].map((k) => (
                  <label key={k} className={`${miniLabel} capitalize`}>{k}
                    <input type="number" value={variant.dimensions[k]}
                      onChange={(e) => updNested("dimensions", { [k]: e.target.value })} className={inp} />
                  </label>
                ))}
              </div>
            </div>
            <label className={miniLabel}>Description
              <textarea value={variant.description} onChange={(e) => upd({ description: e.target.value })}
                rows={3} className={`${inp} resize-none`} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function VariantsPanel({ attributesMeta, variants, setVariants }) {
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const [expandTick, setExpandTick] = useState(0);

  const regenerate = () => setVariants((prev) => regenerateVariants(prev, attributesMeta));
  const addBlankManual = () => setVariants((prev) => [...prev, {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true, manageStock: true, sku: "", gtin: "",
    attributes: attributesMeta.filter((g) => g.forVariations !== false && g.name.trim()).map((g) => ({ name: g.name, value: "" })),
    images: [], description: "", weight: "",
    dimensions: { length: "", width: "", height: "" },
    shippingClass: "", taxClass: "", stockStatus: "instock",
    inventory: { stock: "", quantity: "" },
    offer: { mrp: "", sellingPrice: "", salePrice: "", handlingTime: 2, itemCondition: "New", maximumOrderQuantity: 5 },
  }]);
  const updateAt = (idx, next) => setVariants((prev) => prev.map((v, i) => (i === idx ? next : v)));
  const removeAt = (idx) => setVariants((prev) => prev.filter((_, i) => i !== idx));

  const applyBulk = () => {
    if (!bulkAction) return;
    if (bulkAction === "deleteAll") { setVariants([]); setBulkAction(""); setBulkValue(""); return; }
    setVariants((prev) => prev.map((v) => {
      switch (bulkAction) {
        case "price":      return { ...v, offer: { ...v.offer, mrp: bulkValue, sellingPrice: bulkValue } };
        case "sale":       return { ...v, offer: { ...v.offer, salePrice: bulkValue } };
        case "stockIn":    return { ...v, manageStock: false, stockStatus: "instock" };
        case "stockOut":   return { ...v, manageStock: false, stockStatus: "outofstock" };
        case "enableAll":  return { ...v, enabled: true };
        case "disableAll": return { ...v, enabled: false };
        default: return v;
      }
    }));
    setBulkAction(""); setBulkValue("");
  };

  const missingPriceCount = variants.filter((v) => !v.offer.mrp && !v.offer.sellingPrice).length;
  const hasVariableAttrs = attributesMeta.some((g) => g.forVariations !== false && g.values.some((v) => v.trim()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={regenerate} className={btnBrandOutline}>
          {variants.length ? "Regenerate variations" : "Generate variations"}
        </button>
        <button type="button" onClick={addBlankManual} className={`${btnMini} !px-3.5 !py-2`}>Add manually</button>
        <div className="flex items-center gap-2">
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className={`${selectInp} mt-0 w-44`}>
            <option value="">Bulk actions…</option>
            <option value="price">Set regular price</option>
            <option value="sale">Set sale price</option>
            <option value="stockIn">Set all in stock</option>
            <option value="stockOut">Set all out of stock</option>
            <option value="enableAll">Enable all</option>
            <option value="disableAll">Disable all</option>
            <option value="deleteAll">Delete all variations</option>
          </select>
          {(bulkAction === "price" || bulkAction === "sale") && (
            <input value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} placeholder="₹"
              className={`w-20 ${RCTL} border border-stone-200 px-2 py-2 text-xs outline-none focus:border-[rgb(var(--brand))]`} />
          )}
          <button type="button" onClick={applyBulk} disabled={!bulkAction} className={`${btnPrimary} !px-3 !py-2 !text-xs`}>Apply</button>
        </div>
        <div className="ml-auto text-xs text-slate-500">
          {variants.length} variation{variants.length !== 1 ? "s" : ""}{" "}
          (
          <button type="button" className={`font-semibold ${BRAND_TXT} hover:underline`}
            onClick={() => { setExpandAll(true); setExpandTick((t) => t + 1); }}>Expand</button>
          {" / "}
          <button type="button" className={`font-semibold ${BRAND_TXT} hover:underline`}
            onClick={() => { setExpandAll(false); setExpandTick((t) => t + 1); }}>Close</button>
          )
        </div>
      </div>

      {missingPriceCount > 0 && (
        <div className={`flex items-center gap-2 ${RCTL} border border-[rgb(var(--brand-line)/0.6)] ${TINT} px-3.5 py-2.5 text-xs ${BRAND_TXT}`}>
          <AlertCircle size={13} className="shrink-0" />
          {missingPriceCount} variation{missingPriceCount !== 1 ? "s" : ""} do{missingPriceCount === 1 ? "es" : ""} not have a price.
        </div>
      )}

      {variants.length === 0 ? (
        <div className={`${RCARD} border-2 border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center`}>
          <p className="text-sm font-medium text-slate-400">
            {hasVariableAttrs
              ? 'Click "Generate variations" to build every combination.'
              : 'Select values on at least one attribute marked "Used for variations" above, then generate.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-500">{variants.length} variation{variants.length !== 1 ? "s" : ""}</p>
          {variants.map((v, i) => (
            <VariantRow key={v.id ?? i} variant={v} index={i} attributesMeta={attributesMeta}
              forceOpen={expandAll} forceOpenTick={expandTick}
              onChange={(next) => updateAt(i, next)} onRemove={() => removeAt(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tabs ──
function TabBasicInfo({ form, setForm, categories, subCategories, subToSubCategories,
  catLoading, subCatLoading, attrLoading, selectedCat, selectedSub, selectedSubSub,
  attributes, attrValues, setAttrValues, handleCatChange, handleSubChange, handleSubSubChange }) {
  const loadingRow = (
    <div className="mt-1 flex items-center gap-2 p-2.5 text-sm text-slate-400"><span className={spinner} /> Loading…</div>
  );
  return (
    <div className="space-y-8">
      <SectionTitle icon={Hash} label="Identifiers" />
      <div className="grid gap-5 md:grid-cols-2">
        <label className={`${labelCls} md:col-span-2`}>
          Product Name <span className="text-rose-600">*</span>
          <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className={inp} />
        </label>
        <label className={labelCls}>Item Name
          <input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} className={inp} />
        </label>
        <label className={labelCls}>Product Type
          <input value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })} className={inp} />
        </label>
        <label className={labelCls}>Brand Name
          <input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} className={inp} />
        </label>
        <label className={labelCls}>Recommended Browse Node
          <input value={form.recommendedBrowseNode} onChange={(e) => setForm({ ...form, recommendedBrowseNode: e.target.value })} className={inp} />
        </label>
        <label className={labelCls}>External Product ID
          <input value={form.externalProductId} onChange={(e) => setForm({ ...form, externalProductId: e.target.value })} className={inp} />
        </label>
        <label className={labelCls}>Base Price (₹)
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inp} />
        </label>
        <label className={labelCls}>Stock
          <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inp} />
        </label>
      </div>

      <SectionTitle icon={Layers} label="Category" />
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelCls}>
          Category <span className="text-rose-600">*</span>
          {catLoading ? loadingRow : (
            <select value={selectedCat} onChange={(e) => handleCatChange(e.target.value)} className={selectInp}>
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
        </label>
        <label className={labelCls}>
          Sub-category <span className="text-rose-600">*</span>
          {subCatLoading ? loadingRow : (
            <select value={selectedSub} onChange={(e) => handleSubChange(e.target.value)}
              disabled={!subCategories.length} className={`${selectInp} disabled:cursor-not-allowed disabled:opacity-50`}>
              <option value="">Select sub-category…</option>
              {subCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          )}
        </label>
        <label className={`${labelCls} md:col-span-2`}>
          Sub-to-sub category <span className="text-xs font-normal text-slate-400">(optional)</span>
          <select value={selectedSubSub} onChange={(e) => handleSubSubChange(e.target.value)}
            disabled={!subToSubCategories.length} className={`${selectInp} disabled:cursor-not-allowed disabled:opacity-50`}>
            <option value="">
              {!selectedSub ? "Select sub-category first" : subToSubCategories.length ? "Select sub-to-sub category…" : "None available"}
            </option>
            {subToSubCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {attrLoading && (
        <div className={`flex items-center gap-3 ${RCTL} border border-[rgb(var(--brand-line)/0.4)] ${TINT} px-4 py-3 text-sm ${BRAND_TXT}`}>
          <span className={`${spinner} shrink-0`} />
          Loading product attribute fields…
        </div>
      )}
      {!attrLoading && attributes.length > 0 && (
        <div className={`${RCARD} border border-stone-200 bg-stone-50/80 p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <p className={`text-sm font-semibold ${BRAND_TXT}`} style={serif}>Category attributes — {attributes.length} fields</p>
            <span className={`rounded-full ${GRAD} px-2 py-0.5 text-xs font-medium text-white`}>{attributes.filter((a) => a.required).length} required</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {attributes.map((attr) => (
              <AttrField key={attr._id} attr={attr} value={attrValues[attr._id] ?? ""}
                onChange={(id, val) => setAttrValues((prev) => ({ ...prev, [id]: val }))} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BulletEditor({ items, onAdd, onRemove, onUpdate, placeholder, addLabel, numbered }) {
  return (
    <div className="space-y-2.5">
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-3">
          {numbered && (
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--tint-200))] text-xs font-semibold ${BRAND_TXT}`}>{i + 1}</span>
          )}
          <input value={v} onChange={(e) => onUpdate(i, e.target.value)} placeholder={`${placeholder} ${i + 1}`} className={listInp} />
          {items.length > 1 && (
            <button onClick={() => onRemove(i)} className={iconRemove}><X size={14} /></button>
          )}
        </div>
      ))}
      <button onClick={onAdd} className={`mt-2 flex items-center gap-2 text-sm font-semibold ${BRAND_TXT} hover:underline ${numbered ? "ml-9" : ""}`}>
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

function TabDescription({ desc, setDesc }) {
  const addBullet    = () => setDesc((d) => ({ ...d, bulletPoints: [...d.bulletPoints, ""] }));
  const removeBullet = (i) => setDesc((d) => ({ ...d, bulletPoints: d.bulletPoints.filter((_, idx) => idx !== i) }));
  const updateBullet = (i, v) => setDesc((d) => ({ ...d, bulletPoints: d.bulletPoints.map((x, idx) => idx === i ? v : x) }));
  return (
    <div className="space-y-8">
      <SectionTitle icon={FileText} label="Product description" />
      <label className={labelCls}>
        Product Description
        <textarea value={desc.productDescription}
          onChange={(e) => setDesc((d) => ({ ...d, productDescription: e.target.value }))}
          rows={5} className={`${inp} resize-none`} />
      </label>

      <SectionTitle icon={Zap} label="Bullet points" />
      <BulletEditor items={desc.bulletPoints} onAdd={addBullet} onRemove={removeBullet} onUpdate={updateBullet}
        placeholder="Bullet point" addLabel="Add bullet point" numbered />

      <SectionTitle icon={Search} label="Search and meta keywords" />
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelCls}>
          Metadata <span className="text-xs font-normal text-slate-400">(space separated)</span>
          <input value={desc.metadata} onChange={(e) => setDesc((d) => ({ ...d, metadata: e.target.value }))} className={inp} />
        </label>
        <label className={labelCls}>
          Meta Keywords <span className="text-xs font-normal text-slate-400">(comma separated)</span>
          <input value={desc.metaKeywords} onChange={(e) => setDesc((d) => ({ ...d, metaKeywords: e.target.value }))} className={inp} />
        </label>
        <label className={`${labelCls} md:col-span-2`}>
          Search Keywords <span className="text-xs font-normal text-slate-400">(comma separated)</span>
          <input value={desc.searchKeywords} onChange={(e) => setDesc((d) => ({ ...d, searchKeywords: e.target.value }))} className={inp} />
        </label>
      </div>
    </div>
  );
}

function TabProductDetails({ details, setDetails }) {
  const upd    = (k, v) => setDetails((d) => ({ ...d, [k]: v }));
  const updDim = (section, k, v) => setDetails((d) => ({ ...d, [section]: { ...d[section], [k]: v } }));
  const addFeature    = () => setDetails((d) => ({ ...d, specialFeatures: [...d.specialFeatures, ""] }));
  const removeFeature = (i) => setDetails((d) => ({ ...d, specialFeatures: d.specialFeatures.filter((_, idx) => idx !== i) }));
  const updateFeature = (i, v) => setDetails((d) => ({ ...d, specialFeatures: d.specialFeatures.map((x, idx) => idx === i ? v : x) }));
  const addComp    = () => setDetails((d) => ({ ...d, includedComponents: [...d.includedComponents, ""] }));
  const removeComp = (i) => setDetails((d) => ({ ...d, includedComponents: d.includedComponents.filter((_, idx) => idx !== i) }));
  const updateComp = (i, v) => setDetails((d) => ({ ...d, includedComponents: d.includedComponents.map((x, idx) => idx === i ? v : x) }));
  const txt = (label, key, extra = {}) => (
    <label className={labelCls}>{label}
      <input value={details[key]} onChange={(e) => upd(key, e.target.value)} className={inp} {...extra} />
    </label>
  );
  const dims = (section) => (
    <div className="grid gap-5 md:grid-cols-3">
      {["length", "width", "height"].map((k) => (
        <label key={k} className={`${labelCls} capitalize`}>{k}
          <input type="number" value={details[section][k]} onChange={(e) => updDim(section, k, e.target.value)} className={inp} />
        </label>
      ))}
    </div>
  );
  return (
    <div className="space-y-8">
      <SectionTitle icon={Tag} label="Target and type" />
      <div className="grid gap-5 md:grid-cols-2">
        {txt("Target Audience", "targetAudienceKeyword")}
        {txt("Item Type Name", "itemTypeName")}
        {txt("Generic Keyword", "genericKeyword")}
        {txt("Occasion", "occasion")}
        {txt("Theme", "theme")}
        {txt("Item Shape / Fit", "itemShape")}
      </div>

      <SectionTitle icon={Box} label="Manufacturer" />
      <div className="grid gap-5 md:grid-cols-2">
        {txt("Manufacturer", "manufacturer")}
        {txt("Manufacturer Contact", "manufacturerContactInfo")}
        {txt("Model Number", "modelNumber")}
        {txt("Part Number", "partNumber")}
        {txt("Material", "material")}
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>Unit Count<input type="number" value={details.unitCount} onChange={(e) => upd("unitCount", e.target.value)} className={inp} /></label>
          {txt("Unit Type", "unitCountType")}
        </div>
      </div>

      <SectionTitle icon={Sparkles} label="Special features" />
      <BulletEditor items={details.specialFeatures} onAdd={addFeature} onRemove={removeFeature} onUpdate={updateFeature}
        placeholder="Feature" addLabel="Add feature" />

      <SectionTitle icon={Package} label="Included components" />
      <BulletEditor items={details.includedComponents} onAdd={addComp} onRemove={removeComp} onUpdate={updateComp}
        placeholder="Component" addLabel="Add component" />

      <SectionTitle icon={Box} label="Item dimensions (cm)" />
      {dims("itemDimensions")}

      <SectionTitle icon={Box} label="Package dimensions (cm)" />
      {dims("packageDimensions")}

      <SectionTitle icon={Package} label="Weight and packaging" />
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelCls}>Item Weight<input type="number" value={details.itemWeight} onChange={(e) => upd("itemWeight", e.target.value)} className={inp} /></label>
        <label className={labelCls}>Weight Unit<select value={details.itemWeightUnit} onChange={(e) => upd("itemWeightUnit", e.target.value)} className={selectInp}><option>grams</option><option>kg</option><option>lbs</option><option>oz</option></select></label>
        <label className={labelCls}>Package Weight (grams)<input type="number" value={details.packageWeight} onChange={(e) => upd("packageWeight", e.target.value)} className={inp} /></label>
        {txt("Packaging Type", "packagingType")}
        <label className={labelCls}>Source Type<select value={details.sourceType} onChange={(e) => upd("sourceType", e.target.value)} className={selectInp}><option>Manufacturer</option><option>Distributor</option><option>Reseller</option></select></label>
        <label className={labelCls}>Fulfillment Channel<select value={details.fulfillmentChannel} onChange={(e) => upd("fulfillmentChannel", e.target.value)} className={selectInp}><option>Seller</option><option>Marketplace</option><option>FBA</option></select></label>
        <label className={labelCls}>Number of Packs<input type="number" value={details.numberOfPacks} onChange={(e) => upd("numberOfPacks", e.target.value)} className={inp} /></label>
      </div>
    </div>
  );
}

function TabImages({ images, setImages }) {
  const addImage    = () => setImages((p) => [...p, ""]);
  const removeImage = (i) => setImages((p) => p.filter((_, idx) => idx !== i));
  const updateImage = (i, v) => setImages((p) => p.map((x, idx) => idx === i ? v : x));
  return (
    <div className="space-y-6">
      <SectionTitle icon={Image} label="Product images" />
      <div className="space-y-3">
        {images.map((url, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden ${RCTL} border border-stone-200 bg-stone-50`}>
              {url
                ? <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                : <ImageIcon size={18} className="text-slate-300" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input value={url} onChange={(e) => updateImage(i, e.target.value)}
                  placeholder="https://example.com/image.jpg" className={listInp} />
                {images.length > 1 && (
                  <button onClick={() => removeImage(i)} className={`${iconRemove} !h-10 !w-10`}><Trash2 size={15} /></button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {i === 0 ? <span className={`font-medium ${BRAND_TXT}`}>★ Main listing image</span> : `Image ${i + 1}`}
              </p>
            </div>
          </div>
        ))}
        <button onClick={addImage}
          className={`mt-2 flex w-full items-center justify-center gap-2 ${RCTL} border-2 border-dashed ${LINE} py-3.5 text-sm font-semibold ${BRAND_TXT} transition-all hover:bg-[rgb(var(--tint-100))]`}>
          <Plus size={15} /> Add image URL
        </button>
      </div>
    </div>
  );
}

function TabVariants({ attributesMeta, setAttributesMeta, variants, setVariants, attributes }) {
  return (
    <div className="space-y-8">
      <SectionTitle icon={Tag} label="Attributes" />
      <AttributesMetaBuilder attributesMeta={attributesMeta} setAttributesMeta={setAttributesMeta} attributes={attributes} />
      <SectionTitle icon={Layers} label="Variations" />
      <VariantsPanel attributesMeta={attributesMeta} variants={variants} setVariants={setVariants} />
    </div>
  );
}

function TabSafety({ safety, setSafety }) {
  const upd = (k, v) => setSafety((s) => ({ ...s, [k]: v }));
  const txt = (label, key, cls = "") => (
    <label className={`${labelCls} ${cls}`}>{label}
      <input value={safety[key]} onChange={(e) => upd(key, e.target.value)} className={inp} />
    </label>
  );
  return (
    <div className="space-y-8">
      <SectionTitle icon={Shield} label="Origin and compliance" />
      <div className="grid gap-5 md:grid-cols-2">
        {txt("Country / Region of Origin", "countryRegionOfOrigin")}
        <label className={labelCls}>Dangerous Goods Regulation<select value={safety.dangerousGoodsRegulation} onChange={(e) => upd("dangerousGoodsRegulation", e.target.value)} className={selectInp}><option value="No">No</option><option value="Yes">Yes</option></select></label>
        {txt("Buyer Age Restriction", "buyerAgeRestriction")}
        {txt("Regulatory Compliance Certification", "regulatoryComplianceCertification")}
        {txt("Mandatory Cautionary Statement", "mandatoryCautionaryStatement", "md:col-span-2")}
        {txt("Safety Attestation", "safetyAttestation")}
        {txt("Safety Attestation Address", "safetyAttestationAddress")}
      </div>
      <SectionTitle icon={Package} label="Shipping and gift" />
      <div className="flex flex-wrap gap-4">
        {[["shipsGlobally", "Ships Globally"], ["giftMessageAvailable", "Gift Message Available"], ["giftWrapAvailable", "Gift Wrap Available"]].map(([k, label]) => (
          <label key={k} className={`flex cursor-pointer items-center gap-3 ${RCTL} border-2 px-4 py-3 transition-all ${
            safety[k] ? `${LINE} ${TINT}` : "border-stone-200 bg-white hover:border-stone-300"
          }`}>
            <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
              safety[k] ? "border-[rgb(var(--brand))] bg-[rgb(var(--brand))]" : "border-stone-300 bg-white"
            }`}>
              {safety[k] && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
            <input type="checkbox" checked={safety[k]} onChange={(e) => upd(k, e.target.checked)} className="sr-only" />
            <span className="text-sm font-semibold text-slate-800">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TabSeo({ seo, setSeo, slug, setSlug, setSlugEdited, productName }) {
  const descLen  = seo.metaDesc.length;
  const titleLen = seo.metaTitle.length;
  const descColor = descLen > 160 ? "#b4475a" : descLen > 130 ? "#b7791f" : descLen > 0 ? "#2f7d5b" : "#94a3b8";
  return (
    <div className="space-y-6">
      <SectionTitle icon={Search} label="SEO settings" />
      <label className={labelCls}>
        <div className="mb-1 flex items-center justify-between">
          <span>Meta Title</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${titleLen > 60 ? "bg-rose-100 text-rose-700" : "bg-stone-100 text-slate-500"}`}>{titleLen}/60</span>
        </div>
        <input value={seo.metaTitle} onChange={(e) => setSeo((s) => ({ ...s, metaTitle: e.target.value }))} maxLength={70} className={inp} />
      </label>
      <label className={labelCls}>
        <div className="mb-1 flex items-center justify-between">
          <span>Meta Description</span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold" style={{ color: descColor }}>{descLen}/160</span>
        </div>
        <textarea value={seo.metaDesc} onChange={(e) => setSeo((s) => ({ ...s, metaDesc: e.target.value }))} rows={3} className={`${inp} resize-none`} />
      </label>
      <label className={labelCls}>
        <div className="mb-1 flex items-center justify-between">
          <span>URL Slug</span>
          {slug && <span className={`${RCTL} bg-stone-100 px-2 py-0.5 font-mono text-xs text-slate-500`}>/products/{slug}</span>}
        </div>
        <div className={`mt-1 flex overflow-hidden ${RCTL} border border-stone-200 transition-all focus-within:border-[rgb(var(--brand))] focus-within:ring-2 focus-within:ring-[rgb(var(--brand)/0.18)]`}>
          <span className="flex items-center whitespace-nowrap border-r border-stone-200 bg-stone-100 px-3 font-mono text-xs text-slate-500">/products/</span>
          <input value={slug} onChange={(e) => { setSlug(generateSlug(e.target.value)); setSlugEdited(true); }}
            className={`flex-1 bg-white px-3 py-2.5 font-mono text-sm outline-none ${BRAND_TXT}`} />
        </div>
      </label>
      <div className={`${RCARD} border border-stone-200 bg-stone-50/80 p-5`}>
        <div className="mb-4 flex items-center gap-2">
          <Search size={13} className="text-slate-400" />
          <p className={eyebrow}>Google search preview</p>
        </div>
        <div className={`${RCTL} border border-stone-200 bg-white p-4`}>
          <p className="mb-0.5 text-xs font-medium text-emerald-700">yoursite.com/products/<span>{slug || "product-slug"}</span></p>
          <p className="cursor-default text-lg font-medium leading-snug text-slate-500">{seo.metaTitle || productName || "Product Title — Your Store"}</p>
          <p className="mt-1 text-sm leading-snug text-slate-700">{seo.metaDesc ? seo.metaDesc.slice(0, 160) : "Your meta description will appear here…"}</p>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "basic",    label: "Basic Info",            icon: Hash },
  { id: "desc",     label: "Description",           icon: FileText },
  { id: "details",  label: "Product Details",       icon: Box },
  { id: "images",   label: "Images",                icon: Image },
  { id: "variants", label: "Attributes & Variants", icon: Palette },
  { id: "safety",   label: "Safety",                icon: Shield },
  { id: "seo",      label: "SEO",                   icon: Search },
];

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("basic");
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError,   setLoadError]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [vendorId, setVendorId] = useState("");

  const [categories,    setCategories]    = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [catLoading,    setCatLoading]    = useState(false);
  const [subCatLoading, setSubCatLoading] = useState(false);
  const [selectedCat,   setSelectedCat]   = useState("");
  const [selectedSub,   setSelectedSub]   = useState("");

  const [allSubToSub,        setAllSubToSub]        = useState([]);
  const [subToSubCategories, setSubToSubCategories] = useState([]);
  const [selectedSubSub,     setSelectedSubSub]     = useState("");

  const [attributes,  setAttributes]  = useState([]);
  const [attrValues,  setAttrValues]  = useState({});
  const [attrLoading, setAttrLoading] = useState(false);

  const [form, setForm] = useState({
    productName: "", itemName: "", productType: "", brandName: "",
    recommendedBrowseNode: "", externalProductId: "", price: "", stock: "",
  });
  const [desc, setDesc] = useState({
    productDescription: "", bulletPoints: [""], metadata: "", metaKeywords: "", searchKeywords: "",
  });
  const [details, setDetails] = useState({
    targetAudienceKeyword: "", modelNumber: "", manufacturer: "", genericKeyword: "",
    specialFeatures: [""], material: "", itemTypeName: "", occasion: "", partNumber: "",
    itemShape: "", theme: "", manufacturerContactInfo: "", unitCount: 1, unitCountType: "Piece",
    includedComponents: [""],
    itemDimensions:    { length: "", width: "", height: "" },
    packageDimensions: { length: "", width: "", height: "" },
    itemWeight: "", itemWeightUnit: "grams", packageWeight: "",
    packagingType: "", sourceType: "Manufacturer", fulfillmentChannel: "Seller", numberOfPacks: 1,
  });
  const [images, setImages] = useState([""]);
  const [safety, setSafety] = useState({
    countryRegionOfOrigin: "India", dangerousGoodsRegulation: "No", buyerAgeRestriction: "None",
    mandatoryCautionaryStatement: "", regulatoryComplianceCertification: "", safetyAttestation: "",
    safetyAttestationAddress: "", shipsGlobally: true, giftMessageAvailable: false, giftWrapAvailable: false,
  });
  const [attributesMeta, setAttributesMeta] = useState([]);
  const [variants,       setVariants]       = useState([]);
  const [seo,        setSeo]        = useState({ metaTitle: "", metaDesc: "" });
  const [slug,       setSlug]       = useState("");
  const [slugEdited, setSlugEdited] = useState(true); // don't auto-overwrite an existing slug

  // ── categories (once) ──
  useEffect(() => {
    setCatLoading(true);
    fetch(CATEGORIES_URL, { headers: authConfig() })
      .then((r) => r.json())
      .then((d) => setCategories(readCategories(d).map(normalizeCategory)))
      .catch(console.error)
      .finally(() => setCatLoading(false));

    fetch(SUBTOSUB_URL, { headers: authConfig() })
      .then((r) => r.json())
      .then((d) => setAllSubToSub(readSubToSubCategories(d).map(normalizeSubToSub)))
      .catch(() => setAllSubToSub([]));
  }, []);

  useEffect(() => {
    if (!selectedSub) { setSubToSubCategories([]); return; }
    setSubToSubCategories(allSubToSub.filter((s) => subToSubRefId(s.subCategoryId) === selectedSub));
  }, [selectedSub, allSubToSub]);

  // ── fetch the product being edited ──
  useEffect(() => {
    if (!id) return;
    setPageLoading(true);
    setLoadError("");

    fetch(PRODUCT_URL(id), { headers: authConfig() })
      .then((r) => r.json())
      .then(async (payload) => {
        const p = payload?.product ?? payload;
        const respVariants = payload?.variants ?? p?.variants ?? [];
        if (!p || !p._id) throw new Error("Product not found in response.");

        setVendorId(idOf(p.vendorId));

        setForm({
          productName: p.productName ?? "",
          itemName: p.itemName ?? "",
          productType: p.productType ?? "",
          brandName: p.brandName ?? "",
          recommendedBrowseNode: p.recommendedBrowseNode ?? "",
          externalProductId: p.externalProductId ?? "",
          price: p.price ?? "",
          stock: p.stock ?? "",
        });

        setDesc({
          productDescription: p.description?.productDescription ?? "",
          bulletPoints: p.description?.bulletPoints?.length ? p.description.bulletPoints : [""],
          metadata: p.metadata ?? "",
          metaKeywords: (p.metaKeywords ?? []).join(", "),
          searchKeywords: (p.searchKeywords ?? []).join(", "),
        });

        setDetails({
          targetAudienceKeyword: p.productDetails?.targetAudienceKeyword ?? "",
          modelNumber: p.productDetails?.modelNumber ?? "",
          manufacturer: p.productDetails?.manufacturer ?? "",
          genericKeyword: p.productDetails?.genericKeyword ?? "",
          specialFeatures: p.productDetails?.specialFeatures?.length ? p.productDetails.specialFeatures : [""],
          material: p.productDetails?.material ?? "",
          itemTypeName: p.productDetails?.itemTypeName ?? "",
          occasion: p.productDetails?.occasion ?? "",
          partNumber: p.productDetails?.partNumber ?? "",
          itemShape: p.productDetails?.itemShape ?? "",
          theme: p.productDetails?.theme ?? "",
          manufacturerContactInfo: p.productDetails?.manufacturerContactInfo ?? "",
          unitCount: p.productDetails?.unitCount ?? 1,
          unitCountType: p.productDetails?.unitCountType ?? "Piece",
          includedComponents: p.productDetails?.includedComponents?.length ? p.productDetails.includedComponents : [""],
          itemDimensions: {
            length: p.dimensions?.itemDimensions?.length ?? "",
            width:  p.dimensions?.itemDimensions?.width  ?? "",
            height: p.dimensions?.itemDimensions?.height ?? "",
          },
          packageDimensions: {
            length: p.dimensions?.packageDimensions?.length ?? "",
            width:  p.dimensions?.packageDimensions?.width  ?? "",
            height: p.dimensions?.packageDimensions?.height ?? "",
          },
          itemWeight: p.dimensions?.itemWeight ?? "",
          itemWeightUnit: p.dimensions?.itemWeightUnit ?? "grams",
          packageWeight: p.dimensions?.packageWeight ?? "",
          packagingType: p.packaging?.packagingType ?? "",
          sourceType: p.packaging?.sourceType ?? "Manufacturer",
          fulfillmentChannel: p.packaging?.fulfillmentChannel ?? "Seller",
          numberOfPacks: p.packaging?.numberOfPacks ?? 1,
        });

        setImages(p.images?.length ? p.images : [""]);

        setSafety({
          countryRegionOfOrigin: p.safetyCompliance?.countryRegionOfOrigin ?? "India",
          dangerousGoodsRegulation: p.safetyCompliance?.dangerousGoodsRegulation ?? "No",
          buyerAgeRestriction: p.safetyCompliance?.buyerAgeRestriction ?? "None",
          mandatoryCautionaryStatement: p.safetyCompliance?.mandatoryCautionaryStatement ?? "",
          regulatoryComplianceCertification: p.safetyCompliance?.regulatoryComplianceCertification ?? "",
          safetyAttestation: p.safetyCompliance?.safetyAttestation ?? "",
          safetyAttestationAddress: p.safetyCompliance?.safetyAttestationAddress ?? "",
          shipsGlobally: p.safetyCompliance?.shipsGlobally ?? true,
          giftMessageAvailable: p.giftOptions?.giftMessageAvailable ?? false,
          giftWrapAvailable: p.giftOptions?.giftWrapAvailable ?? false,
        });

        setAttributesMeta(
          (p.attributesMeta ?? []).map((g, i) => ({
            id: g._id ?? `existing-${i}-${Date.now()}`,
            fromCategory: false, // saved payload doesn't carry the category-attribute link back
            name: g.name ?? "",
            options: [],
            values: g.values ?? [],
            visible: g.visible !== false,
            forVariations: g.forVariations !== false,
          }))
        );

        setVariants(
          respVariants.map((v) => ({
            id: v._id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            enabled: v.enabled !== false,
            manageStock: v.manageStock !== false,
            sku: v.sku ?? "",
            gtin: v.gtin ?? "",
            // API may return attributes as a plain object ({ Color: "Red" })
            // or as an array — normalize to array for the editor UI.
            attributes: attrsToArray(v.attributes),
            images: v.images?.length ? v.images : [],
            description: v.description ?? "",
            weight: v.weight ?? "",
            dimensions: {
              length: v.dimensions?.length ?? "",
              width:  v.dimensions?.width  ?? "",
              height: v.dimensions?.height ?? "",
            },
            shippingClass: v.shippingClass ?? "",
            taxClass: v.taxClass ?? "",
            stockStatus: v.stockStatus ?? "instock",
            inventory: {
              // `inventory.stock` is the source of truth from the API; fall
              // back to a top-level `stock` field only if that's missing.
              stock: v.inventory?.stock ?? v.stock ?? "",
              quantity: v.inventory?.quantity ?? v.inventory?.stock ?? v.stock ?? "",
            },
            offer: {
              // API may send { price, salePrice, discount } instead of
              // { mrp, sellingPrice, salePrice } — accept either.
              mrp: v.offer?.mrp ?? v.offer?.price ?? "",
              sellingPrice: v.offer?.sellingPrice ?? v.offer?.price ?? "",
              salePrice: v.offer?.salePrice ?? "",
              handlingTime: v.offer?.handlingTime ?? 2,
              itemCondition: v.offer?.itemCondition ?? "New",
              maximumOrderQuantity: v.offer?.maximumOrderQuantity ?? 5,
            },
          }))
        );

        setSeo({ metaTitle: p.metaTitle ?? "", metaDesc: p.metaDescription ?? "" });
        setSlug(p.slug ?? "");

        // hydrate category dropdowns (fires sub-category + attribute fetches)
        const catId = idOf(p.categoryId);
        const subId = idOf(p.subCategoryId);
        const subSubId = idOf(p.subToSubCategoryId);

        if (catId) {
          setSelectedCat(catId);
          setSubCatLoading(true);
          try {
            const res  = await fetch(SUBCATEGORIES_URL, { headers: authConfig() });
            const data = await res.json();
            const all  = readSubCategories(data).map(normalizeSubCategory);
            const filtered = all.filter((s) => subCategoryCatId(s.categoryId) === catId);
            setSubCategories(filtered);
          } catch (e) { console.error(e); }
          finally { setSubCatLoading(false); }

          setAttrLoading(true);
          try {
            const res  = await fetch(`${CATEGORYATTR_URL}/category/${catId}`, { headers: authConfig() });
            const json = await res.json();
            const raw  = Array.isArray(json) ? json : (json.data ?? []);
            setAttributes(raw);
            const defaults = {};
            const existingAttrs = p.attributes ?? [];
            raw.forEach((a) => {
              const match = existingAttrs.find((ea) => idOf(ea.attributeId) === a._id || ea.name === a.name);
              defaults[a._id] = match?.value ?? "";
            });
            setAttrValues(defaults);
          } catch (e) { console.error(e); }
          finally { setAttrLoading(false); }
        }
        if (subId) setSelectedSub(subId);
        if (subSubId) setSelectedSubSub(subSubId);
      })
      .catch((e) => setLoadError(e.message || "Failed to load product."))
      .finally(() => setPageLoading(false));
  }, [id]);

  const handleCatChange = async (catId) => {
    setSelectedCat(catId);
    setSelectedSub(""); setSelectedSubSub("");
    setSubCategories([]); setSubToSubCategories([]);
    setAttributes([]); setAttrValues({});
    if (!catId) return;
    setSubCatLoading(true);
    try {
      const res  = await fetch(SUBCATEGORIES_URL, { headers: authConfig() });
      const data = await res.json();
      const all  = readSubCategories(data).map(normalizeSubCategory);
      setSubCategories(all.filter((s) => subCategoryCatId(s.categoryId) === catId));
    } catch (e) { console.error(e); }
    finally { setSubCatLoading(false); }
  };

  const handleSubChange = async (subId) => {
    setSelectedSub(subId);
    setSelectedSubSub("");
    setAttributes([]); setAttrValues({});
    if (!subId) return;
    setAttrLoading(true);
    try {
      const res  = await fetch(`${CATEGORYATTR_URL}/category/${selectedCat}`, { headers: authConfig() });
      const json = await res.json();
      const raw  = Array.isArray(json) ? json : (json.data ?? []);
      setAttributes(raw);
      const defaults = {};
      raw.forEach((a) => { defaults[a._id] = attrValues[a._id] ?? ""; });
      setAttrValues(defaults);
    } catch (e) { console.error(e); }
    finally { setAttrLoading(false); }
  };

  const handleSubSubChange = (subSubId) => setSelectedSubSub(subSubId);

  const buildPayload = () => ({
    vendorId,
    productName: form.productName,
    itemName: form.itemName,
    productType: form.productType,
    recommendedBrowseNode: form.recommendedBrowseNode,
    brandName: form.brandName,
    externalProductId: form.externalProductId,
    sku: form.externalProductId,
    price: Number(form.price || 0),
    stock: Number(form.stock || 0),
    categoryId: selectedCat,
    subCategoryId: selectedSub,
    subToSubCategoryId: selectedSubSub || "",
    metadata: desc.metadata,
    metaKeywords: desc.metaKeywords.split(",").map((s) => s.trim()).filter(Boolean),
    searchKeywords: desc.searchKeywords.split(",").map((s) => s.trim()).filter(Boolean),
    description: {
      productDescription: desc.productDescription,
      bulletPoints: desc.bulletPoints.filter((b) => b.trim()),
    },
    productDetails: {
      targetAudienceKeyword: details.targetAudienceKeyword,
      modelNumber: details.modelNumber,
      manufacturer: details.manufacturer,
      genericKeyword: details.genericKeyword,
      specialFeatures: details.specialFeatures.filter((f) => f.trim()),
      material: details.material,
      itemTypeName: details.itemTypeName,
      occasion: details.occasion,
      partNumber: details.partNumber,
      itemShape: details.itemShape,
      theme: details.theme,
      manufacturerContactInfo: details.manufacturerContactInfo,
      unitCount: Number(details.unitCount || 1),
      unitCountType: details.unitCountType,
      includedComponents: details.includedComponents.filter((c) => c.trim()),
    },
    dimensions: {
      itemDimensions: {
        length: Number(details.itemDimensions.length || 0),
        width:  Number(details.itemDimensions.width  || 0),
        height: Number(details.itemDimensions.height || 0),
      },
      packageDimensions: {
        length: Number(details.packageDimensions.length || 0),
        width:  Number(details.packageDimensions.width  || 0),
        height: Number(details.packageDimensions.height || 0),
      },
      itemWeight:     Number(details.itemWeight    || 0),
      itemWeightUnit: details.itemWeightUnit,
      packageWeight:  Number(details.packageWeight || 0),
    },
    packaging: {
      packagingType:      details.packagingType,
      sourceType:         details.sourceType,
      fulfillmentChannel: details.fulfillmentChannel,
      numberOfPacks:      Number(details.numberOfPacks || 1),
    },
    safetyCompliance: {
      countryRegionOfOrigin:             safety.countryRegionOfOrigin,
      dangerousGoodsRegulation:          safety.dangerousGoodsRegulation,
      buyerAgeRestriction:               safety.buyerAgeRestriction,
      mandatoryCautionaryStatement:      safety.mandatoryCautionaryStatement,
      regulatoryComplianceCertification: safety.regulatoryComplianceCertification,
      safetyAttestation:                 safety.safetyAttestation,
      safetyAttestationAddress:          safety.safetyAttestationAddress,
      shipsGlobally:                     safety.shipsGlobally,
      complianceMedia:                   [],
    },
    giftOptions: {
      giftMessageAvailable: safety.giftMessageAvailable,
      giftWrapAvailable:    safety.giftWrapAvailable,
    },
    images: images.filter((u) => u.trim()),
    attributes: attributes.map((a) => ({ attributeId: a._id, name: a.name, value: attrValues[a._id] ?? "" })),
    attributesMeta: attributesMeta
      .filter((g) => g.name.trim() && g.values.some((v) => v.trim()))
      .map((g) => ({
        name: g.name.trim(),
        values: g.values.filter((v) => v.trim()),
        visible: g.visible !== false,
        forVariations: g.forVariations !== false,
      })),
    // Variants go out matching the API's own sample payload shape:
    // attributes as a plain object, offer using price/salePrice/discount,
    // and inventory.stock as the authoritative stock quantity.
    variants: variants
      .filter((v) => v.enabled !== false)
      .map((v) => {
        const mrp = Number(v.offer.mrp || 0);
        const sale = Number(v.offer.salePrice || 0);
        const discount = mrp && sale ? Math.round(((mrp - sale) / mrp) * 100) : 0;
        return {
          sku: v.sku,
          gtin: v.gtin || "",
          attributes: attrsArrayToObject(v.attributes),
          images: v.images.filter((u) => u.trim()),
          description: v.description || "",
          weight: Number(v.weight || 0),
          dimensions: {
            length: Number(v.dimensions.length || 0),
            width:  Number(v.dimensions.width  || 0),
            height: Number(v.dimensions.height || 0),
          },
          shippingClass: v.shippingClass || "",
          taxClass: v.taxClass || "",
          inventory: {
            stock:    Number(v.inventory.stock || 0),
            quantity: Number(v.inventory.stock || 0),
            maxQty:   Number(v.offer.maximumOrderQuantity || 5),
          },
          stockStatus: v.manageStock ? undefined : v.stockStatus,
          offer: {
            price:                mrp,
            salePrice:            sale,
            discount,
            sellingPrice:         Number(v.offer.sellingPrice || 0),
            handlingTime:         v.offer.handlingTime,
            itemCondition:        v.offer.itemCondition,
            maximumOrderQuantity: Number(v.offer.maximumOrderQuantity || 5),
          },
        };
      }),
    slug: slug || generateSlug(form.productName),
    metaTitle: seo.metaTitle || form.productName,
    metaDescription: seo.metaDesc,
  });

  const handleSubmit = async () => {
    setSubmitError("");
    if (!form.productName.trim() || !selectedCat || !selectedSub) {
      setSubmitError("Product name, category, and sub-category are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(PRODUCT_URL(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authConfig() },
        body: JSON.stringify(buildPayload()),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = `Server error ${res.status}`;
        try { const e = JSON.parse(text); msg = e.message || e.error || e.msg || msg; } catch { /* not JSON */ }
        throw new Error(msg);
      }
      navigate("/admin/products", { state: { updated: true } });
    } catch (e) {
      setSubmitError(e.message || "Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabCls = (t) =>
    `-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
      activeTab === t
        ? `border-[rgb(var(--brand))] text-slate-900 bg-[rgb(var(--tint-100)/0.6)]`
        : "border-transparent text-slate-500 hover:text-slate-800"
    }`;

  if (pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-400">
        <span className={`${spinner} !h-6 !w-6`} />
        Loading product…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle size={32} className="text-rose-400" />
        <p className="text-sm text-rose-700">{loadError}</p>
        <button onClick={() => navigate("/admin/products")} className={btnGhost}>Back to products</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className={`relative overflow-hidden ${RCARD} bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-6 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-8`}>
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <button onClick={() => navigate("/admin/products")}
              className={`mb-4 inline-flex items-center gap-2 ${RCTL} border border-[rgb(var(--brand-line)/0.5)] bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white`}>
              <ArrowLeft size={15} /> Back to products
            </button>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} /> Inventory command center
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl" style={serif}>
              Edit listing
            </h1>
            <p className="mt-2 truncate text-sm text-slate-600">{form.productName || "Untitled product"}</p>
          </div>
          <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
            <GlanceStat value={variants.length} label="variations" />
            <GlanceStat value={images.filter((u) => u.trim()).length} label="images" />
            <GlanceStat value={attributesMeta.length} label="attributes" />
          </div>
        </div>
      </section>

      {/* Form panel */}
      <div className={`relative overflow-hidden ${RCARD} bg-white ring-1 ring-stone-200`}>
        <GoldLine />
        <div className="scrollbar-none flex overflow-x-auto border-b border-stone-200 bg-gradient-to-r from-[rgb(var(--tint-100))] to-[rgb(var(--tint-200))] px-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} className={tabCls(t.id)} onClick={() => setActiveTab(t.id)}>
                <Icon size={14} strokeWidth={1.6} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === "basic" && (
            <TabBasicInfo
              form={form} setForm={setForm}
              categories={categories} subCategories={subCategories} subToSubCategories={subToSubCategories}
              catLoading={catLoading} subCatLoading={subCatLoading} attrLoading={attrLoading}
              selectedCat={selectedCat} selectedSub={selectedSub} selectedSubSub={selectedSubSub}
              attributes={attributes} attrValues={attrValues} setAttrValues={setAttrValues}
              handleCatChange={handleCatChange} handleSubChange={handleSubChange} handleSubSubChange={handleSubSubChange}
            />
          )}
          {activeTab === "desc"     && <TabDescription desc={desc} setDesc={setDesc} />}
          {activeTab === "details"  && <TabProductDetails details={details} setDetails={setDetails} />}
          {activeTab === "images"   && <TabImages images={images} setImages={setImages} />}
          {activeTab === "variants" && (
            <TabVariants
              attributesMeta={attributesMeta} setAttributesMeta={setAttributesMeta}
              variants={variants} setVariants={setVariants} attributes={attributes}
            />
          )}
          {activeTab === "safety" && <TabSafety safety={safety} setSafety={setSafety} />}
          {activeTab === "seo"    && <TabSeo seo={seo} setSeo={setSeo} slug={slug} setSlug={setSlug} setSlugEdited={setSlugEdited} productName={form.productName} />}
        </div>

        {submitError && (
          <div className={`mx-6 mb-4 flex items-center gap-3 ${RCTL} border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800`}>
            <AlertCircle size={16} className="shrink-0" />
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50/60 px-6 py-4">
          <button onClick={() => navigate("/admin/products")} className={btnGhost}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className={btnPrimary}>
            {submitting && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}