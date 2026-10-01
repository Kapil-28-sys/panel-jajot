import { useEffect, useMemo, useState } from "react";
import {
  Box, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, GitBranch, Image, Layers, List,
  PackageSearch, Plus, ShieldAlert, X, Pencil, Trash2, Search, Route, Tags, Tag, Gem, RotateCw,
} from "lucide-react";
import { products } from "../../data/marketplaceData";
import { isAuthError } from "../../services/apiClient";
import * as categoryApi from "../../services/categoryApi";

/**
 * Categories.jsx
 * Styled to match the Dashboard (gold hairlines, serif display type, flip cards).
 * All API calls, normalizers and state logic are unchanged. MetricCard and
 * DataPager are replaced by dashboard-style flip cards and an inline pager.
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
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2 text-sm font-medium text-white ring-1 ring-[rgb(var(--brand-line)/0.6)] transition hover:from-[rgb(var(--brand-hover))] hover:to-[rgb(var(--brand-dark-hover))] disabled:cursor-not-allowed disabled:opacity-60";
const ghostButton =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[rgb(var(--brand-line))] hover:bg-[rgb(var(--tint-50))]";
const dangerButton =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-400 hover:bg-rose-50";
const inputClass =
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-2 focus:ring-[rgb(var(--brand-line)/0.3)] disabled:bg-stone-50";

/* ---------- category helpers (logic unchanged) ---------- */

const readCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const readCategory = (payload) => {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.category) return payload.category;
  if (payload.result) return payload.result;
  if (payload._id || payload.id || payload.name || payload.categoryName) return payload;
  return null;
};

const categoryKey = (category) => category._id || category.id || category.name;

// Backend may return either `status: "active"/"inactive"` or `isActive: boolean`.
const normalizeCategory = (category) => {
  if (!category) return category;
  const normalized = {
    ...category,
    name: category.name || category.categoryName || category.title || "",
    image: category.image || category.categoryImage || category.imageUrl || "",
    parentId: category.parentId || category.parent || category.parentCategory || category.parent_id || null,
    children: Array.isArray(category.children) ? category.children.map(normalizeCategory) : undefined,
  };
  if (normalized.status) return normalized;
  const status = typeof normalized.isActive === "boolean" ? (normalized.isActive ? "active" : "inactive") : "inactive";
  return { ...normalized, status };
};

const statusClass = (status) =>
  status?.toLowerCase() === "active"
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : "bg-amber-50 text-amber-800 ring-amber-200";

const EMPTY_FORM = { name: "", image: "", status: "active", parentId: "" };

const AUTH_ERROR_MESSAGE = "Your session has expired or is invalid. Please log in again to manage categories.";

const categoryPayload = (form) => ({
  name: form.name.trim(),
  categoryName: form.name.trim(),
  title: form.name.trim(),
  image: form.image.trim(),
  isActive: form.status === "active",
  status: form.status,
  parentId: form.parentId || null,
  parent: form.parentId || null,
});

const createCategory = (form) => categoryApi.createCategory(categoryPayload(form));
const updateCategory = (id, form) => categoryApi.updateCategory(id, categoryPayload(form));
const deleteCategoryRequest = (id) => categoryApi.deleteCategory(id);
const fetchTreeRequest = () => categoryApi.getCategoryTree();
const fetchChildrenRequest = (id) => categoryApi.getCategoryChildren(id);
const fetchParentsRequest = (id) => categoryApi.getCategoryParents(id);

// ── Sub category API ────────────────────────────────────────────────────────

const readSubCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subCategories)) return payload.subCategories;
  if (Array.isArray(payload?.subcategories)) return payload.subcategories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const readSubCategory = (payload) => {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.subCategory) return payload.subCategory;
  if (payload.result) return payload.result;
  if (payload._id || payload.id || payload.name) return payload;
  return null;
};

const subCategoryKey = (sub) => sub._id || sub.id || sub.name;

// Wraps a subcategory as a leaf tree node so it can be merged into the category tree.
const subCategoryToTreeNode = (sub) => ({
  _id: sub._id || sub.id,
  id: sub._id || sub.id,
  name: sub.name,
  status: sub.status,
  image: sub.image,
  hasChildren: false,
  isSubCategory: true,
  raw: sub,
});

// categoryId can be a plain id string OR a populated object like { _id, name }.
const subCategoryCatId = (val) => (val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "");

const normalizeSubCategory = (sub) => {
  if (!sub) return sub;
  const normalized = {
    ...sub,
    name: sub.name || sub.subCategoryName || sub.title || "",
    image: sub.image || sub.subCategoryImage || sub.imageUrl || "",
  };
  if (normalized.status) return normalized;
  const status = typeof normalized.isActive === "boolean" ? (normalized.isActive ? "active" : "inactive") : "inactive";
  return { ...normalized, status };
};

const EMPTY_SUB_FORM = { categoryId: "", name: "", image: "", status: "active" };

const subCategoryPayload = (form) => ({
  categoryId: form.categoryId.trim(),
  name: form.name.trim(),
  image: form.image.trim() || "default.jpg",
  status: form.status,
  isActive: form.status === "active",
});

const createSubCategory = (form) => categoryApi.createSubCategory(subCategoryPayload(form));
const updateSubCategory = (id, form) => categoryApi.updateSubCategory(id, subCategoryPayload(form));
const deleteSubCategoryRequest = (id) => categoryApi.deleteSubCategory(id);

// ── Sub-to-sub category API ─────────────────────────────────────────────────

const readSubToSubCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.subtosubcategories)) return payload.subtosubcategories;
  return [];
};

const readSubToSubCategory = (payload) => {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.result) return payload.result;
  if (payload._id || payload.id) return payload;
  return null;
};

const subToSubKey = (item) => item._id || item.id;

const subToSubRefId = (val) => (val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "");

// The API stores the display label in `categoryvalue`.
const normalizeSubToSub = (item) => {
  if (!item) return item;
  const normalized = { ...item, name: item.categoryvalue || item.name || "" };
  if (normalized.status) return normalized;
  const status = typeof normalized.isActive === "boolean" ? (normalized.isActive ? "active" : "inactive") : "inactive";
  return { ...normalized, status };
};

// Wraps a sub-to-sub category as a leaf tree node (third level of the tree).
const subToSubToTreeNode = (item) => ({
  _id: item._id || item.id,
  id: item._id || item.id,
  name: item.categoryvalue || item.name,
  status: item.status,
  isSubToSub: true,
  raw: item,
});

const EMPTY_SUBSUB_FORM = { categoryId: "", subCategoryId: "", categoryvalue: "", status: "active" };

const subToSubPayload = (form) => ({
  categoryId: form.categoryId,
  subCategoryId: form.subCategoryId,
  categoryvalue: form.categoryvalue.trim(),
  status: form.status,
  isActive: form.status === "active",
});

const createSubToSub = (form) => categoryApi.createSubToSubCategory(subToSubPayload(form));
const updateSubToSub = (id, form) => categoryApi.updateSubToSubCategory(id, subToSubPayload(form));
const deleteSubToSubRequest = (id) => categoryApi.deleteSubToSubCategory(id);

const NETWORK_ERROR_MESSAGE =
  "Unable to reach the server. It may be waking up (Render free tier) — try again in a few seconds, or check CORS/network in devtools.";

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
  const active = status?.toLowerCase() === "active";
  return (
    <span className={`inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium capitalize ring-1 ${statusClass(status)}`}>
      {active ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
      {status || "inactive"}
    </span>
  );
}

function Pager({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = "flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] border border-stone-300 bg-white hover:border-[rgb(var(--brand-line))] disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-6 py-3 text-xs text-slate-500">
      <div className="flex items-center gap-3">
        <span>Showing {from}–{to} of {total}</span>
        <label className="flex items-center gap-1.5">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-[rgb(var(--brand-line))]"
          >
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className={btn}>
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`h-7 min-w-[28px] rounded-[var(--radius-control)] border px-2 text-xs ${
              n === page
                ? "border-[rgb(var(--brand-line))] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] font-semibold text-white"
                : "border-stone-300 bg-white text-slate-700 hover:border-[rgb(var(--brand-line))]"
            }`}
          >
            {n}
          </button>
        ))}
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page" className={btn}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function PillSwitch({ value, onChange, options }) {
  return (
    <div className="inline-flex gap-1 rounded-[var(--radius-card)] bg-stone-100 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-3.5 py-1.5 text-sm font-medium transition ${
            value === o.key ? "bg-white text-slate-900 shadow-sm ring-1 ring-[rgb(var(--brand-line)/0.4)]" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <o.icon size={14} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, onClear, placeholder }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={onChange} placeholder={placeholder} className={`${inputClass} pl-9 pr-8`} />
      {value && (
        <button onClick={onClear} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children, maxWidth = "max-w-xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
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
        {children}
      </div>
    </div>
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-[var(--radius-control)] border border-l-4 border-stone-200 border-l-rose-500 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      {children}
    </p>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <select value={value} onChange={onChange} className={inputClass}>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  );
}

function FormActions({ onCancel, busy, label, busyLabel }) {
  return (
    <div className="flex justify-end gap-3 border-t border-stone-200 pt-4">
      <button type="button" onClick={onCancel} className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50">
        Cancel
      </button>
      <button type="submit" disabled={busy} className={goldButton}>
        <Plus size={16} />
        {busy ? busyLabel : label}
      </button>
    </div>
  );
}

function DeleteModal({ title, name, note, error, busy, onCancel, onConfirm }) {
  return (
    <ModalShell title={title} subtitle="This action cannot be undone." onClose={onCancel} maxWidth="max-w-sm">
      <div className="space-y-4 p-6">
        <ErrorNote>{error}</ErrorNote>
        <p className="text-sm text-slate-700">
          Are you sure you want to delete <span className="font-semibold text-slate-900">"{name}"</span>?{note ? ` ${note}` : ""}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={15} />
            {busy ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Tree node (recursive, 3 levels: category → sub category → sub-to-sub) ──
function TreeNode({
  node, depth, expandedIds, childrenCache, loadingIds, onToggle, onEdit, onDelete, onViewPath,
  onEditSub, onDeleteSub, onAddSubSub, onEditSubSub, onDeleteSubSub,
}) {
  const key = categoryKey(node);
  const isExpanded = expandedIds.has(key);
  const cachedChildren = childrenCache[key];
  const canExpand = !node.isSubToSub; // sub-to-sub nodes are always leaves
  const childList = cachedChildren || node.children || [];

  const icon = node.isSubToSub ? (
    <Tag size={13} className="shrink-0 text-slate-400" />
  ) : node.isSubCategory ? (
    <Tags size={14} className="shrink-0 text-[rgb(var(--brand-text))]" />
  ) : (
    <Box size={15} className="shrink-0 text-[rgb(var(--brand-text))]" />
  );

  const nameClass = node.isSubToSub ? "text-slate-600" : node.isSubCategory ? "font-medium text-slate-800" : "font-semibold text-slate-900";
  const badgeLabel = node.isSubToSub ? "Sub-sub" : node.isSubCategory ? "Sub" : null;

  const handleEdit = () => {
    if (node.isSubToSub) onEditSubSub(node.raw);
    else if (node.isSubCategory) onEditSub(node.raw);
    else onEdit(node);
  };
  const handleDelete = () => {
    if (node.isSubToSub) onDeleteSubSub(node.raw);
    else if (node.isSubCategory) onDeleteSub(node.raw);
    else onDelete(node);
  };

  return (
    <div>
      <div
        className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2 transition-colors hover:bg-stone-50"
        style={{ paddingLeft: 16 + depth * 24 }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            onClick={() => canExpand && onToggle(node)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${canExpand ? "text-slate-500 hover:bg-stone-100" : "invisible"}`}
          >
            {loadingIds.has(key) ? (
              <span className="h-3 w-3 animate-pulse rounded-full bg-[rgb(var(--brand-line))]" />
            ) : isExpanded ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )}
          </button>
          {icon}
          <span className={`truncate ${nameClass}`}>{node.name}</span>
          {badgeLabel && (
            <span className="shrink-0 rounded-[var(--radius-control)] bg-[rgb(var(--tint-200))] px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--brand-dark))]">{badgeLabel}</span>
          )}
          <StatusPill status={node.status} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!node.isSubCategory && !node.isSubToSub && (
            <button onClick={() => onViewPath(node)} className={ghostButton}>
              <Route size={12} /> Path
            </button>
          )}
          {node.isSubCategory && (
            <button onClick={() => onAddSubSub(node)} className={ghostButton} title="Add sub-to-sub category" aria-label="Add sub-to-sub category">
              <Plus size={12} />
            </button>
          )}
          <button onClick={handleEdit} className={ghostButton} aria-label="Edit">
            <Pencil size={12} />
          </button>
          <button onClick={handleDelete} className={dangerButton} aria-label="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {childList.length > 0 ? (
            childList.map((child) => (
              <TreeNode
                key={categoryKey(child)}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                childrenCache={childrenCache}
                loadingIds={loadingIds}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewPath={onViewPath}
                onEditSub={onEditSub}
                onDeleteSub={onDeleteSub}
                onAddSubSub={onAddSubSub}
                onEditSubSub={onEditSubSub}
                onDeleteSubSub={onDeleteSubSub}
              />
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-slate-400" style={{ paddingLeft: 16 + (depth + 1) * 24 }}>
              {node.isSubCategory ? "No sub-to-sub categories." : "No subcategories."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export default function Categories() {
  // categories | subcategories — top-level page tab
  const [activeTab, setActiveTab] = useState("categories");

  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // list | tree
  const [viewMode, setViewMode] = useState("list");
  const [treeData, setTreeData] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [childrenCache, setChildrenCache] = useState({});
  const [loadingChildIds, setLoadingChildIds] = useState(new Set());

  // Add / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add, object = edit
  const [form, setForm] = useState(EMPTY_FORM);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Path (breadcrumb) modal — GET /api/categories/parents/:id
  const [pathModal, setPathModal] = useState(null); // { category, path, loading, error }

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // ── Sub category state ───────────────────────────────────────────────────
  const [subCategories, setSubCategories] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subSaving, setSubSaving] = useState(false);
  const [subDeleting, setSubDeleting] = useState(false);
  const [subError, setSubError] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(5);

  const [showSubForm, setShowSubForm] = useState(false);
  const [subEditTarget, setSubEditTarget] = useState(null);
  const [subForm, setSubForm] = useState(EMPTY_SUB_FORM);
  const [subDeleteTarget, setSubDeleteTarget] = useState(null);

  // ── Sub-to-sub category state ────────────────────────────────────────────
  const [subToSubCategories, setSubToSubCategories] = useState([]);
  const [subSubLoading, setSubSubLoading] = useState(false);
  const [subSubSaving, setSubSubSaving] = useState(false);
  const [subSubDeleting, setSubSubDeleting] = useState(false);
  const [subSubError, setSubSubError] = useState("");

  const [showSubSubForm, setShowSubSubForm] = useState(false);
  const [subSubEditTarget, setSubSubEditTarget] = useState(null);
  const [subSubForm, setSubSubForm] = useState(EMPTY_SUBSUB_FORM);
  const [subSubDeleteTarget, setSubSubDeleteTarget] = useState(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name?.toLowerCase().includes(q) || c.status?.toLowerCase().includes(q));
  }, [categories, search]);

  const activeCategories = useMemo(() => categories.filter((c) => c.status?.toLowerCase() === "active").length, [categories]);

  const pagedCategories = filteredCategories.slice((page - 1) * pageSize, page * pageSize);

  const parentOptions = useMemo(
    () => categories.filter((c) => !editTarget || categoryKey(c) !== categoryKey(editTarget)),
    [categories, editTarget]
  );

  const parentNameFor = (parentId) => {
    if (!parentId) return null;
    const parent = categories.find((c) => categoryKey(c) === parentId);
    return parent?.name || null;
  };

  const listingsFor = (categoryName) => products.filter((p) => p.category === categoryName).length;

  const topByListings = useMemo(
    () =>
      categories
        .map((c) => ({ label: c.name, value: listingsFor(c.name) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3),
    [categories]
  );

  // ── Sub category derived ─────────────────────────────────────────────────
  const categoryNameFor = (categoryIdVal) => {
    const id = subCategoryCatId(categoryIdVal);
    if (typeof categoryIdVal === "object" && categoryIdVal?.name) return categoryIdVal.name;
    return categories.find((c) => categoryKey(c) === id)?.name || "—";
  };

  const filteredSubCategories = useMemo(() => {
    if (!subSearch.trim()) return subCategories;
    const q = subSearch.toLowerCase();
    return subCategories.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q) ||
        categoryNameFor(s.categoryId).toLowerCase().includes(q)
    );
  }, [subCategories, subSearch, categories]);

  const activeSubCategories = useMemo(() => subCategories.filter((s) => s.status?.toLowerCase() === "active").length, [subCategories]);

  const pagedSubCategories = filteredSubCategories.slice((subPage - 1) * subPageSize, subPage * subPageSize);

  const subsPerParent = useMemo(() => {
    const counts = {};
    subCategories.forEach((s) => {
      const name = categoryNameFor(s.categoryId);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, value]) => ({ label, value }));
  }, [subCategories, categories]);

  // ── API helpers ───────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await categoryApi.getCategories();
      setCategories(readCategories(data).map(normalizeCategory));
    } catch (err) {
      setError(isAuthError(err) ? AUTH_ERROR_MESSAGE : err.response?.data?.message || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTree = async () => {
    try {
      setTreeLoading(true);
      setError("");
      const data = await fetchTreeRequest();
      setTreeData(readCategories(data).map(normalizeCategory));
    } catch (err) {
      setError(isAuthError(err) ? AUTH_ERROR_MESSAGE : err.response?.data?.message || "Unable to load category tree.");
    } finally {
      setTreeLoading(false);
    }
  };

  // GET /api/subcategories
  const fetchSubCategories = async () => {
    try {
      setSubLoading(true);
      setSubError("");
      const data = await categoryApi.getSubCategories();
      setSubCategories(readSubCategories(data).map(normalizeSubCategory));
    } catch (err) {
      setSubError(isAuthError(err) ? AUTH_ERROR_MESSAGE : err.response?.data?.message || "Unable to load sub categories.");
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (viewMode === "tree" && treeData.length === 0) fetchTree();
  }, [viewMode]);

  useEffect(() => {
    if (activeTab === "subcategories" && subCategories.length === 0) fetchSubCategories();
  }, [activeTab]);

  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  // Loads subcategories on demand (once) so the tree view can merge them in.
  const ensureSubCategories = async () => {
    if (subCategories.length > 0) return subCategories;
    try {
      setSubLoading(true);
      const data = await categoryApi.getSubCategories();
      const list = readSubCategories(data).map(normalizeSubCategory);
      setSubCategories(list);
      return list;
    } catch {
      return []; // don't block tree rendering if subcategories fail to load
    } finally {
      setSubLoading(false);
    }
  };

  // Loads sub-to-sub categories on demand (once) for the tree view.
  const ensureSubToSubCategories = async () => {
    if (subToSubCategories.length > 0) return subToSubCategories;
    try {
      setSubSubLoading(true);
      const data = await categoryApi.getSubToSubCategories();
      const list = readSubToSubCategories(data).map(normalizeSubToSub);
      setSubToSubCategories(list);
      return list;
    } catch {
      return [];
    } finally {
      setSubSubLoading(false);
    }
  };

  const toggleTreeNode = async (node) => {
    const key = categoryKey(node);
    const next = new Set(expandedIds);

    if (next.has(key)) {
      next.delete(key);
      setExpandedIds(next);
      return;
    }

    next.add(key);
    setExpandedIds(next);

    // Already merged and cached from a previous expand.
    if (childrenCache[key]) return;

    const nodeId = node._id || node.id;

    try {
      setLoadingChildIds((prev) => new Set(prev).add(key));

      // Level 2 → 3: sub-category — load its sub-to-sub categories (always leaves).
      if (node.isSubCategory) {
        const subSubs = await ensureSubToSubCategories();
        const matching = subSubs.filter((s) => subToSubRefId(s.subCategoryId) === nodeId).map(subToSubToTreeNode);
        setChildrenCache((prev) => ({ ...prev, [key]: matching }));
        return;
      }

      // Level 1 → 2: category. 1) nested category children (parentId relation).
      let categoryChildren = Array.isArray(node.children) ? node.children : [];
      if (categoryChildren.length === 0) {
        try {
          const data = await fetchChildrenRequest(nodeId);
          categoryChildren = readCategories(data).map(normalizeCategory);
        } catch {
          categoryChildren = [];
        }
      }

      // 2) real subcategories tied to this category via categoryId.
      const subs = await ensureSubCategories();
      const matchingSubs = subs.filter((s) => subCategoryCatId(s.categoryId) === nodeId).map(subCategoryToTreeNode);

      setChildrenCache((prev) => ({ ...prev, [key]: [...categoryChildren, ...matchingSubs] }));
    } finally {
      setLoadingChildIds((prev) => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
    }
  };

  const openPath = async (category) => {
    setPathModal({ category, path: [], loading: true, error: "" });
    try {
      const data = await fetchParentsRequest(category._id || category.id);
      const path = readCategories(data).map(normalizeCategory);
      setPathModal({ category, path, loading: false, error: "" });
    } catch (err) {
      setPathModal({ category, path: [], loading: false, error: err.response?.data?.message || "Unable to load category path." });
    }
  };

  // ── Open / close modals ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (category) => {
    setEditTarget(category);
    setForm({
      name: category.name,
      image: category.image || "",
      status: category.status || "active",
      parentId: category.parentId || "",
    });
    setError("");
    setShowForm(true);
  };

  const openDelete = (category) => {
    setDeleteTarget(category);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setError("");
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setError("");
  };

  const closePath = () => setPathModal(null);

  // Invalidate cached tree data so the tree refetches after a mutation.
  const invalidateTree = () => {
    setTreeData([]);
    setChildrenCache({});
    setExpandedIds(new Set());
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const saveCategory = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      setError("");

      if (editTarget) {
        const data = await updateCategory(editTarget._id || editTarget.id, form);
        const updatedCategory = readCategory(data);

        if (data?.success !== false && updatedCategory) {
          const updated = normalizeCategory(updatedCategory);
          setCategories((prev) => prev.map((c) => (categoryKey(c) === categoryKey(editTarget) ? updated : c)));
          invalidateTree();
        } else {
          setError(data?.message || "Unable to update category.");
          await fetchCategories();
        }
      } else {
        // POST /api/categories/add
        const data = await createCategory(form);
        const createdCategory = readCategory(data);

        if (data?.success !== false && createdCategory) {
          setCategories((prev) => [normalizeCategory(createdCategory), ...prev]);
          invalidateTree();
        } else {
          setError(data?.message || "Unable to create category.");
          await fetchCategories();
        }
        setPage(1);
      }

      closeForm();
    } catch (err) {
      console.error("saveCategory failed:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        isNetworkError: !err.response,
      });

      if (!err.response) setError(NETWORK_ERROR_MESSAGE);
      else if (isAuthError(err)) setError(AUTH_ERROR_MESSAGE);
      else setError(err.response?.data?.message || `Unable to save category (status ${err.response.status}).`);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError("");
      const data = await deleteCategoryRequest(deleteTarget._id || deleteTarget.id);

      if (data?.success === false) {
        setError(data?.message || "Unable to delete category.");
        return;
      }

      setCategories((prev) => prev.filter((c) => categoryKey(c) !== categoryKey(deleteTarget)));
      invalidateTree();
      closeDelete();
      setPage(1);
    } catch (err) {
      setError(isAuthError(err) ? AUTH_ERROR_MESSAGE : err.response?.data?.message || "Unable to delete category.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Sub category modal helpers ───────────────────────────────────────────
  const openSubAdd = () => {
    setSubEditTarget(null);
    setSubForm(EMPTY_SUB_FORM);
    setSubError("");
    setShowSubForm(true);
  };

  const openSubEdit = (sub) => {
    setSubEditTarget(sub);
    setSubForm({
      categoryId: subCategoryCatId(sub.categoryId),
      name: sub.name || "",
      image: sub.image || "",
      status: sub.status || "active",
    });
    setSubError("");
    setShowSubForm(true);
  };

  const openSubDelete = (sub) => {
    setSubDeleteTarget(sub);
    setSubError("");
  };

  const closeSubForm = () => {
    setShowSubForm(false);
    setSubEditTarget(null);
    setSubError("");
  };

  const closeSubDelete = () => {
    setSubDeleteTarget(null);
    setSubError("");
  };

  // ── Sub category save — POST /add, PUT /update/:id ───────────────────────
  const saveSubCategory = async (event) => {
    event.preventDefault();
    if (!subForm.name.trim()) return;
    if (!subForm.categoryId.trim()) {
      setSubError("Please select a parent category.");
      return;
    }

    try {
      setSubSaving(true);
      setSubError("");

      if (subEditTarget) {
        const data = await updateSubCategory(subEditTarget._id || subEditTarget.id, subForm);
        const updated = readSubCategory(data);
        if (data?.success !== false && updated) {
          const normalized = normalizeSubCategory(updated);
          setSubCategories((prev) => prev.map((s) => (subCategoryKey(s) === subCategoryKey(subEditTarget) ? normalized : s)));
          invalidateTree();
        } else {
          setSubError(data?.message || "Unable to update sub category.");
          await fetchSubCategories();
        }
      } else {
        const data = await createSubCategory(subForm);
        const created = readSubCategory(data);
        if (data?.success !== false && created) {
          setSubCategories((prev) => [normalizeSubCategory(created), ...prev]);
          invalidateTree();
        } else {
          setSubError(data?.message || "Unable to create sub category.");
          await fetchSubCategories();
        }
        setSubPage(1);
      }

      closeSubForm();
    } catch (err) {
      if (!err.response) setSubError(NETWORK_ERROR_MESSAGE);
      else if (isAuthError(err)) setSubError(AUTH_ERROR_MESSAGE);
      else setSubError(err.response?.data?.message || `Unable to save sub category (status ${err.response.status}).`);
    } finally {
      setSubSaving(false);
    }
  };

  // ── Sub category delete — DELETE /delete/:id ──────────────────────────────
  const deleteSubCategory = async () => {
    if (!subDeleteTarget) return;
    try {
      setSubDeleting(true);
      setSubError("");
      const data = await deleteSubCategoryRequest(subDeleteTarget._id || subDeleteTarget.id);

      if (data?.success === false) {
        setSubError(data?.message || "Unable to delete sub category.");
        return;
      }

      setSubCategories((prev) => prev.filter((s) => subCategoryKey(s) !== subCategoryKey(subDeleteTarget)));
      invalidateTree();
      closeSubDelete();
      setSubPage(1);
    } catch (err) {
      setSubError(isAuthError(err) ? AUTH_ERROR_MESSAGE : err.response?.data?.message || "Unable to delete sub category.");
    } finally {
      setSubDeleting(false);
    }
  };

  // ── Sub-to-sub category modal helpers ────────────────────────────────────
  const openSubSubAdd = (subCategoryNode) => {
    const raw = subCategoryNode.raw;
    setSubSubEditTarget(null);
    setSubSubForm({
      categoryId: subCategoryCatId(raw.categoryId),
      subCategoryId: raw._id || raw.id,
      categoryvalue: "",
      status: "active",
    });
    setSubSubError("");
    setShowSubSubForm(true);
  };

  const openSubSubEdit = (item) => {
    setSubSubEditTarget(item);
    setSubSubForm({
      categoryId: subToSubRefId(item.categoryId),
      subCategoryId: subToSubRefId(item.subCategoryId),
      categoryvalue: item.categoryvalue || item.name || "",
      status: item.status || "active",
    });
    setSubSubError("");
    setShowSubSubForm(true);
  };

  const openSubSubDelete = (item) => {
    setSubSubDeleteTarget(item);
    setSubSubError("");
  };

  const closeSubSubForm = () => {
    setShowSubSubForm(false);
    setSubSubEditTarget(null);
    setSubSubError("");
  };

  const closeSubSubDelete = () => {
    setSubSubDeleteTarget(null);
    setSubSubError("");
  };

  // ── Sub-to-sub category save ─────────────────────────────────────────────
  const saveSubSubCategory = async (event) => {
    event.preventDefault();
    if (!subSubForm.categoryvalue.trim()) return;
    if (!subSubForm.categoryId || !subSubForm.subCategoryId) {
      setSubSubError("Please select category and sub category.");
      return;
    }

    try {
      setSubSubSaving(true);
      setSubSubError("");

      if (subSubEditTarget) {
        const data = await updateSubToSub(subSubEditTarget._id || subSubEditTarget.id, subSubForm);
        const updated = readSubToSubCategory(data);
        if (data?.success !== false && updated) {
          const normalized = normalizeSubToSub(updated);
          setSubToSubCategories((prev) => prev.map((s) => (subToSubKey(s) === subToSubKey(subSubEditTarget) ? normalized : s)));
          invalidateTree();
        } else {
          setSubSubError(data?.message || "Unable to update sub-to-sub category.");
        }
      } else {
        const data = await createSubToSub(subSubForm);
        const created = readSubToSubCategory(data);
        if (data?.success !== false && created) {
          setSubToSubCategories((prev) => [normalizeSubToSub(created), ...prev]);
          invalidateTree();
        } else {
          setSubSubError(data?.message || "Unable to create sub-to-sub category.");
        }
      }

      closeSubSubForm();
    } catch (err) {
      if (!err.response) setSubSubError(NETWORK_ERROR_MESSAGE);
      else if (isAuthError(err)) setSubSubError(AUTH_ERROR_MESSAGE);
      else setSubSubError(err.response?.data?.message || `Unable to save sub-to-sub category (status ${err.response.status}).`);
    } finally {
      setSubSubSaving(false);
    }
  };

  // ── Sub-to-sub category delete ───────────────────────────────────────────
  const deleteSubSubCategory = async () => {
    if (!subSubDeleteTarget) return;
    try {
      setSubSubDeleting(true);
      setSubSubError("");
      const data = await deleteSubToSubRequest(subSubDeleteTarget._id || subSubDeleteTarget.id);

      if (data?.success === false) {
        setSubSubError(data?.message || "Unable to delete sub-to-sub category.");
        return;
      }

      setSubToSubCategories((prev) => prev.filter((s) => subToSubKey(s) !== subToSubKey(subSubDeleteTarget)));
      invalidateTree();
      closeSubSubDelete();
    } catch (err) {
      setSubSubError(isAuthError(err) ? AUTH_ERROR_MESSAGE : err.response?.data?.message || "Unable to delete sub-to-sub category.");
    } finally {
      setSubSubDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isCategoriesTab = activeTab === "categories";
  const topLevelCount = categories.filter((c) => !c.parentId).length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Catalog governance
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Categories
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Create marketplace categories and review live catalog groups.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={Layers} value={categories.length} label="categories" />
              <GlanceStat icon={Tags} value={subCategories.length} label="sub categories" />
              <GlanceStat icon={PackageSearch} value={products.length} label="listings mapped" />
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <PillSwitch
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { key: "categories", label: "Categories", icon: Layers },
                  { key: "subcategories", label: "Sub Categories", icon: Tags },
                ]}
              />
              <button onClick={isCategoriesTab ? openAdd : openSubAdd} className={goldButton}>
                <Plus size={16} />
                {isCategoriesTab ? "Add category" : "Add sub category"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Flip metric cards */}
      <section aria-label="Category metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} /> Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {isCategoriesTab ? (
            <>
              <StatFlipCard
                label="Categories" value={categories.length} helper="catalog groups" icon={Layers} palette={palettes[2]}
                backTitle="Structure"
                rows={[
                  { label: "Top-level", value: topLevelCount },
                  { label: "Nested", value: categories.length - topLevelCount },
                ]}
              />
              <StatFlipCard
                label="Listings mapped" value={products.length} helper="products assigned" icon={PackageSearch} palette={palettes[1]}
                backTitle="Top by listings" rows={topByListings}
              />
              <StatFlipCard
                label="Active" value={activeCategories} helper="available categories" icon={CheckCircle2} palette={palettes[0]}
                backTitle="Availability"
                rows={[
                  { label: "Active", value: activeCategories },
                  { label: "Inactive", value: categories.length - activeCategories },
                ]}
              />
            </>
          ) : (
            <>
              <StatFlipCard
                label="Sub Categories" value={subCategories.length} helper="nested groups" icon={Tags} palette={palettes[2]}
                backTitle="Most sub categories" rows={subsPerParent}
              />
              <StatFlipCard
                label="Parent categories" value={categories.length} helper="available to nest under" icon={Layers} palette={palettes[1]}
                backTitle="Structure"
                rows={[
                  { label: "Top-level", value: topLevelCount },
                  { label: "Nested", value: categories.length - topLevelCount },
                ]}
              />
              <StatFlipCard
                label="Active" value={activeSubCategories} helper="available sub categories" icon={CheckCircle2} palette={palettes[0]}
                backTitle="Availability"
                rows={[
                  { label: "Active", value: activeSubCategories },
                  { label: "Inactive", value: subCategories.length - activeSubCategories },
                ]}
              />
            </>
          )}
        </div>
      </section>

      {/* Categories panel */}
      {isCategoriesTab && (
        <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
          <GoldLine className="inset-x-10" />
          <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
              <Layers size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
              Category map
              {(loading || (viewMode === "tree" && treeLoading)) && (
                <span className="text-xs font-normal text-slate-500" style={{ fontFamily: "inherit" }}>Loading…</span>
              )}
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <PillSwitch
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { key: "list", label: "List", icon: List },
                  { key: "tree", label: "Tree", icon: GitBranch },
                ]}
              />
              {viewMode === "list" && (
                <SearchBox
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  onClear={() => setSearch("")}
                  placeholder="Filter by name or status"
                />
              )}
            </div>
          </div>

          {error && !showForm && !deleteTarget && !pathModal && (
            <div className="border-b border-stone-200 px-6 py-3">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          {viewMode === "list" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-xs font-medium text-slate-500">
                      <th className="px-6 py-3">Category</th>
                      <th className="px-4 py-3">Parent</th>
                      <th className="px-4 py-3">Image</th>
                      <th className="px-4 py-3">Listings</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {pagedCategories.map((category, i) => (
                      <tr key={categoryKey(category)} className="transition-colors hover:bg-stone-50">
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center gap-3 font-semibold text-slate-900">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palettes[i % palettes.length].chip} text-white`}>
                              <Box size={16} strokeWidth={1.6} />
                            </span>
                            {category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {parentNameFor(category.parentId) || <span className="text-slate-400">Top-level</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <Image size={15} className="text-[rgb(var(--brand-text))]" />
                            {category.image || "No image"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-lg font-semibold text-[rgb(var(--brand-dark))]" style={serif}>{listingsFor(category.name)}</td>
                        <td className="px-4 py-3.5"><StatusPill status={category.status} /></td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openPath(category)} className={ghostButton}><Route size={13} /> Path</button>
                            <button onClick={() => openEdit(category)} className={ghostButton}><Pencil size={13} /> Edit</button>
                            <button onClick={() => openDelete(category)} className={dangerButton}><Trash2 size={13} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && filteredCategories.length === 0 && (
                      <tr>
                        <td className="px-5 py-14 text-center text-slate-500" colSpan={6}>
                          {search ? `No categories match "${search}".` : "No categories found. Select Add category to create the first one."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Pager total={filteredCategories.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={updatePageSize} />
            </>
          )}

          {/* Tree view — GET /api/categories/tree, lazy children via /children/:id,
              subcategories merged from /api/subcategories, sub-to-sub from /api/subtosubcategories */}
          {viewMode === "tree" && (
            <div>
              {treeData.length === 0 && !treeLoading && (
                <p className="px-5 py-14 text-center text-slate-500">No categories found.</p>
              )}
              {(subLoading || subSubLoading) && treeData.length > 0 && (
                <p className="px-6 py-2 text-xs text-slate-400">Loading nested categories…</p>
              )}
              {treeData.map((node) => (
                <TreeNode
                  key={categoryKey(node)}
                  node={node}
                  depth={0}
                  expandedIds={expandedIds}
                  childrenCache={childrenCache}
                  loadingIds={loadingChildIds}
                  onToggle={toggleTreeNode}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onViewPath={openPath}
                  onEditSub={openSubEdit}
                  onDeleteSub={openSubDelete}
                  onAddSubSub={openSubSubAdd}
                  onEditSubSub={openSubSubEdit}
                  onDeleteSubSub={openSubSubDelete}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sub categories panel */}
      {!isCategoriesTab && (
        <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
          <GoldLine className="inset-x-10" />
          <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
              <Tags size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
              Sub category map
              {subLoading && <span className="text-xs font-normal text-slate-500" style={{ fontFamily: "inherit" }}>Loading…</span>}
            </h2>
            <SearchBox
              value={subSearch}
              onChange={(e) => { setSubSearch(e.target.value); setSubPage(1); }}
              onClear={() => setSubSearch("")}
              placeholder="Filter by name, category or status"
            />
          </div>

          {subError && !showSubForm && !subDeleteTarget && (
            <div className="border-b border-stone-200 px-6 py-3">
              <ErrorNote>{subError}</ErrorNote>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Sub Category</th>
                  <th className="px-4 py-3">Parent Category</th>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pagedSubCategories.map((sub, i) => (
                  <tr key={subCategoryKey(sub)} className="transition-colors hover:bg-stone-50">
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-3 font-semibold text-slate-900">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palettes[i % palettes.length].chip} text-white`}>
                          <Tags size={16} strokeWidth={1.6} />
                        </span>
                        {sub.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{categoryNameFor(sub.categoryId)}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <Image size={15} className="text-[rgb(var(--brand-text))]" />
                        {sub.image || "No image"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><StatusPill status={sub.status} /></td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openSubEdit(sub)} className={ghostButton}><Pencil size={13} /> Edit</button>
                        <button onClick={() => openSubDelete(sub)} className={dangerButton}><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!subLoading && filteredSubCategories.length === 0 && (
                  <tr>
                    <td className="px-5 py-14 text-center text-slate-500" colSpan={5}>
                      {subSearch ? `No sub categories match "${subSearch}".` : "No sub categories found. Select Add sub category to create one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pager
            total={filteredSubCategories.length}
            page={subPage}
            pageSize={subPageSize}
            onPageChange={setSubPage}
            onPageSizeChange={(size) => { setSubPageSize(size); setSubPage(1); }}
          />
        </section>
      )}

      {/* Add / Edit category modal */}
      {showForm && (
        <ModalShell
          title={editTarget ? "Edit category" : "Add category"}
          subtitle={editTarget ? "Update category details in the live catalog." : "Create a category in the live catalog."}
          onClose={closeForm}
        >
          <form onSubmit={saveCategory} className="grid gap-4 p-6">
            <ErrorNote>{error}</ErrorNote>
            <Field label="Category name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Electronics" required />
            </Field>
            <Field label="Parent category">
              <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={inputClass}>
                <option value="">None (top-level category)</option>
                {parentOptions.map((c) => (
                  <option key={categoryKey(c)} value={categoryKey(c)}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Image">
              <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className={inputClass} placeholder="electronics.jpg" />
            </Field>
            <Field label="Status">
              <StatusSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            </Field>
            <FormActions onCancel={closeForm} busy={saving} busyLabel="Saving…" label={editTarget ? "Update category" : "Save category"} />
          </form>
        </ModalShell>
      )}

      {/* Delete category modal */}
      {deleteTarget && (
        <DeleteModal
          title="Delete category"
          name={deleteTarget.name}
          note="All associated data will be permanently removed."
          error={error}
          busy={deleting}
          onCancel={closeDelete}
          onConfirm={deleteCategory}
        />
      )}

      {/* Add / Edit sub category modal — POST /add, PUT /update/:id */}
      {showSubForm && (
        <ModalShell
          title={subEditTarget ? "Edit sub category" : "Add sub category"}
          subtitle={subEditTarget ? "Update sub category details in the live catalog." : "Create a sub category nested inside a parent category."}
          onClose={closeSubForm}
        >
          <form onSubmit={saveSubCategory} className="grid gap-4 p-6">
            <ErrorNote>{subError}</ErrorNote>
            <Field label="Parent category">
              <select value={subForm.categoryId} onChange={(e) => setSubForm({ ...subForm, categoryId: e.target.value })} className={inputClass} required>
                <option value="">— Select a category —</option>
                {categories.map((c) => (
                  <option key={categoryKey(c)} value={categoryKey(c)}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sub category name">
              <input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} className={inputClass} placeholder="Mobiles" required />
            </Field>
            <Field label="Image">
              <input value={subForm.image} onChange={(e) => setSubForm({ ...subForm, image: e.target.value })} className={inputClass} placeholder="mobiles.jpg (leave blank for default)" />
            </Field>
            <Field label="Status">
              <StatusSelect value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value })} />
            </Field>
            <FormActions onCancel={closeSubForm} busy={subSaving} busyLabel="Saving…" label={subEditTarget ? "Update sub category" : "Save sub category"} />
          </form>
        </ModalShell>
      )}

      {/* Delete sub category modal — DELETE /delete/:id */}
      {subDeleteTarget && (
        <DeleteModal
          title="Delete sub category"
          name={subDeleteTarget.name}
          note="All associated data will be permanently removed."
          error={subError}
          busy={subDeleting}
          onCancel={closeSubDelete}
          onConfirm={deleteSubCategory}
        />
      )}

      {/* Add / Edit sub-to-sub category modal */}
      {showSubSubForm && (
        <ModalShell
          title={subSubEditTarget ? "Edit sub-to-sub category" : "Add sub-to-sub category"}
          subtitle="Third-level entry nested inside a sub category."
          onClose={closeSubSubForm}
        >
          <form onSubmit={saveSubSubCategory} className="grid gap-4 p-6">
            <ErrorNote>{subSubError}</ErrorNote>
            <Field label="Parent category">
              <select
                value={subSubForm.categoryId}
                onChange={(e) => setSubSubForm({ ...subSubForm, categoryId: e.target.value, subCategoryId: "" })}
                className={inputClass}
                required
              >
                <option value="">— Select a category —</option>
                {categories.map((c) => (
                  <option key={categoryKey(c)} value={categoryKey(c)}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Parent sub category">
              <select
                value={subSubForm.subCategoryId}
                onChange={(e) => setSubSubForm({ ...subSubForm, subCategoryId: e.target.value })}
                className={inputClass}
                disabled={!subSubForm.categoryId}
                required
              >
                <option value="">{subSubForm.categoryId ? "— Select a sub category —" : "Select category first"}</option>
                {subCategories
                  .filter((s) => subCategoryCatId(s.categoryId) === subSubForm.categoryId)
                  .map((s) => (
                    <option key={subCategoryKey(s)} value={subCategoryKey(s)}>{s.name}</option>
                  ))}
              </select>
            </Field>
            <Field label="Name">
              <input
                value={subSubForm.categoryvalue}
                onChange={(e) => setSubSubForm({ ...subSubForm, categoryvalue: e.target.value })}
                className={inputClass}
                placeholder="e.g. Running Shoes"
                required
              />
            </Field>
            <Field label="Status">
              <StatusSelect value={subSubForm.status} onChange={(e) => setSubSubForm({ ...subSubForm, status: e.target.value })} />
            </Field>
            <FormActions onCancel={closeSubSubForm} busy={subSubSaving} busyLabel="Saving…" label={subSubEditTarget ? "Update" : "Save"} />
          </form>
        </ModalShell>
      )}

      {/* Delete sub-to-sub category modal */}
      {subSubDeleteTarget && (
        <DeleteModal
          title="Delete sub-to-sub category"
          name={subSubDeleteTarget.categoryvalue || subSubDeleteTarget.name}
          error={subSubError}
          busy={subSubDeleting}
          onCancel={closeSubSubDelete}
          onConfirm={deleteSubSubCategory}
        />
      )}

      {/* Path (breadcrumb) modal — GET /api/categories/parents/:id */}
      {pathModal && (
        <ModalShell title="Category path" subtitle={`Lineage for "${pathModal.category?.name}".`} onClose={closePath} maxWidth="max-w-md">
          <div className="p-6">
            {pathModal.loading && <p className="text-sm text-slate-500">Loading path…</p>}
            <ErrorNote>{pathModal.error}</ErrorNote>
            {!pathModal.loading && !pathModal.error && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {pathModal.path.length === 0 ? (
                  <span className="text-slate-500">This is a top-level category with no parents.</span>
                ) : (
                  pathModal.path.map((ancestor, idx) => (
                    <span key={categoryKey(ancestor)} className="flex items-center gap-2">
                      <span className="rounded-[var(--radius-control)] bg-stone-100 px-2.5 py-1 font-medium text-slate-800">{ancestor.name}</span>
                      {idx < pathModal.path.length - 1 && <ChevronRight size={14} className="text-slate-400" />}
                    </span>
                  ))
                )}
                <ChevronRight size={14} className="text-slate-400" />
                <span className="rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-2.5 py-1 font-semibold text-white">
                  {pathModal.category?.name}
                </span>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}