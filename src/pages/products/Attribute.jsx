import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X, Trash2, Pencil, AlertCircle, Tags } from "lucide-react";
import { getCurrentSession } from "../../config/localAuth"; // adjust path if different in your project

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

// Tried in order until one responds with a usable list.
// If your real category-list route is known, put it FIRST and delete the rest.
const CATEGORY_LIST_ENDPOINTS = [
  "/categories",
  "/category",
  "/category/all",
  "/admin/category",
];

// Tried in order until one responds with a usable list, scoped to the selected category.
// If your real subcategory-list route is known, put it FIRST and delete the rest.
function subcategoryListEndpoints(categoryId) {
  return [
    `/subcategories`, // real route: fetch all, filter client-side by categoryId
    `/subcategories/category/${categoryId}`,
    `/subcategories?categoryId=${categoryId}`,
    `/subcategories/by-category/${categoryId}`,
    `/subcategory/category/${categoryId}`,
  ];
}

// Tried in order until one responds with a usable list, scoped to the selected subcategory.
// If your real sub-to-subcategory-list route is known, put it FIRST and delete the rest.
function subtosubcategoryListEndpoints(subcategoryId) {
  return [
    `/subtosubcategories`, // real route: fetch all, filter client-side by subcategoryId
    `/subtosubcategories/subcategory/${subcategoryId}`,
    `/subtosubcategories?subcategoryId=${subcategoryId}`,
    `/subtosubcategories/by-subcategory/${subcategoryId}`,
    `/subtosubcategory/subcategory/${subcategoryId}`,
  ];
}

const ATTRIBUTE_TYPE_OPTIONS = [
  { value: "dropdown", label: "Dropdown" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / No" },
  { value: "color", label: "Color" },
  { value: "multiselect", label: "Multi-select" },
];

const OPTIONS_TYPES = ["dropdown", "multiselect", "color"]; // types that need an options[] list

/* Same design tokens as Dashboard / Inventory (CSS variables from your theme). */
const serif = { fontFamily: "var(--font-display)" };

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[rgb(var(--brand))] focus:ring-1 focus:ring-[rgb(var(--brand))] disabled:bg-stone-50 disabled:text-slate-400";

const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] disabled:opacity-60";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] disabled:opacity-60";

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { success: false, message: text || "Invalid server response" };
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function extractList(data, keys = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return [];
}

/* ---------------- building blocks ---------------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
    />
  );
}

function Panel({ children, className = "" }) {
  return (
    <div className={`relative rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200 ${className}`}>
      <GoldLine />
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function FetchWarning({ children }) {
  return (
    <div className="flex items-start gap-1.5 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function ErrorNote({ children }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
      {children}
    </div>
  );
}

function OptionChips({ options, onRemove }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.map((opt, idx) => (
        <span
          key={`${opt}-${idx}`}
          className="flex items-center gap-1 rounded-[var(--radius-control)] bg-[rgb(var(--tint-100))] px-2.5 py-1 text-xs font-medium text-slate-800 ring-1 ring-[rgb(var(--brand-line)/0.35)]"
        >
          {opt}
          <button
            type="button"
            onClick={() => onRemove(opt)}
            aria-label={`Remove ${opt}`}
            className="text-slate-400 transition-colors hover:text-rose-600"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

export default function Attribute() {
  const session = getCurrentSession?.() || null;

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryFetchFailed, setCategoryFetchFailed] = useState(false);
  const [manualCategoryId, setManualCategoryId] = useState("");

  const [subcategories, setSubcategories] = useState([]);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [subcategoryFetchFailed, setSubcategoryFetchFailed] = useState(false);
  const [manualSubcategoryId, setManualSubcategoryId] = useState("");

  const [subtosubcategories, setSubtosubcategories] = useState([]);
  const [subtosubcategoryId, setSubtosubcategoryId] = useState("");
  const [loadingSubtosubcategories, setLoadingSubtosubcategories] = useState(false);
  const [subtosubcategoryFetchFailed, setSubtosubcategoryFetchFailed] = useState(false);
  const [manualSubtosubcategoryId, setManualSubtosubcategoryId] = useState("");

  const [attributes, setAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [attributesError, setAttributesError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ---- value (options) modal state ----
  const [valueModal, setValueModal] = useState(null); // the attribute currently being edited, or null when closed
  const [valueOptions, setValueOptions] = useState([]);
  const [valueDraft, setValueDraft] = useState("");
  const [valueDefault, setValueDefault] = useState("");
  const [savingValues, setSavingValues] = useState(false);
  const [valueError, setValueError] = useState("");

  const emptyForm = {
    name: "",
    code: "",
    codeTouched: false,
    type: "dropdown",
    required: false,
    searchable: false,
    filterable: false,
    comparable: false,
    variantAttribute: false,
    visibleOnProductPage: true,
    unit: "",
    minLength: "",
    options: [],
    optionDraft: "",
    defaultValue: "",
    status: "active",
  };
  const [form, setForm] = useState(emptyForm);

  const showOptions = OPTIONS_TYPES.includes(form.type);
  const effectiveCategoryId = categoryId || manualCategoryId.trim();
  const effectiveSubcategoryId = subcategoryId || manualSubcategoryId.trim();
  const effectiveSubtosubcategoryId = subtosubcategoryId || manualSubtosubcategoryId.trim();

  /* ---------------- fetch categories (tries multiple known routes) ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setCategoryFetchFailed(false);

      for (const path of CATEGORY_LIST_ENDPOINTS) {
        try {
          const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
          if (!res.ok) continue;
          const data = await safeJson(res);
          const list = extractList(data, ["categories"]);
          if (list.length > 0) {
            if (!cancelled) setCategories(list);
            if (!cancelled) setLoadingCategories(false);
            return;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!cancelled) {
        setCategoryFetchFailed(true);
        setLoadingCategories(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- fetch subcategories for selected category ---------------- */
  useEffect(() => {
    // reset downstream selections whenever the category changes
    setSubcategories([]);
    setSubcategoryId("");
    setManualSubcategoryId("");
    setSubcategoryFetchFailed(false);
    setSubtosubcategories([]);
    setSubtosubcategoryId("");
    setManualSubtosubcategoryId("");
    setSubtosubcategoryFetchFailed(false);

    if (!effectiveCategoryId) return;

    let cancelled = false;

    async function loadSubcategories() {
      setLoadingSubcategories(true);
      setSubcategoryFetchFailed(false);

      for (const path of subcategoryListEndpoints(effectiveCategoryId)) {
        try {
          const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
          if (!res.ok) continue;
          const data = await safeJson(res);
          let list = extractList(data, ["subcategories"]);
          // if we hit the "fetch all" fallback route, filter client-side by categoryId
          if (path === "/subcategories") {
            list = list.filter(
              (s) => (s.categoryId?._id || s.categoryId || s.category) === effectiveCategoryId
            );
          }
          if (list.length > 0) {
            if (!cancelled) setSubcategories(list);
            if (!cancelled) setLoadingSubcategories(false);
            return;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!cancelled) {
        setSubcategoryFetchFailed(true);
        setLoadingSubcategories(false);
      }
    }

    loadSubcategories();
    return () => {
      cancelled = true;
    };
  }, [effectiveCategoryId]);

  /* ---------------- fetch sub-to-subcategories for selected subcategory ---------------- */
  useEffect(() => {
    // reset downstream selection whenever the subcategory changes
    setSubtosubcategories([]);
    setSubtosubcategoryId("");
    setManualSubtosubcategoryId("");
    setSubtosubcategoryFetchFailed(false);

    if (!effectiveSubcategoryId) return;

    let cancelled = false;

    async function loadSubtosubcategories() {
      setLoadingSubtosubcategories(true);
      setSubtosubcategoryFetchFailed(false);

      for (const path of subtosubcategoryListEndpoints(effectiveSubcategoryId)) {
        try {
          const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
          if (!res.ok) continue;
          const data = await safeJson(res);
          let list = extractList(data, ["subtosubcategories"]);
          // if we hit the "fetch all" fallback route, filter client-side by subcategoryId
          if (path === "/subtosubcategories") {
            list = list.filter(
              (s) =>
                (s.subcategoryId?._id || s.subcategoryId || s.subcategory) ===
                effectiveSubcategoryId
            );
          }
          if (list.length > 0) {
            if (!cancelled) setSubtosubcategories(list);
            if (!cancelled) setLoadingSubtosubcategories(false);
            return;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!cancelled) {
        setSubtosubcategoryFetchFailed(true);
        setLoadingSubtosubcategories(false);
      }
    }

    loadSubtosubcategories();
    return () => {
      cancelled = true;
    };
  }, [effectiveSubcategoryId]);

  /* ---------------- fetch attributes for selected category ---------------- */
  useEffect(() => {
    if (!effectiveCategoryId) {
      setAttributes([]);
      return;
    }
    let cancelled = false;

    async function loadAttributes() {
      setLoadingAttributes(true);
      setAttributesError("");
      try {
        const res = await fetch(
          `${API_BASE}/categoryattribute/category/${effectiveCategoryId}`,
          { headers: getAuthHeaders() }
        );
        const data = await safeJson(res);
        if (!res.ok) {
          throw new Error(data?.message || `Failed to load attributes (${res.status})`);
        }
        const list = extractList(data);
        if (!cancelled) setAttributes(list);
      } catch (err) {
        if (!cancelled) {
          setAttributes([]);
          setAttributesError(err.message || "Failed to load attributes");
        }
      } finally {
        if (!cancelled) setLoadingAttributes(false);
      }
    }

    loadAttributes();
    return () => {
      cancelled = true;
    };
  }, [effectiveCategoryId]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function handleNameChange(value) {
    setForm((f) => ({
      ...f,
      name: value,
      code: f.codeTouched ? f.code : slugify(value),
    }));
  }

  function handleTypeChange(value) {
    setForm((f) => ({
      ...f,
      type: value,
      options: OPTIONS_TYPES.includes(value) ? f.options : [],
      defaultValue: "",
    }));
  }

  function addOption() {
    const val = form.optionDraft.trim();
    if (!val) return;
    if (form.options.includes(val)) {
      setForm((f) => ({ ...f, optionDraft: "" }));
      return;
    }
    setForm((f) => ({ ...f, options: [...f.options, val], optionDraft: "" }));
  }

  function removeOption(opt) {
    setForm((f) => ({
      ...f,
      options: f.options.filter((o) => o !== opt),
      defaultValue: f.defaultValue === opt ? "" : f.defaultValue,
    }));
  }

  function handleEdit(attr) {
    setEditingId(attr._id);

    // populate the category / subcategory / sub-to-subcategory chain so the
    // dropdowns above reflect what this attribute is actually attached to
    const attrCategoryId = attr.categoryId?._id || attr.categoryId || "";
    const attrSubcategoryId = attr.subcategoryId?._id || attr.subcategoryId || "";
    const attrSubtosubcategoryId = attr.subtosubcategoryId?._id || attr.subtosubcategoryId || "";

    if (attrCategoryId && attrCategoryId !== effectiveCategoryId) {
      setCategoryId(attrCategoryId);
    }
    if (attrSubcategoryId) {
      setManualSubcategoryId(attrSubcategoryId);
      setSubcategoryId(attrSubcategoryId);
    }
    if (attrSubtosubcategoryId) {
      setManualSubtosubcategoryId(attrSubtosubcategoryId);
      setSubtosubcategoryId(attrSubtosubcategoryId);
    }

    setForm({
      name: attr.name || "",
      code: attr.code || slugify(attr.name || ""),
      codeTouched: true,
      type: attr.type || "dropdown",
      required: !!attr.required,
      searchable: !!attr.searchable,
      filterable: !!attr.filterable,
      comparable: !!attr.comparable,
      variantAttribute: !!attr.variantAttribute,
      visibleOnProductPage: attr.visibleOnProductPage !== false,
      unit: attr.unit || "",
      minLength: attr.validation?.minLength ?? "",
      options: attr.options || [],
      optionDraft: "",
      defaultValue: attr.defaultValue || "",
      status: attr.status || "active",
    });
    setError("");
  }

  async function handleDelete(id) {
    if (!confirm("Delete this attribute?")) return;
    try {
      const res = await fetch(`${API_BASE}/categoryattribute/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to delete attribute");
      }
      setAttributes((prev) => prev.filter((a) => a._id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      alert(err.message || "Failed to delete attribute");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!effectiveCategoryId) {
      setError("Please select (or enter) a category first.");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (showOptions && form.options.length === 0) {
      setError("Add at least one option for this attribute type.");
      return;
    }

    const payload = {
      categoryId: effectiveCategoryId,
      subcategoryId: effectiveSubcategoryId || undefined,
      subtosubcategoryId: effectiveSubtosubcategoryId || undefined,
      name: form.name.trim(),
      code: form.code.trim() || slugify(form.name),
      type: form.type,
      required: form.required,
      searchable: form.searchable,
      filterable: form.filterable,
      comparable: form.comparable,
      variantAttribute: form.variantAttribute,
      visibleOnProductPage: form.visibleOnProductPage,
      unit: form.unit.trim(),
      validation: form.minLength !== "" ? { minLength: Number(form.minLength) } : {},
      options: showOptions ? form.options : [],
      defaultValue: form.defaultValue,
      status: form.status,
    };

    setSubmitting(true);
    try {
      const url = editingId
        ? `${API_BASE}/categoryattribute/${editingId}`
        : `${API_BASE}/categoryattribute/add`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await safeJson(res);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed to save attribute (${res.status})`);
      }

      const saved = data.data || data;
      setAttributes((prev) =>
        editingId
          ? prev.map((a) => (a._id === editingId ? saved : a))
          : [...prev, saved]
      );
      resetForm();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- value (options) modal handlers ---------------- */

  function openValueModal(attr) {
    setValueModal(attr);
    setValueOptions(attr.options || []);
    setValueDefault(attr.defaultValue || "");
    setValueDraft("");
    setValueError("");
  }

  function closeValueModal() {
    if (savingValues) return; // don't allow closing mid-save
    setValueModal(null);
    setValueOptions([]);
    setValueDraft("");
    setValueDefault("");
    setValueError("");
  }

  function addValueOption() {
    const val = valueDraft.trim();
    if (!val) return;
    if (valueOptions.includes(val)) {
      setValueDraft("");
      return;
    }
    setValueOptions((prev) => [...prev, val]);
    setValueDraft("");
  }

  function removeValueOption(opt) {
    setValueOptions((prev) => prev.filter((o) => o !== opt));
    setValueDefault((prev) => (prev === opt ? "" : prev));
  }

  async function handleSaveValues() {
    if (!valueModal) return;
    setValueError("");

    if (valueOptions.length === 0) {
      setValueError("Add at least one value.");
      return;
    }

    const payload = {
      categoryId: valueModal.categoryId?._id || valueModal.categoryId,
      subcategoryId: valueModal.subcategoryId?._id || valueModal.subcategoryId || undefined,
      subtosubcategoryId:
        valueModal.subtosubcategoryId?._id || valueModal.subtosubcategoryId || undefined,
      name: valueModal.name,
      code: valueModal.code,
      type: valueModal.type,
      required: !!valueModal.required,
      searchable: !!valueModal.searchable,
      filterable: !!valueModal.filterable,
      comparable: !!valueModal.comparable,
      variantAttribute: !!valueModal.variantAttribute,
      visibleOnProductPage: valueModal.visibleOnProductPage !== false,
      unit: valueModal.unit || "",
      validation: valueModal.validation || {},
      options: valueOptions,
      defaultValue: valueDefault,
      status: valueModal.status || "active",
    };

    setSavingValues(true);
    try {
      const res = await fetch(`${API_BASE}/categoryattribute/${valueModal._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await safeJson(res);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed to save values (${res.status})`);
      }

      const saved = data.data || data;
      setAttributes((prev) =>
        prev.map((a) => (a._id === valueModal._id ? { ...a, ...saved } : a))
      );
      closeValueModal();
    } catch (err) {
      setValueError(err.message || "Failed to save values");
    } finally {
      setSavingValues(false);
    }
  }

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c._id === categoryId)?.name || "",
    [categories, categoryId]
  );

  const th = "px-4 py-3 text-left font-semibold text-slate-600";

  return (
    <div className="min-h-screen space-y-6 bg-[rgb(var(--page-bg))] p-4 text-slate-900 md:p-6">
      {/* Hero — same look as Dashboard / Inventory */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-6 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-8">
        <GoldLine className="inset-x-16" />
        <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
          <Tags size={14} strokeWidth={1.6} />
          Catalog setup
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl" style={serif}>
          Category attributes
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          Define custom attributes (Brand, Size, RAM, etc.) for a category.
        </p>
      </section>

      {/* Category / Subcategory / Sub-to-subcategory selectors */}
      <Panel className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Category */}
          <div className="space-y-2">
            <Field label="Category">
              {!categoryFetchFailed ? (
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    resetForm();
                  }}
                  className={inputCls}
                >
                  <option value="">
                    {loadingCategories ? "Loading categories..." : "Select a category"}
                  </option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1.5">
                  <FetchWarning>
                    Couldn't auto-load categories. Paste a category ID below, and update{" "}
                    <code>CATEGORY_LIST_ENDPOINTS</code> with your real route.
                  </FetchWarning>
                  <input
                    type="text"
                    value={manualCategoryId}
                    onChange={(e) => {
                      setManualCategoryId(e.target.value);
                      resetForm();
                    }}
                    placeholder="Paste category _id"
                    className={inputCls}
                  />
                </div>
              )}
            </Field>
          </div>

          {/* Subcategory */}
          <div className="space-y-2">
            <Field label="Subcategory">
              {!effectiveCategoryId ? (
                <select disabled className={inputCls}>
                  <option>Select a category first</option>
                </select>
              ) : !subcategoryFetchFailed ? (
                <select
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setManualSubcategoryId("");
                  }}
                  className={inputCls}
                >
                  <option value="">
                    {loadingSubcategories ? "Loading subcategories..." : "Select a subcategory (optional)"}
                  </option>
                  {subcategories.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1.5">
                  <FetchWarning>
                    Couldn't auto-load subcategories. Paste a subcategory ID below, and update{" "}
                    <code>subcategoryListEndpoints()</code> with your real route.
                  </FetchWarning>
                  <input
                    type="text"
                    value={manualSubcategoryId}
                    onChange={(e) => setManualSubcategoryId(e.target.value)}
                    placeholder="Paste subcategory _id (optional)"
                    className={inputCls}
                  />
                </div>
              )}
            </Field>
          </div>

          {/* Sub-to-subcategory */}
          <div className="space-y-2">
            <Field label="Sub-to-subcategory">
              {!effectiveSubcategoryId ? (
                <select disabled className={inputCls}>
                  <option>Select a subcategory first</option>
                </select>
              ) : !subtosubcategoryFetchFailed ? (
                <select
                  value={subtosubcategoryId}
                  onChange={(e) => {
                    setSubtosubcategoryId(e.target.value);
                    setManualSubtosubcategoryId("");
                  }}
                  className={inputCls}
                >
                  <option value="">
                    {loadingSubtosubcategories
                      ? "Loading..."
                      : "Select a sub-to-subcategory (optional)"}
                  </option>
                  {subtosubcategories.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1.5">
                  <FetchWarning>
                    Couldn't auto-load sub-to-subcategories. Paste an ID below, and update{" "}
                    <code>subtosubcategoryListEndpoints()</code> with your real route.
                  </FetchWarning>
                  <input
                    type="text"
                    value={manualSubtosubcategoryId}
                    onChange={(e) => setManualSubtosubcategoryId(e.target.value)}
                    placeholder="Paste sub-to-subcategory _id (optional)"
                    className={inputCls}
                  />
                </div>
              )}
            </Field>
          </div>
        </div>
      </Panel>

      {!effectiveCategoryId ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-slate-500">
          Select a category to view or add its attributes.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* Attributes table */}
          <Panel className="h-fit overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50">
                    <th className={th}>Name</th>
                    <th className={th}>Code</th>
                    <th className={th}>Type</th>
                    <th className={th}>Options</th>
                    <th className={th}>Flags</th>
                    <th className={th}>Status</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loadingAttributes && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Loading attributes{selectedCategoryName ? ` for ${selectedCategoryName}` : ""}...
                      </td>
                    </tr>
                  )}
                  {!loadingAttributes && attributesError && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-xs text-rose-700">
                        {attributesError}
                      </td>
                    </tr>
                  )}
                  {!loadingAttributes && !attributesError && attributes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        No attributes yet for this category.
                      </td>
                    </tr>
                  )}
                  {!loadingAttributes &&
                    !attributesError &&
                    attributes.map((attr) => {
                      const canHaveValues = OPTIONS_TYPES.includes(attr.type);
                      return (
                        <tr key={attr._id} className="align-top transition-colors hover:bg-stone-50">
                          <td className="px-4 py-3 font-semibold">
                            {canHaveValues ? (
                              <button
                                type="button"
                                onClick={() => openValueModal(attr)}
                                className="text-[rgb(var(--brand-text))] underline-offset-2 hover:underline"
                                title="Click to add / manage values"
                              >
                                {attr.name}
                              </button>
                            ) : (
                              <span className="text-slate-900">{attr.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{attr.code}</td>
                          <td className="px-4 py-3 text-slate-600">{attr.type}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {(attr.options || []).length > 0 ? (
                              attr.options.join(", ")
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {[
                              attr.required && "Required",
                              attr.searchable && "Searchable",
                              attr.filterable && "Filterable",
                              attr.comparable && "Comparable",
                              attr.variantAttribute && "Variant",
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                attr.status === "active"
                                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                  : "bg-stone-50 text-stone-600 ring-stone-200"
                              }`}
                            >
                              {attr.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-slate-400">
                              <button
                                onClick={() => handleEdit(attr)}
                                className="transition-colors hover:text-[rgb(var(--brand-text))]"
                                title="Edit"
                                aria-label="Edit"
                                type="button"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(attr._id)}
                                className="transition-colors hover:text-rose-600"
                                title="Delete"
                                aria-label="Delete"
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Add / edit form */}
          <Panel className="h-fit p-5">
            <h2 className="mb-4 text-xl font-semibold text-slate-900" style={serif}>
              {editingId ? "Edit attribute" : "Add attribute"}
              {!editingId && selectedCategoryName ? ` to ${selectedCategoryName}` : ""}
            </h2>

            {error && (
              <div className="mb-3">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Brand"
                />
              </Field>

              <Field label="Code">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: slugify(e.target.value), codeTouched: true }))
                  }
                  className={inputCls}
                  placeholder="e.g. brand"
                />
              </Field>

              <Field label="Type">
                <select
                  value={form.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className={inputCls}
                >
                  {ATTRIBUTE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              {showOptions && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Options</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.optionDraft}
                      onChange={(e) => setForm((f) => ({ ...f, optionDraft: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                      className={`${inputCls} flex-1`}
                      placeholder="e.g. Apple"
                    />
                    <button type="button" onClick={addOption} aria-label="Add option" className={`${ghostBtn} !px-3`}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {form.options.length > 0 && <OptionChips options={form.options} onRemove={removeOption} />}
                </div>
              )}

              <Field label="Default value">
                {showOptions ? (
                  <select
                    value={form.defaultValue}
                    onChange={(e) => setForm((f) => ({ ...f, defaultValue: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">None</option>
                    {form.options.map((opt, idx) => (
                      <option key={`${opt}-${idx}`} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.defaultValue}
                    onChange={(e) => setForm((f) => ({ ...f, defaultValue: e.target.value }))}
                    className={inputCls}
                  />
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit">
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className={inputCls}
                    placeholder="e.g. GB"
                  />
                </Field>
                <Field label="Min length">
                  <input
                    type="number"
                    min={0}
                    value={form.minLength}
                    onChange={(e) => setForm((f) => ({ ...f, minLength: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-control)] bg-stone-50 p-3 text-sm text-slate-800 ring-1 ring-stone-200">
                {[
                  ["required", "Required"],
                  ["searchable", "Searchable"],
                  ["filterable", "Filterable"],
                  ["comparable", "Comparable"],
                  ["variantAttribute", "Variant attribute"],
                  ["visibleOnProductPage", "Visible on product page"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-stone-300 accent-[rgb(var(--brand))]"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={submitting} className={primaryBtn}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Update attribute" : "Add attribute"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className={ghostBtn}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </Panel>
        </div>
      )}

      {/* ---------------- Manage values modal ---------------- */}
      {valueModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeValueModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-card)] bg-white shadow-2xl ring-1 ring-[rgb(var(--brand-line)/0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            <GoldLine className="inset-x-8" />
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900" style={serif}>
                  Manage values
                </h3>
                <p className="mt-0.5 truncate text-xs text-slate-600">
                  {valueModal.name} <span className="text-slate-500">({valueModal.code})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeValueModal}
                aria-label="Close"
                className="rounded-[var(--radius-control)] p-1 text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {valueError && <ErrorNote>{valueError}</ErrorNote>}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Add a value</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={valueDraft}
                    onChange={(e) => setValueDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addValueOption();
                      }
                    }}
                    placeholder="e.g. Xiaomi"
                    className={`${inputCls} flex-1`}
                  />
                  <button type="button" onClick={addValueOption} aria-label="Add value" className={`${ghostBtn} !px-3`}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Current values ({valueOptions.length})
                </label>
                {valueOptions.length === 0 ? (
                  <p className="mt-1 text-xs italic text-slate-400">No values yet — add one above.</p>
                ) : (
                  <OptionChips options={valueOptions} onRemove={removeValueOption} />
                )}
              </div>

              <Field label="Default value">
                <select
                  value={valueDefault}
                  onChange={(e) => setValueDefault(e.target.value)}
                  className={inputCls}
                >
                  <option value="">None</option>
                  {valueOptions.map((opt, idx) => (
                    <option key={`${opt}-${idx}`} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button type="button" onClick={closeValueModal} disabled={savingValues} className={ghostBtn}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveValues} disabled={savingValues} className={primaryBtn}>
                {savingValues && <Loader2 className="h-4 w-4 animate-spin" />}
                Save values
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}