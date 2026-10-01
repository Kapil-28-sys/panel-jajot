import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertCircle, Box, CheckCircle2, ChevronLeft, ChevronRight, Gem, Layers, Loader2, Pencil,
  Plus, RefreshCw, RotateCw, Search, ShieldAlert, Tag, Tags, Trash2, X,
} from "lucide-react";
import * as categoryApi from "../../services/categoryApi";
import { getErrorMessage } from "../../services/apiClient";

/**
 * SubToSubCategory.jsx
 * Restyled to match the Categories / Sub Categories pages (gold hairlines,
 * serif display type, flip metric cards, gold modals).
 * All API calls, normalizers and form logic are unchanged.
 */

/* ---------- design tokens (same as Categories / Dashboard) ---------- */

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
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-2 focus:ring-[rgb(var(--brand-line)/0.3)] disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-slate-400";

/* ---------- data helpers (logic unchanged) ---------- */

const readCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeCategory = (category) => {
  if (!category) return category;
  return { ...category, name: category.name || category.categoryName || category.title || "" };
};

const readSubCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subCategories)) return payload.subCategories;
  if (Array.isArray(payload?.subcategories)) return payload.subcategories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeSubCategory = (sub) => {
  if (!sub) return sub;
  return { ...sub, name: sub.name || sub.subCategoryName || sub.title || "" };
};

// categoryId and subCategoryId may be populated objects or plain ID strings
const getName = (field) => (typeof field === "object" && field !== null ? field.name : null);
const getId = (field) => (typeof field === "object" && field !== null ? field._id : field);

// The API stores the display label in `categoryvalue` (not `name`).
const getDisplayName = (item) => item?.categoryvalue || item?.name || "";

const isActive = (item) => {
  if (typeof item.status === "boolean") return item.status;
  return String(item.status).toLowerCase() === "active";
};

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

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ${
        active ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"
      }`}
    >
      {active ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
      {active ? "Active" : "Inactive"}
    </span>
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

function Pager({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = "flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] border border-stone-300 bg-white hover:border-[rgb(var(--brand-line))] disabled:opacity-40";

  // Compact page list with ellipses for long ranges
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

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
        {pages.map((n, i) =>
          n === "..." ? (
            <span key={`e-${i}`} className="px-1 text-slate-400">…</span>
          ) : (
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
          )
        )}
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page" className={btn}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function ModalShell({ open = true, title, subtitle, onClose, children, maxWidth = "max-w-xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
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
    <p className="flex items-center gap-2 rounded-[var(--radius-control)] border border-l-4 border-stone-200 border-l-rose-500 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      <AlertCircle size={14} className="shrink-0" />
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

function SelectField({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={inputClass}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
        ))}
      </select>
    </Field>
  );
}

/* ---------- Toast ---------- */

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const ok = toast.type === "success";
  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-[var(--radius-card)] px-5 py-3.5 text-sm font-medium text-white shadow-2xl ring-1 ring-[rgb(var(--brand-line)/0.5)] ${
        ok ? "bg-gradient-to-br from-[rgb(var(--a1-b1))] to-[rgb(var(--a1-b2))]" : "bg-gradient-to-br from-rose-600 to-rose-800"
      }`}
    >
      {ok ? <CheckCircle2 size={16} className={gold} /> : <AlertCircle size={16} />}
      {toast.message}
    </div>
  );
}

/* ---------- SubToSubForm ---------- */
/**
 * API contract (POST /subtosubcategories/add & PUT /subtosubcategories/:id):
 *   categoryId       – ObjectId of the selected category
 *   subCategoryId    – ObjectId of the selected sub-category
 *   categoryvalue    – display name / label for this sub-to-sub entry
 *   subcategoryvalue – (optional) sub-category label string
 *   status           – "active" | "inactive"
 */
function SubToSubForm({ initial, categories, onSubmit, onCancel, loading, submitLabel }) {
  const [form, setForm] = useState({
    categoryId: getId(initial?.categoryId) || "",
    subCategoryId: getId(initial?.subCategoryId) || "",
    categoryvalue: initial?.categoryvalue || initial?.name || "",
    subcategoryvalue: initial?.subcategoryvalue || "",
    status: initial?.status || "active",
  });

  const [subcategories, setSubcategories] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");

  // Fetch sub-categories whenever the parent category changes
  useEffect(() => {
    if (!form.categoryId) {
      setSubcategories([]);
      setSubError("");
      setForm((f) => ({ ...f, subCategoryId: "", subcategoryvalue: "" }));
      return;
    }
    setSubLoading(true);
    setSubError("");
    categoryApi
      .getSubCategories()
      .then((res) => {
        const all = readSubCategories(res).map(normalizeSubCategory);
        setSubcategories(all.filter((s) => getId(s.categoryId) === form.categoryId));
      })
      .catch((err) => {
        setSubcategories([]);
        setSubError(getErrorMessage(err, "Unable to load sub categories."));
      })
      .finally(() => setSubLoading(false));
  }, [form.categoryId]);

  // When a sub-category is chosen, also store its name in subcategoryvalue
  const handleSubCategoryChange = (id) => {
    const match = subcategories.find((s) => (s._id || s.id) === id);
    setForm((f) => ({ ...f, subCategoryId: id, subcategoryvalue: match?.name || "" }));
  };

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      categoryId: form.categoryId,
      subCategoryId: form.subCategoryId,
      categoryvalue: form.categoryvalue,
      subcategoryvalue: form.subcategoryvalue,
      status: form.status,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 p-6">
      <ErrorNote>{subError}</ErrorNote>

      <SelectField
        label="Category"
        value={form.categoryId}
        onChange={set("categoryId")}
        options={categories}
        placeholder="Select a category"
      />

      <SelectField
        label="Sub category"
        value={form.subCategoryId}
        onChange={handleSubCategoryChange}
        options={subcategories}
        placeholder={subLoading ? "Loading…" : form.categoryId ? "Select a sub category" : "Select category first"}
        disabled={!form.categoryId || subLoading}
      />

      <Field label="Name">
        <input
          name="categoryvalue"
          value={form.categoryvalue}
          onChange={handle}
          required
          placeholder="e.g. Running Shoes"
          className={inputClass}
        />
      </Field>

      <Field label="Status">
        <select name="status" value={form.status} onChange={handle} className={inputClass}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Field>

      <div className="flex justify-end gap-3 border-t border-stone-200 pt-4">
        <button type="button" onClick={onCancel} className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50">
          Cancel
        </button>
        <button type="submit" disabled={loading} className={goldButton}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={16} />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ---------- DeleteModal ---------- */

function DeleteModal({ open, item, onConfirm, onClose, loading }) {
  return (
    <ModalShell open={open} title="Delete sub-to-sub category" subtitle="This action cannot be undone." onClose={onClose} maxWidth="max-w-sm">
      <div className="space-y-4 p-6">
        <p className="text-sm text-slate-700">
          Are you sure you want to delete <span className="font-semibold text-slate-900">"{getDisplayName(item)}"</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
            Yes, delete
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------- page ---------- */

export default function SubToSubCategory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });
  const closeToast = useCallback(() => setToast(null), []);

  const fetchItems = useCallback(() => {
    setLoading(true);
    categoryApi
      .getSubToSubCategories()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data || res.subtosubcategories || [];
        setItems(list);
      })
      .catch((err) => showToast(getErrorMessage(err, "Failed to load sub-to-sub categories"), "error"))
      .finally(() => setLoading(false));
  }, []);

  const fetchCategories = useCallback(() => {
    categoryApi
      .getCategories()
      .then((res) => setCategories(readCategories(res).map(normalizeCategory)))
      .catch((err) => showToast(getErrorMessage(err, "Failed to load categories"), "error"));
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, [fetchCategories, fetchItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleAdd = async (form) => {
    setMutating(true);
    try {
      const res = await categoryApi.createSubToSubCategory(form);
      if (res.success === false || res.error) throw new Error(res.message || res.error);
      showToast("Sub-to-sub category added successfully");
      setAddOpen(false);
      fetchItems();
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to add"), "error");
    } finally {
      setMutating(false);
    }
  };

  const handleEdit = async (form) => {
    setMutating(true);
    try {
      const res = await categoryApi.updateSubToSubCategory(editItem._id, form);
      if (res.success === false || res.error) throw new Error(res.message || res.error);
      showToast("Sub-to-sub category updated");
      setEditItem(null);
      fetchItems();
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to update"), "error");
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async () => {
    setMutating(true);
    try {
      const res = await categoryApi.deleteSubToSubCategory(deleteItem._id);
      if (res.success === false || res.error) throw new Error(res.message || res.error);
      showToast("Deleted successfully");
      setDeleteItem(null);
      fetchItems();
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to delete"), "error");
    } finally {
      setMutating(false);
    }
  };

  // Search across `categoryvalue` (the real name field), category name, sub-category name
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const catName = getName(item.categoryId) || "";
        const subName = getName(item.subCategoryId) || "";
        const displayName = getDisplayName(item);
        const q = search.toLowerCase();
        return displayName.toLowerCase().includes(q) || catName.toLowerCase().includes(q) || subName.toLowerCase().includes(q);
      }),
    [items, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const uniqueCats = new Set(items.map((i) => getId(i.categoryId)).filter(Boolean)).size;
  const uniqueSubs = new Set(items.map((i) => getId(i.subCategoryId)).filter(Boolean)).size;
  const activeCount = items.filter(isActive).length;

  // Back-of-card breakdowns
  const topBy = (getter) => {
    const counts = {};
    items.forEach((i) => {
      const n = getter(i);
      if (n) counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, value]) => ({ label, value }));
  };
  const topCategories = useMemo(() => topBy((i) => getName(i.categoryId)), [items]);
  const topSubs = useMemo(() => topBy((i) => getName(i.subCategoryId) || i.subcategoryvalue), [items]);

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
              Sub-to-Sub Categories
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Manage the third level of the category hierarchy, nested inside sub categories.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={Tag} value={items.length} label="sub-to-sub" />
              <GlanceStat icon={Layers} value={uniqueCats} label="categories covered" />
              <GlanceStat icon={Tags} value={uniqueSubs} label="sub categories covered" />
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <button onClick={fetchItems} className={ghostButton.replace("text-xs", "text-sm").replace("px-2.5 py-1.5", "px-3.5 py-2")}>
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button onClick={() => setAddOpen(true)} className={goldButton}>
                <Plus size={16} />
                Add sub-to-sub category
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Flip metric cards */}
      <section aria-label="Sub-to-sub category metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} /> Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          <StatFlipCard
            label="Total" value={items.length} helper="third-level entries" icon={Tag} palette={palettes[2]}
            backTitle="Availability"
            rows={[
              { label: "Active", value: activeCount },
              { label: "Inactive", value: items.length - activeCount },
            ]}
          />
          <StatFlipCard
            label="Categories covered" value={uniqueCats} helper="with third-level entries" icon={Layers} palette={palettes[1]}
            backTitle="Top categories" rows={topCategories}
          />
          <StatFlipCard
            label="Sub categories covered" value={uniqueSubs} helper="with third-level entries" icon={Tags} palette={palettes[0]}
            backTitle="Top sub categories" rows={topSubs}
          />
        </div>
      </section>

      {/* Table panel */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />
        <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
            <Tag size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
            Sub-to-sub map
            {loading && <span className="text-xs font-normal text-slate-500" style={{ fontFamily: "inherit" }}>Loading…</span>}
          </h2>
          <div className="flex items-center gap-3">
            {search && (
              <span className="text-xs text-slate-500">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
            <SearchBox
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Filter by name, category or sub category"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Sub Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 size={24} className="mx-auto animate-spin text-[rgb(var(--brand))]" />
                    <p className="mt-3 text-sm text-slate-500">Loading…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-slate-500">
                    {search ? `No sub-to-sub categories match "${search}".` : "No sub-to-sub categories yet. Select Add sub-to-sub category to create the first one."}
                  </td>
                </tr>
              ) : (
                paginated.map((item, i) => (
                  <tr key={item._id} className="transition-colors hover:bg-stone-50">
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-3 font-semibold text-slate-900">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palettes[i % palettes.length].chip} text-white`}>
                          <Tag size={16} strokeWidth={1.6} />
                        </span>
                        {getDisplayName(item) || <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Box size={14} className="text-[rgb(var(--brand-text))]" />
                        {getName(item.categoryId) || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Tags size={14} className="text-[rgb(var(--brand-text))]" />
                        {getName(item.subCategoryId) || item.subcategoryvalue || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><StatusPill active={isActive(item)} /></td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditItem(item)} className={ghostButton}><Pencil size={13} /> Edit</button>
                        <button onClick={() => setDeleteItem(item)} className={dangerButton}><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <Pager
            total={filtered.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </section>

      {/* Modals */}
      <ModalShell
        open={addOpen}
        title="Add sub-to-sub category"
        subtitle="Third-level entry nested inside a sub category."
        onClose={() => setAddOpen(false)}
      >
        <SubToSubForm
          categories={categories}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
          loading={mutating}
          submitLabel="Add category"
        />
      </ModalShell>

      <ModalShell
        open={!!editItem}
        title="Edit sub-to-sub category"
        subtitle="Update third-level entry details."
        onClose={() => setEditItem(null)}
      >
        {editItem && (
          <SubToSubForm
            initial={editItem}
            categories={categories}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
            loading={mutating}
            submitLabel="Save changes"
          />
        )}
      </ModalShell>

      <DeleteModal
        open={!!deleteItem}
        item={deleteItem}
        onConfirm={handleDelete}
        onClose={() => setDeleteItem(null)}
        loading={mutating}
      />

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}