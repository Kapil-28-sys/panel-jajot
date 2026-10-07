import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, ImageOff, Megaphone, Radio, PauseCircle, Layers, AlertTriangle } from "lucide-react";
import { getCurrentSession } from "../../config/localAuth"; // adjust path as per your project structure

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

/* Same design tokens as Dashboard / Inventory / Attributes (CSS variables from your theme). */
const serif = { fontFamily: "var(--font-display)" };

const primaryBtn =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] disabled:opacity-60";

const ghostBtn =
  "inline-flex flex-1 items-center justify-center rounded-[var(--radius-control)] border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] disabled:opacity-60";

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 z-10 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
    />
  );
}

function GlanceStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3 px-5 first:pl-0 last:pr-0">
      <Icon size={18} strokeWidth={1.5} className="text-[rgb(var(--brand-text))]" />
      <div>
        <p className="text-2xl font-semibold leading-none tabular-nums text-slate-900" style={serif}>
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// Safely parses a fetch Response as JSON. If the server returned HTML
// (404 page, 500 error page, login redirect, etc.) this throws a clear,
// readable error instead of crashing with "Unexpected token '<'".
async function safeJson(res, context = "request") {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error(`[${context}] Non-JSON response (status ${res.status}):`, raw.slice(0, 300));
    throw new Error(
      `Server returned an unexpected response for ${context} (status ${res.status}). ` +
        `This usually means the API route doesn't exist, the URL is malformed, or the token is invalid/expired.`
    );
  }
}

export default function Banners() {
  const navigate = useNavigate();
  const location = useLocation();
  const bannerBasePath = location.pathname.startsWith("/admin")
    ? "/admin/banners"
    : "/vendor/banners";
  const [auth, setAuth] = useState(null);
  const [token, setToken] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [imgErrorIds, setImgErrorIds] = useState({});

  useEffect(() => {
    const session = getCurrentSession();
    const storedToken = localStorage.getItem("adminToken");
    const superAdmin = session?.role === "Super Admin";

    setAuth(session);
    setToken(storedToken);
    setIsSuperAdmin(superAdmin);
  }, []);

  useEffect(() => {
    if (token === null) return;
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchBanners = async () => {
    setLoading(true);
    setError("");
    try {
      if (!token) {
        throw new Error("No auth token found. Please log in again.");
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Vendors should only ever see the banners they created.
      // Super Admin sees everything, so no vendor filter is applied for them.
      // NOTE: confirm the actual field name your session object uses for the
      // vendor's own id (it may be auth._id, auth.id, or auth.vendorId).
      const vendorId = auth?._id || auth?.id || auth?.vendorId;
      const url = !isSuperAdmin && vendorId
        ? `${API_BASE}/admin/banners?venderid=${vendorId}`
        : `${API_BASE}/admin/banners`;

      console.log("Fetching banners from:", url); // remove once confirmed working

      const res = await fetch(url, { headers });
      const data = await safeJson(res, "fetch banners");

      if (!res.ok) throw new Error(data?.message || `Failed to load banners (status ${res.status})`);

      const list = data?.data || data?.banners || data || [];
      setBanners(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Something went wrong while loading banners");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (banner) => {
    setTogglingId(banner._id);
    try {
      const res = await fetch(`${API_BASE}/admin/banners/${banner._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      const data = await safeJson(res, "toggle banner status");
      if (!res.ok) throw new Error(data?.message || "Failed to update status");

      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch (err) {
      alert(err.message || "Could not update banner status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete banner "${banner.title}"? This cannot be undone.`)) return;

    setDeletingId(banner._id);
    try {
      const res = await fetch(`${API_BASE}/admin/banners/${banner._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await safeJson(res, "delete banner").catch(() => ({}));
        throw new Error(data?.message || `Failed to delete banner (status ${res.status})`);
      }
      setBanners((prev) => prev.filter((b) => b._id !== banner._id));
    } catch (err) {
      alert(err.message || "Could not delete banner");
    } finally {
      setDeletingId(null);
    }
  };

  const isCurrentlyLive = (banner) => {
    if (!banner.is_active) return false;
    if (!banner.starts_at || !banner.ends_at) return banner.is_active; // no window set
    const now = new Date();
    return now >= new Date(banner.starts_at) && now <= new Date(banner.ends_at);
  };

  const filteredBanners = banners.filter((b) => {
    if (statusFilter === "active") return b.is_active;
    if (statusFilter === "inactive") return !b.is_active;
    return true;
  });

  const liveCount = banners.filter(isCurrentlyLive).length;
  const inactiveCount = banners.filter((b) => !b.is_active).length;

  const goAdd = () => navigate(`${bannerBasePath}/add`);

  return (
    <div className="min-h-screen space-y-6 bg-[rgb(var(--page-bg))] p-4 md:p-6">
      {/* Hero — same look as Dashboard / Inventory / Attributes */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-6 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-8">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Megaphone size={14} strokeWidth={1.6} />
              Storefront promotions
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl" style={serif}>
              Banners
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Manage promotional banners shown across the storefront
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:items-end">
            <div className="flex flex-wrap gap-y-4 divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={Layers} value={loading ? "—" : banners.length} label="banners" />
              <GlanceStat icon={Radio} value={loading ? "—" : liveCount} label="live now" />
              <GlanceStat icon={PauseCircle} value={loading ? "—" : inactiveCount} label="inactive" />
            </div>
            <button className={primaryBtn} onClick={goAdd}>
              <Plus className="h-4 w-4" /> Create banner
            </button>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-[var(--radius-control)] bg-stone-100 p-1">
          {["all", "active", "inactive"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              aria-pressed={statusFilter === f}
              className={`rounded-[var(--radius-control)] px-4 py-1.5 text-sm transition-colors ${
                statusFilter === f
                  ? "bg-white font-semibold text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500">
          <span className="font-semibold tabular-nums text-slate-900">{filteredBanners.length}</span>{" "}
          banner{filteredBanners.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="relative rounded-[var(--radius-card)] bg-white px-6 py-14 text-center text-sm text-slate-400 ring-1 ring-stone-200">
          <GoldLine />
          Loading banners…
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="relative rounded-[var(--radius-card)] bg-white px-6 py-14 text-center ring-1 ring-stone-200">
          <GoldLine />
          <ImageOff className="mx-auto mb-3 h-8 w-8 text-stone-300" />
          <p className="text-lg font-semibold text-slate-900" style={serif}>
            No banners found
          </p>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Create your first promotional banner to get started.
          </p>
          <button className={primaryBtn} onClick={goAdd}>
            <Plus className="h-4 w-4" /> Create banner
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredBanners.map((banner) => {
            const live = isCurrentlyLive(banner);
            const imgFailed = imgErrorIds[banner._id];

            return (
              <div
                key={banner._id}
                className="relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200 transition-shadow hover:shadow-md"
              >
                <div className="relative h-40 w-full bg-gradient-to-br from-stone-800 to-stone-900">
                  {banner.image_url && !imgFailed ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                      onError={() =>
                        setImgErrorIds((prev) => ({ ...prev, [banner._id]: true }))
                      }
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-sm text-stone-400">
                      <ImageOff className="h-5 w-5" />
                      No image
                    </div>
                  )}

                  <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between">
                    {banner.discount_percentage ? (
                      <span className="rounded-[var(--radius-control)] bg-rose-700 px-2 py-0.5 text-xs font-bold text-white">
                        {banner.discount_percentage}% OFF
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-semibold text-white ${
                        live ? "bg-emerald-700" : banner.is_active ? "bg-amber-700" : "bg-stone-500"
                      }`}
                    >
                      {live ? "● Live now" : banner.is_active ? "Scheduled" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-lg font-semibold leading-snug text-slate-900" style={serif}>
                    {banner.title}
                  </h3>

                  <div className="flex flex-wrap gap-1.5">
                    {banner.categoryId?.name && (
                      <span className="rounded-[var(--radius-control)] bg-stone-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {banner.categoryId.name}
                      </span>
                    )}
                    {isSuperAdmin && banner.vendorId?.name && (
                      <span className="rounded-[var(--radius-control)] bg-[rgb(var(--tint-100))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--brand-text))] ring-1 ring-[rgb(var(--brand-line)/0.35)]">
                        {banner.vendorId?.companyname || banner.vendorId?.name}
                      </span>
                    )}
                    {banner.specialization && (
                      <span className="rounded-[var(--radius-control)] bg-stone-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {banner.specialization}
                      </span>
                    )}
                  </div>

                  <dl className="mt-1 space-y-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Session</dt>
                      <dd className="font-medium text-slate-900">{banner.session_type || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Linked products</dt>
                      <dd className="font-medium tabular-nums text-slate-900">{banner.product_count ?? 0}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Window</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {banner.starts_at && banner.ends_at
                          ? `${new Date(banner.starts_at).toLocaleDateString()} → ${new Date(
                              banner.ends_at
                            ).toLocaleDateString()}`
                          : "No date range set"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex gap-2 pt-3">
                    <button
                      className={ghostBtn}
                      onClick={() => handleToggleActive(banner)}
                      disabled={togglingId === banner._id}
                    >
                      {togglingId === banner._id
                        ? "Updating…"
                        : banner.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                    <button
                      className="inline-flex flex-1 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-2 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]"
                      onClick={() => navigate(`${bannerBasePath}/edit/${banner._id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="inline-flex flex-1 items-center justify-center rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:opacity-60"
                      onClick={() => handleDelete(banner)}
                      disabled={deletingId === banner._id}
                    >
                      {deletingId === banner._id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}