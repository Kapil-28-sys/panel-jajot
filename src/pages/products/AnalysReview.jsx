import { useEffect, useMemo, useState } from "react";
import { Camera, MessageSquareText, Pencil, RefreshCw, Star, Trash2, TriangleAlert } from "lucide-react";
import Button from "../../components/common/ui/Button";
import ConfirmDialog from "../../components/common/ui/ConfirmDialog";
import EmptyState from "../../components/common/ui/EmptyState";
import ErrorState from "../../components/common/ui/ErrorState";
import Input from "../../components/common/ui/Input";
import MetricCard from "../../components/common/MetricCard";
import Modal from "../../components/common/ui/Modal";
import SearchInput from "../../components/common/ui/SearchInput";
import Select from "../../components/common/ui/Select";
import DataPager from "../../components/common/DataPager";

const BASE_URL = "https://amazon-multi-vendor-3.onrender.com";
const PAGE_SIZE = 6;
const USER_STORAGE_KEY = "adminSession";
const VENDOR_ID_STORAGE_KEY = "vendorId";
const VENDOR_ID_RESOLVED_EVENT = "vendorid:resolved";
const VENDOR_ID_POLL_MS = 200;
const VENDOR_ID_POLL_TIMEOUT_MS = 10000;

/* ---------------------------------------------------------------------- */
/* Vendor id resolution                                                   */
/* ---------------------------------------------------------------------- */

function readVendorIdFromUserObject(storage) {
  try {
    const raw = storage.getItem(USER_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.vendorId || "";
  } catch {
    return "";
  }
}

function readVendorIdFromStorage() {
  // Try sessionStorage first (fast path for the current tab), then
  // localStorage. In each, prefer the real "user" object's .vendorId
  // field (the shape this app actually uses), then fall back to a
  // standalone "vendorId" key if one is ever set directly.
  try {
    const fromUserSession = readVendorIdFromUserObject(sessionStorage);
    if (fromUserSession) return fromUserSession;
    const fromSession = sessionStorage.getItem(VENDOR_ID_STORAGE_KEY);
    if (fromSession) return fromSession;
  } catch {
    // sessionStorage can throw in some privacy modes / SSR — ignore and fall through
  }
  try {
    const fromUserLocal = readVendorIdFromUserObject(localStorage);
    if (fromUserLocal) return fromUserLocal;
    const fromLocal = localStorage.getItem(VENDOR_ID_STORAGE_KEY);
    if (fromLocal) return fromLocal;
  } catch {
    // ignore
  }
  return "";
}

/**
 * Resolves vendorId reactively. Tries, in order: prop -> getVendorId() ->
 * storage (sync) -> storage (polled) / custom event -> gives up after
 * VENDOR_ID_POLL_TIMEOUT_MS.
 */
function useResolvedVendorId(vendorIdProp, getVendorId) {
  const [vendorId, setVendorId] = useState(() => vendorIdProp || readVendorIdFromStorage());
  const [resolving, setResolving] = useState(!vendorIdProp && !readVendorIdFromStorage());

  useEffect(() => {
    if (vendorIdProp) {
      setVendorId(vendorIdProp);
      setResolving(false);
      return;
    }

    const already = readVendorIdFromStorage();
    if (already) {
      setVendorId(already);
      setResolving(false);
      return;
    }

    setResolving(true);
    let cancelled = false;

    const tryResolve = (id) => {
      if (cancelled) return;
      const resolved = id || readVendorIdFromStorage();
      if (resolved) {
        setVendorId(resolved);
        setResolving(false);
      }
    };

    // If the caller gave us a direct hook into their real session/auth
    // call, prefer it — it's the most reliable source, no guessing needed.
    if (typeof getVendorId === "function") {
      Promise.resolve()
        .then(() => getVendorId())
        .then((id) => {
          if (id) {
            tryResolve(id);
            try {
              sessionStorage.setItem(VENDOR_ID_STORAGE_KEY, id);
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {
          // swallow — storage polling below is still a valid fallback
        });
    }

    const onCustomEvent = (e) => tryResolve(e?.detail);
    const onStorageEvent = (e) => {
      if (!e.key || e.key === VENDOR_ID_STORAGE_KEY || e.key === USER_STORAGE_KEY) tryResolve();
    };
    window.addEventListener(VENDOR_ID_RESOLVED_EVENT, onCustomEvent);
    window.addEventListener("storage", onStorageEvent);

    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start > VENDOR_ID_POLL_TIMEOUT_MS) {
        clearInterval(interval);
        setResolving(false);
        return;
      }
      tryResolve();
    }, VENDOR_ID_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(VENDOR_ID_RESOLVED_EVENT, onCustomEvent);
      window.removeEventListener("storage", onStorageEvent);
    };
  }, [vendorIdProp, getVendorId]);

  return [vendorId, resolving];
}

function resolveImageUrl(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${BASE_URL}/${image.replace(/^\/+/, "")}`;
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reviews)) return payload.reviews;
  return [];
}

function normalizeOne(payload) {
  return payload?.data ?? payload?.review ?? payload;
}

/* ---------------------------------------------------------------------- */
/* API calls — backend resource is "product_review"                       */
/* ---------------------------------------------------------------------- */

async function apiGetVendorReviews(vendorId) {
  const res = await fetch(`${BASE_URL}/api/product_review/vendor/${vendorId}`);
  if (!res.ok) throw new Error(`Failed to load reviews (${res.status})`);
  return normalizeList(await res.json());
}

async function apiUpdateReview(id, payload) {
  const res = await fetch(`${BASE_URL}/api/product_review/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update review (${res.status})`);
  return normalizeOne(await res.json());
}

async function apiDeleteReview(id) {
  const res = await fetch(`${BASE_URL}/api/product_review/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete review (${res.status})`);
  return true;
}

const getId = (r) => r?._id || r?.id;

// pid / variantId may come back as plain string ids OR populated objects
// ({ _id, productName } / { _id, sku, ... }) depending on the endpoint.
function getPidId(review) {
  const pid = review?.pid;
  if (!pid) return null;
  return typeof pid === "string" ? pid : pid._id || null;
}

function getPidLabel(review) {
  const pid = review?.pid;
  if (!pid) return null;
  return typeof pid === "string" ? pid : pid.productName || pid._id || null;
}

function getVariantLabel(review) {
  const variant = review?.variantId;
  if (!variant) return null;
  return typeof variant === "string" ? variant : variant.sku || variant.variantName || variant._id || null;
}

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/* ---------------------------------------------------------------------- */
/* Small building blocks                                                  */
/* ---------------------------------------------------------------------- */

function Stars({ value = 0, size = 16 }) {
  const clamped = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${clamped.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fillPct = Math.max(0, Math.min(1, clamped - i)) * 100;
        return (
          <span key={i} className="relative inline-block shrink-0" style={{ width: size, height: size }}>
            <Star size={size} className="fill-slate-200 text-slate-200" aria-hidden="true" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
              <Star size={size} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function RatingBars({ counts, total, activeStar, onSelect }) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = counts[star] || 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        const active = activeStar === star;
        return (
          <button
            key={star}
            type="button"
            className={`grid w-full grid-cols-[52px_minmax(0,1fr)_38px] items-center gap-3 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-[rgb(var(--page-bg))] focus-visible:outline-amber-500 ${active ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}
            onClick={() => onSelect(active ? null : star)}
            aria-pressed={active}
            aria-label={`${star} star reviews, ${count} of ${total}`}
          >
            <span className={`text-xs font-semibold ${active ? "text-amber-700" : "text-ink-700"}`}>{star} star</span>
            <span className="h-2 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full bg-amber-400 transition-[width]" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-right text-xs text-slate-500">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main panel                                                             */
/* ---------------------------------------------------------------------- */

export default function VendorReviewsPanel({ vendorId: vendorIdProp, getVendorId }) {
  const [vendorId, resolvingVendorId] = useResolvedVendorId(vendorIdProp, getVendorId);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [activeStar, setActiveStar] = useState(null);
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [lightbox, setLightbox] = useState(null);

  async function load() {
    if (!vendorId) {
      if (!resolvingVendorId) {
        setError("We couldn't find your vendor account. Sign in again and try.");
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const data = await apiGetVendorReviews(vendorId);
      setReviews(data);
    } catch (err) {
      setError(err.message || "Could not load your reviews.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const productOptions = useMemo(() => {
    const map = new Map();
    reviews.forEach((r) => {
      const id = getPidId(r);
      if (id && !map.has(id)) map.set(id, getPidLabel(r) || id);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [reviews]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    reviews.forEach((r) => {
      const star = Math.round(Number(r.rating)) || 0;
      if (counts[star] !== undefined) counts[star] += 1;
      sum += Number(r.rating) || 0;
    });
    const average = total ? sum / total : 0;
    const withPhotos = reviews.filter((r) => (Array.isArray(r.image) ? r.image.length : r.image)).length;
    const critical = counts[1] + counts[2];
    return { total, counts, average, withPhotos, critical };
  }, [reviews]);

  const visible = useMemo(() => {
    let list = [...reviews];
    if (productFilter !== "all") list = list.filter((r) => getPidId(r) === productFilter);
    if (activeStar) list = list.filter((r) => Math.round(Number(r.rating)) === activeStar);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.userName?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          getPidLabel(r)?.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case "highest":
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "lowest":
        list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      default:
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [reviews, productFilter, activeStar, search, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  function openEdit(review) {
    setEditing(review);
    setEditError(null);
    setEditForm({
      userName: review.userName || "",
      description: review.description || "",
      rating: review.rating || 5,
      image: Array.isArray(review.image) ? review.image.join(", ") : review.image || "",
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setEditError(null);
    try {
      const id = getId(editing);
      const payload = {
        userName: editForm.userName,
        description: editForm.description,
        rating: Number(editForm.rating),
        image: editForm.image.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const updated = await apiUpdateReview(id, payload);
      setReviews((prev) => prev.map((r) => (getId(r) === id ? { ...r, ...payload, ...updated } : r)));
      setEditing(null);
    } catch (err) {
      setEditError(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = getId(deleteTarget);
    setDeletingId(id);
    setActionError(null);
    try {
      await apiDeleteReview(id);
      setReviews((prev) => prev.filter((r) => getId(r) !== id));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err.message || "Could not delete review.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">Customer feedback</p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-ink-950">Reviews &amp; ratings</h1>
            <p className="mt-1 text-sm text-slate-500">See what customers are saying about your products and manage their reviews.</p>
          </div>
          <Button type="button" variant="outline" icon={RefreshCw} loading={loading && Boolean(vendorId)}
            onClick={load} disabled={!vendorId} className="self-start sm:self-auto">
            Refresh
          </Button>
        </div>
      </div>

      {!vendorId && resolvingVendorId ? (
        <div className="flex items-center justify-center gap-3 rounded-card border border-line bg-white px-6 py-16 text-sm text-slate-500 shadow-card">
          <RefreshCw size={18} className="animate-spin text-amber-500" />
          Loading your account…
        </div>
      ) : !vendorId ? (
        <div className="rounded-card border border-line bg-white shadow-card">
          <ErrorState message="We couldn't find your vendor account. Sign in again and try." />
        </div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]" aria-label="Review overview">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <MetricCard label="Total reviews" value={loading ? "—" : stats.total}
                helper="Across your products" icon={MessageSquareText} tone="blue" />
              <MetricCard label="Average rating" value={loading ? "—" : `${stats.average.toFixed(1)} / 5`}
                helper="All customer ratings" icon={Star} tone="orange" />
              <MetricCard label="Needs attention" value={loading ? "—" : stats.critical}
                helper="1 and 2 star reviews" icon={TriangleAlert} tone="red" />
              <MetricCard label="With photos" value={loading ? "—" : stats.withPhotos}
                helper="Reviews with images" icon={Camera} tone="purple" />
            </div>
            <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink-950">Rating breakdown</h2>
                  <p className="mt-1 text-xs text-slate-500">Select a rating to filter the reviews below.</p>
                </div>
                {activeStar && (
                  <button type="button" onClick={() => { setActiveStar(null); setPage(1); }}
                    className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-600">
                    Clear
                  </button>
                )}
              </div>
              <RatingBars counts={stats.counts} total={stats.total} activeStar={activeStar}
                onSelect={(star) => { setActiveStar(star); setPage(1); }} />
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card" aria-label="Customer reviews">
            <div className="border-b border-line p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-ink-950">Customer reviews</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {loading ? "Loading reviews…" : `${visible.length} matching review${visible.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                {(search || productFilter !== "all" || activeStar || sort !== "newest") && (
                  <button type="button"
                    onClick={() => { setSearch(""); setProductFilter("all"); setActiveStar(null); setSort("newest"); setPage(1); }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-600">
                    Reset filters
                  </button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.6fr)_minmax(180px,0.6fr)] md:items-end">
                <div>
                  <label htmlFor="review-search" className="mb-1.5 block text-sm font-medium text-ink-800">Search reviews</label>
                  <SearchInput id="review-search" value={search} onChange={(value) => { setSearch(value); setPage(1); }}
                    placeholder="Reviewer, review text, or product…" className="w-full" />
                </div>
                <Select label="Product" value={productFilter}
                  onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
                  options={[{ value: "all", label: "All products" }, ...productOptions.map(({ id, label }) => ({ value: id, label }))]} />
                <Select label="Sort by" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  options={[
                    { value: "newest", label: "Newest first" },
                    { value: "oldest", label: "Oldest first" },
                    { value: "highest", label: "Highest rating" },
                    { value: "lowest", label: "Lowest rating" },
                  ]} />
              </div>
              {activeStar && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  Rating filter
                  <button type="button" onClick={() => { setActiveStar(null); setPage(1); }}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700 hover:bg-amber-100">
                    {activeStar} star ×
                  </button>
                </div>
              )}
            </div>

            {actionError && (
              <div role="alert" className="mx-5 mt-5 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
                {actionError}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-slate-500">
                <RefreshCw size={18} className="animate-spin text-amber-500" />
                Loading your reviews…
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : pageItems.length === 0 ? (
              <EmptyState icon={MessageSquareText}
                title={stats.total === 0 ? "No reviews yet" : "No matching reviews"}
                description={stats.total === 0
                  ? "Customer reviews for your products will appear here."
                  : "Try a different search or clear the current filters."}
                actionLabel={stats.total > 0 ? "Clear filters" : undefined}
                onAction={stats.total > 0 ? () => {
                  setSearch(""); setProductFilter("all"); setActiveStar(null); setSort("newest"); setPage(1);
                } : undefined} />
            ) : (
              <ul className="divide-y divide-line">
                {pageItems.map((review, index) => {
                  const id = getId(review);
                  const images = Array.isArray(review.image) ? review.image : review.image ? [review.image] : [];
                  const date = formatDate(review.createdAt || review.updatedAt);
                  return (
                    <li key={id ?? index} className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-white">
                            {initials(review.userName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink-950">{review.userName || "Anonymous"}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Stars value={review.rating} size={15} />
                              <span className="text-xs font-semibold text-ink-700">{Number(review.rating || 0).toFixed(1)}</span>
                              {date && <span className="text-xs text-slate-500">· {date}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2 sm:pl-0">
                          <Button type="button" variant="outline" size="sm" icon={Pencil} onClick={() => openEdit(review)}>Edit</Button>
                          <button type="button" onClick={() => { setActionError(null); setDeleteTarget(review); }}
                            disabled={deletingId === id}
                            className="inline-flex items-center gap-1.5 rounded-control border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-ink-800">
                        {review.description || <span className="italic text-slate-400">No written review provided.</span>}
                      </p>
                      {images.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {images.map((img, imageIndex) => {
                            const src = resolveImageUrl(img);
                            return (
                              <button key={`${img}-${imageIndex}`} type="button" onClick={() => setLightbox(src)}
                                aria-label={`View review photo ${imageIndex + 1}`}
                                className="h-16 w-16 overflow-hidden rounded-control border border-line bg-[rgb(var(--page-bg))] hover:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-500">
                                <img src={src} alt="" className="h-full w-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {(getPidLabel(review) || getVariantLabel(review)) && (
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-slate-500">
                          {getPidLabel(review) && <span className="min-w-0 break-all">Product: <span className="font-semibold text-ink-700">{getPidLabel(review)}</span></span>}
                          {getVariantLabel(review) && <span className="min-w-0 break-all">Variant: <span className="font-semibold text-ink-700">{getVariantLabel(review)}</span></span>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && !error && visible.length > 0 && (
              <DataPager total={visible.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
            )}
          </section>
        </>
      )}

      <Modal open={Boolean(editing && editForm)} onClose={() => { if (!saving) setEditing(null); }}
        title="Edit review" description="Update the reviewer details, rating, or review content."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="review-edit-form" size="sm" loading={saving}>Save changes</Button>
          </>
        }>
        {editForm && (
          <form id="review-edit-form" onSubmit={saveEdit} className="space-y-4">
            <Input label="Reviewer name" value={editForm.userName}
              onChange={(e) => setEditForm({ ...editForm, userName: e.target.value })} required />
            <div>
              <label htmlFor="review-rating" className="mb-1.5 block text-sm font-medium text-ink-800">Rating</label>
              <div className="flex items-center gap-3 rounded-control border border-line bg-[rgb(var(--page-bg))] px-3 py-2">
                <input id="review-rating" type="range" min="1" max="5" value={editForm.rating}
                  onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                  className="min-w-0 flex-1 accent-amber-500" />
                <Stars value={Number(editForm.rating)} size={17} />
                <span className="w-7 text-right text-sm font-semibold text-ink-950">{editForm.rating}</span>
              </div>
            </div>
            <div>
              <label htmlFor="review-description" className="mb-1.5 block text-sm font-medium text-ink-800">Review text</label>
              <textarea id="review-description" rows={4} value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required
                className="w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" />
            </div>
            <Input label="Image filenames" helperText="Separate multiple filenames with commas."
              value={editForm.image} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
              placeholder="review1.jpg, review2.jpg" />
            {editError && <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}
          </form>
        )}
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => { if (!deletingId) setDeleteTarget(null); }}
        onConfirm={confirmDelete} title="Delete review?"
        description={`This will permanently remove ${deleteTarget?.userName || "this customer's"} review. This cannot be undone.`}
        confirmLabel="Delete review" loading={Boolean(deletingId)} />

      <Modal open={Boolean(lightbox)} onClose={() => setLightbox(null)} title="Review photo" size="xl">
        {lightbox && <img src={lightbox} alt="Enlarged review attachment"
          className="mx-auto max-h-[72vh] w-auto max-w-full rounded-control object-contain" />}
      </Modal>
    </div>
  );
}
