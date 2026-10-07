import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Megaphone } from "lucide-react";
import { getCurrentSession } from "../../config/localAuth"; // adjust path as per your project structure

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

/* Same design tokens as Dashboard / Inventory / Attributes / Banners (CSS variables from your theme). */
const serif = { fontFamily: "var(--font-display)" };

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[rgb(var(--brand))] focus:ring-1 focus:ring-[rgb(var(--brand))] disabled:bg-stone-50 disabled:text-slate-400";

const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]";

// Where the heading + button sit on the banner. Value format: "<vertical>-<horizontal>".
const POSITIONS = [
  ["top-left", "top-center", "top-right"],
  ["middle-left", "middle-center", "middle-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
];
const V_CLASS = { top: "justify-start", middle: "justify-center", bottom: "justify-end" };
const H_CLASS = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};
// Dark fade sits on the side where the text is, so it stays readable.
const FADE_CLASS = {
  left: "bg-gradient-to-r from-black/60 via-black/30 to-transparent",
  center: "bg-black/40",
  right: "bg-gradient-to-l from-black/60 via-black/30 to-transparent",
};

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 z-10 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
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
    <div className="flex-1">
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stone-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function AddBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const bannerBasePath = location.pathname.startsWith("/admin")
    ? "/admin/banners"
    : "/vendor/banners";
  const [auth, setAuth] = useState(null);
  const [token, setToken] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);

  const [form, setForm] = useState({
    title: "",
    button_text: "",
    content_position: "middle-left",
    image_url: "",
    vendorId: "",
    categoryId: "",
    discount_percentage: "",
    starts_at: "",
    ends_at: "",
    session_type: "home_page",
    specialization: "offer",
    is_active: true,
  });

  // localStorage / session logic must run only on client (Next.js SSR safety)
  useEffect(() => {
    const session = getCurrentSession();
    const storedToken = localStorage.getItem("adminToken");
    const superAdmin = session?.role === "Super Admin";

    setAuth(session);
    setToken(storedToken);
    setIsSuperAdmin(superAdmin);

    setForm((p) => ({
      ...p,
      vendorId: superAdmin ? "" : session?.vendorId || "",
    }));
  }, []);

  useEffect(() => {
    if (token === null) return; // wait until token is resolved on client

    const fetchMeta = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const catRes = await fetch(`${API_BASE}/categories`, { headers });
        const catData = await catRes.json();
        setCategories(catData?.data || catData?.categories || catData || []);

        if (isSuperAdmin) {
          const venRes = await fetch(`${API_BASE}/admin/vendors`, { headers });
          const venData = await venRes.json();
          setVendors(venData?.data || venData?.vendors || venData || []);
        }
      } catch (err) {
        console.error("meta fetch failed", err);
      } finally {
        setLoadingMeta(false);
      }
    };

    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSuperAdmin]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (name === "image_url") setImgError(false);
  };

  const toISO = (localDateTimeStr) => {
    if (!localDateTimeStr) return "";
    return new Date(localDateTimeStr).toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.image_url ||
      !form.categoryId ||
      !form.starts_at ||
      !form.ends_at ||
      !form.session_type ||
      !form.specialization
    ) {
      setError("Please fill all required fields.");
      return;
    }
    if (isSuperAdmin && !form.vendorId) {
      setError("Please select a vendor.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      button_text: form.button_text.trim(),
      content_position: form.content_position,
      image_url: form.image_url,
      vendorId: form.vendorId,
      categoryId: form.categoryId,
      discount_percentage: Number(form.discount_percentage) || 0,
      starts_at: toISO(form.starts_at),
      ends_at: toISO(form.ends_at),
      session_type: form.session_type,
      specialization: form.specialization,
      is_active: form.is_active,
    };

    // Debug log - remove after confirming payload is correct
    console.log("Banner payload being sent:", payload);

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/admin/banners`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create banner");

      navigate(bannerBasePath);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVendor = vendors.find((v) => v._id === form.vendorId);
  const [posV, posH] = form.content_position.split("-");
  const hasHeading = form.title.trim().length > 0;
  const hasButton = form.button_text.trim().length > 0;

  return (
    <div className="min-h-screen space-y-6 bg-[rgb(var(--page-bg))] p-4 md:p-6">
      {/* Hero — same look as the other pages */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-6 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-8">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Megaphone size={14} strokeWidth={1.6} />
              Storefront promotions
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl" style={serif}>
              Create banner
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Fill in the details on the left and check the live preview on the right.
            </p>
          </div>
          <button className={ghostBtn} onClick={() => navigate(bannerBasePath)}>
            <ArrowLeft className="h-4 w-4" /> Back to banners
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* FORM */}
        <Panel className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row">
              <Field label="Heading (optional)">
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Nike T-Shirts — 40% OFF"
                  className={inputCls}
                />
              </Field>
              <Field label="Button text (optional)">
                <input
                  type="text"
                  name="button_text"
                  value={form.button_text}
                  onChange={handleChange}
                  placeholder="Shop now"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-slate-500">
              Fill one, both, or leave both empty to show only the image.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Heading &amp; button position
              </label>
              <div className="inline-grid grid-cols-3 gap-1 rounded-[var(--radius-control)] bg-stone-100 p-1">
                {POSITIONS.flat().map((pos) => {
                  const active = form.content_position === pos;
                  return (
                    <button
                      key={pos}
                      type="button"
                      aria-pressed={active}
                      aria-label={pos.replace("-", " ")}
                      title={pos.replace("-", " ")}
                      onClick={() => setForm((p) => ({ ...p, content_position: pos }))}
                      className={`h-8 w-12 rounded-[var(--radius-control)] transition-colors ${
                        active
                          ? "bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]"
                          : "bg-white hover:bg-[rgb(var(--tint-100))]"
                      }`}
                    >
                      <span
                        className={`mx-auto block h-1.5 w-5 rounded-full ${
                          active ? "bg-white" : "bg-stone-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Image URL *">
              <input
                type="text"
                name="image_url"
                value={form.image_url}
                onChange={handleChange}
                placeholder="https://yourcdn.com/nike-banner.jpg"
                className={inputCls}
              />
            </Field>

            {isSuperAdmin && (
              <Field label="Vendor *">
                <select
                  name="vendorId"
                  value={form.vendorId}
                  onChange={handleChange}
                  className={inputCls}
                  disabled={loadingMeta}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.businessName || v.name || v.email}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Category *">
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                className={inputCls}
                disabled={loadingMeta}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Discount percentage">
              <input
                type="number"
                name="discount_percentage"
                value={form.discount_percentage}
                onChange={handleChange}
                placeholder="40"
                min="0"
                max="100"
                className={inputCls}
              />
            </Field>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Field label="Session type *">
                <select
                  name="session_type"
                  value={form.session_type}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="home_page">Home Page</option>
                  <option value="category_page">Category Page</option>
                  <option value="product_page">Product Page</option>
                  <option value="vendor_page">Vendor Page</option>
                </select>
              </Field>
              <Field label="Specialization *">
                <select
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="offer">Offer</option>
                  <option value="new_arrival">New Arrival</option>
                  <option value="trending">Trending</option>
                  <option value="clearance">Clearance</option>
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-2 rounded-[var(--radius-control)] bg-stone-50 p-3 text-sm text-slate-800 ring-1 ring-stone-200">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-stone-300 accent-[rgb(var(--brand))]"
              />
              Active (banner will be live if within date window)
            </label>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Field label="Starts at *">
                <input
                  type="datetime-local"
                  name="starts_at"
                  value={form.starts_at}
                  onChange={handleChange}
                  className={inputCls}
                />
              </Field>
              <Field label="Ends at *">
                <input
                  type="datetime-local"
                  name="ends_at"
                  value={form.ends_at}
                  onChange={handleChange}
                  className={inputCls}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Creating..." : "Create banner"}
            </button>
          </form>
        </Panel>

        {/* PREVIEW */}
        <div className="space-y-4 lg:sticky lg:top-5">
          <h3 className="text-xl font-semibold text-slate-900" style={serif}>
            Live preview
          </h3>

          <div className="relative h-80 w-full overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-stone-800 to-stone-900 shadow-md ring-1 ring-[rgb(var(--brand-line)/0.4)]">
            {form.image_url && !imgError ? (
              // Using plain <img> intentionally since banner URL is dynamic/user-entered.
              // If you want next/image optimization, add the domain to next.config.js images.remotePatterns
              <img
                src={form.image_url}
                alt="banner"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-400">
                {imgError ? "Image failed to load" : "Image preview will appear here"}
              </div>
            )}

            <div
              className={`absolute inset-0 flex flex-col gap-3 p-8 ${V_CLASS[posV]} ${H_CLASS[posH]} ${
                hasHeading || hasButton || form.discount_percentage ? FADE_CLASS[posH] : ""
              }`}
            >
              {form.discount_percentage ? (
                <span className="w-fit rounded-[var(--radius-control)] bg-rose-700 px-2.5 py-1 text-sm font-bold text-white">
                  {form.discount_percentage}% OFF
                </span>
              ) : null}
              {hasHeading && (
                <h2
                  className="max-w-[75%] text-3xl font-semibold leading-tight text-white"
                  style={{ ...serif, textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}
                >
                  {form.title}
                </h2>
              )}
              {hasButton && (
                <button
                  type="button"
                  className="w-fit rounded-full bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-5 py-2 text-sm font-semibold text-white"
                >
                  {form.button_text}
                </button>
              )}
            </div>
          </div>

          <Panel className="p-4">
            <MetaRow
              label="Category"
              value={categories.find((c) => c._id === form.categoryId)?.name || "—"}
            />
            {isSuperAdmin && (
              <MetaRow
                label="Vendor"
                value={selectedVendor?.businessName || selectedVendor?.name || "—"}
              />
            )}
            <MetaRow
              label="Live window"
              value={
                form.starts_at && form.ends_at
                  ? `${new Date(form.starts_at).toLocaleString()} → ${new Date(
                      form.ends_at
                    ).toLocaleString()}`
                  : "—"
              }
            />
            <MetaRow label="Session type" value={form.session_type || "—"} />
            <MetaRow label="Specialization" value={form.specialization || "—"} />
            <MetaRow label="Status" value={form.is_active ? "Active" : "Inactive"} />
          </Panel>
        </div>
      </div>
    </div>
  );
}