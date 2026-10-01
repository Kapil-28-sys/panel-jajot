import { useEffect, useMemo, useState } from "react";
import {
  Box, CheckCircle2, ChevronLeft, ChevronRight, Gem, Image, Layers, Pencil, Plus,
  RotateCw, Search, ShieldAlert, Tags, Trash2, X,
} from "lucide-react";
import * as categoryApi from "../../services/categoryApi";
import { isAuthError, getErrorMessage } from "../../services/apiClient";

/**
 * SubCategories.jsx
 * Restyled to match the Categories page (gold hairlines, serif display type,
 * flip metric cards, pill-style pager, gold modals).
 * All API calls, normalizers and state logic are unchanged.
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
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-2 focus:ring-[rgb(var(--brand-line)/0.3)] disabled:bg-stone-50";

/* ---------- data helpers (logic unchanged) ---------- */

const AUTH_ERROR_MESSAGE =
  "Your session has expired or is invalid. Please log in again to manage sub categories.";

const readList = (payload, keys = ["subCategories", "subcategories", "data"]) => {
  if (Array.isArray(payload)) return payload;
  for (const k of keys) if (Array.isArray(payload?.[k])) return payload[k];
  return [];
};

// Same category-response normalization used on the Categories page.
const readCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeCategory = (category) => {
  if (!category) return category;
  return {
    ...category,
    name: category.name || category.categoryName || category.title || "",
  };
};

const EMPTY_FORM = { categoryId: "", name: "", image: "", status: "active" };

/* categoryId can be a plain string OR a populated object like { _id, name } */
const getCatId = (val) => (val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "");
const getCatName = (val, categories) => {
  if (val && typeof val === "object") return val.name ?? "—";
  return categories.find((c) => (c._id ?? c.id) === val)?.name ?? val ?? "—";
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

function StatusPill({ status }) {
  const active = status?.toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium capitalize ring-1 ${
        active ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"
      }`}
    >
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

/* ---------- page ---------- */

export default function SubCategories() {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return subCategories;
    const q = search.toLowerCase();
    return subCategories.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q) ||
        getCatName(s.categoryId, categories).toLowerCase().includes(q)
    );
  }, [subCategories, search, categories]);

  const activeCount = subCategories.filter((s) => s.status?.toLowerCase() === "active").length;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Parents with the most sub categories (back of the first flip card)
  const subsPerParent = useMemo(() => {
    const counts = {};
    subCategories.forEach((s) => {
      const name = getCatName(s.categoryId, categories);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, value]) => ({ label, value }));
  }, [subCategories, categories]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [subData, catData] = await Promise.all([
        categoryApi.getSubCategories(),
        categoryApi.getCategories(),
      ]);
      setSubCategories(readList(subData));
      setCategories(readCategories(catData).map(normalizeCategory));
    } catch (err) {
      setError(isAuthError(err) ? AUTH_ERROR_MESSAGE : getErrorMessage(err, "Unable to load data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowForm(true);
  };

  const openEdit = (sub) => {
    setEditTarget(sub);
    setForm({
      categoryId: getCatId(sub.categoryId),
      name: sub.name ?? "",
      image: sub.image ?? "",
      status: sub.status ?? "active",
    });
    setError("");
    setShowForm(true);
  };

  const openDelete = (sub) => { setDeleteTarget(sub); setError(""); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); setError(""); };
  const closeDelete = () => { setDeleteTarget(null); setError(""); };

  const handleField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const saveSubCategory = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) { setError("Sub category name is required."); return; }
    if (!form.categoryId.trim()) { setError("Please select a parent category."); return; }
    try {
      setSaving(true);
      setError("");
      const payload = {
        categoryId: form.categoryId.trim(),
        name: form.name.trim(),
        image: form.image.trim() || "default.jpg",
        status: form.status,
      };
      if (editTarget) {
        await categoryApi.updateSubCategory(editTarget._id, payload);
      } else {
        await categoryApi.createSubCategory(payload);
        setPage(1);
      }
      closeForm();
      fetchAll();
    } catch (err) {
      setError(isAuthError(err) ? AUTH_ERROR_MESSAGE : getErrorMessage(err, "Unable to save."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError("");
      await categoryApi.deleteSubCategory(deleteTarget._id);
      closeDelete();
      setPage(1);
      fetchAll();
    } catch (err) {
      setError(isAuthError(err) ? AUTH_ERROR_MESSAGE : getErrorMessage(err, "Unable to delete."));
    } finally {
      setDeleting(false);
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
              Catalog governance
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Sub Categories
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Manage sub categories nested inside parent catalog groups.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={Tags} value={subCategories.length} label="sub categories" />
              <GlanceStat icon={Layers} value={categories.length} label="parent categories" />
              <GlanceStat icon={CheckCircle2} value={activeCount} label="active" />
            </div>
            <div className="flex lg:justify-end">
              <button onClick={openAdd} className={goldButton}>
                <Plus size={16} />
                Add sub category
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Flip metric cards */}
      <section aria-label="Sub category metrics">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw size={12} /> Select a card to flip it for a breakdown.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          <StatFlipCard
            label="Sub Categories" value={subCategories.length} helper="nested groups" icon={Tags} palette={palettes[2]}
            backTitle="Most sub categories" rows={subsPerParent}
          />
          <StatFlipCard
            label="Parent categories" value={categories.length} helper="available to nest under" icon={Layers} palette={palettes[1]}
            backTitle="Parents"
            rows={categories.slice(0, 3).map((c) => ({
              label: c.name,
              value: subCategories.filter((s) => getCatId(s.categoryId) === (c._id ?? c.id)).length,
            }))}
          />
          <StatFlipCard
            label="Active" value={activeCount} helper="available sub categories" icon={CheckCircle2} palette={palettes[0]}
            backTitle="Availability"
            rows={[
              { label: "Active", value: activeCount },
              { label: "Inactive", value: subCategories.length - activeCount },
            ]}
          />
        </div>
      </section>

      {/* Table panel */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />
        <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
            <Tags size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
            Sub category map
            {loading && <span className="text-xs font-normal text-slate-500" style={{ fontFamily: "inherit" }}>Loading…</span>}
          </h2>
          <SearchBox
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onClear={() => setSearch("")}
            placeholder="Filter by name, category or status"
          />
        </div>

        {error && !showForm && !deleteTarget && (
          <div className="border-b border-stone-200 px-6 py-3">
            <ErrorNote>{error}</ErrorNote>
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
              {paged.map((sub, i) => (
                <tr key={sub._id ?? sub.id ?? sub.name} className="transition-colors hover:bg-stone-50">
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-3 font-semibold text-slate-900">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palettes[i % palettes.length].chip} text-white`}>
                        <Tags size={16} strokeWidth={1.6} />
                      </span>
                      {sub.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <Box size={14} className="text-[rgb(var(--brand-text))]" />
                      {getCatName(sub.categoryId, categories)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <Image size={15} className="text-[rgb(var(--brand-text))]" />
                      {sub.image || "No image"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5"><StatusPill status={sub.status} /></td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(sub)} className={ghostButton}><Pencil size={13} /> Edit</button>
                      <button onClick={() => openDelete(sub)} className={dangerButton}><Trash2 size={13} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-slate-500">
                    {search ? `No sub categories match "${search}".` : "No sub categories found. Select Add sub category to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pager
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </section>

      {/* Add / Edit modal */}
      {showForm && (
        <ModalShell
          title={editTarget ? "Edit sub category" : "Add sub category"}
          subtitle={editTarget ? "Update sub category details in the live catalog." : "Create a sub category nested inside a parent category."}
          onClose={closeForm}
        >
          <form onSubmit={saveSubCategory} className="grid gap-4 p-6">
            <ErrorNote>{error}</ErrorNote>

            <Field label="Parent category *">
              <select
                value={form.categoryId}
                onChange={(e) => handleField("categoryId", e.target.value)}
                className={inputClass}
              >
                <option value="">— Select a category —</option>
                {categories.map((c) => (
                  <option key={c._id ?? c.id} value={c._id ?? c.id}>{c.name}</option>
                ))}
              </select>
              {categories.length === 0 && (
                <input
                  value={form.categoryId}
                  onChange={(e) => handleField("categoryId", e.target.value)}
                  placeholder="Paste category ID manually"
                  className={`${inputClass} mt-2`}
                />
              )}
            </Field>

            <Field label="Sub category name *">
              <input
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="e.g. Mobiles, Laptops"
                className={inputClass}
              />
            </Field>

            <Field label="Image filename">
              <input
                value={form.image}
                onChange={(e) => handleField("image", e.target.value)}
                placeholder="mobiles.jpg (leave blank for default)"
                className={inputClass}
              />
            </Field>

            <Field label="Status">
              <select value={form.status} onChange={(e) => handleField("status", e.target.value)} className={inputClass}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>

            <div className="flex justify-end gap-3 border-t border-stone-200 pt-4">
              <button type="button" onClick={closeForm} className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className={goldButton}>
                <Plus size={16} />
                {saving ? "Saving…" : editTarget ? "Update sub category" : "Save sub category"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <ModalShell title="Delete sub category" subtitle="This action cannot be undone." onClose={closeDelete} maxWidth="max-w-sm">
          <div className="space-y-4 p-6">
            <ErrorNote>{error}</ErrorNote>
            <p className="text-sm text-slate-700">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{deleteTarget.name}"</span>? All associated data will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={closeDelete} className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-stone-50">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={15} />
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}