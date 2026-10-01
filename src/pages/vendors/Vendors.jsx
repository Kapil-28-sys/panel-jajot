import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Clock,
  Eye,
  Gem,
  Loader2,
  Package,
  Phone,
  Plus,
  Search,
  Store,
  X,
  XCircle,
} from "lucide-react";
import DataPager from "../../components/common/DataPager";

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

/*
  Serif display face for headings and numbers (falls back to Georgia).
  Optional, add to index.html <head> for the full effect:
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet" />
*/
const serif = { fontFamily: "var(--font-display)" };

/* Soft fronts and rich chips, same family as the dashboard. */
const palettes = [
  { front: "from-[rgb(var(--a1-f1))] via-[rgb(var(--a1-f2))] to-[rgb(var(--a1-f3))]", chip: "from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))]" },
  { front: "from-[rgb(var(--a2-f1))] via-[rgb(var(--a2-f2))] to-[rgb(var(--a2-f3))]", chip: "from-[rgb(var(--a2))] to-[rgb(var(--a2-dark))]" },
  { front: "from-[rgb(var(--a3-f1))] via-[rgb(var(--a3-f2))] to-[rgb(var(--a3-f3))]", chip: "from-[rgb(var(--a3))] to-[rgb(var(--a3-dark))]" },
  { front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]", chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]" },
];

const FORM_FIELDS = [
  { key: "companyname", label: "Company name", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "password", label: "Password", type: "password" },
  { key: "phone", label: "Phone number" },
  { key: "category", label: "Category" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
];

const EMPTY_FORM = {
  email: "",
  password: "",
  role: "vendor",
  companyname: "",
  category: "General Merchandise",
  phone: "",
  city: "",
  state: "",
  pincode: "",
};

// Helper: pick phone number from whichever field name the backend actually uses
// Backend confirmed field is "number"
const getPhone = (vendor) =>
  vendor?.number || vendor?.phone || vendor?.mobile || vendor?.phoneNumber || vendor?.contactNumber || "—";

const initials = (name = "") =>
  name
    .split(" ")
    .filter((word) => /^[A-Za-z0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "V";

const inputClass =
  "mt-1.5 w-full rounded-[var(--radius-control)] border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-4 focus:ring-[rgb(var(--brand-line)/0.15)]";

const goldButton =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[rgb(var(--brand-text))] bg-gradient-to-b from-[rgb(var(--brand-lighter))] to-[rgb(var(--brand-light))] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:from-[rgb(var(--brand-lighter-hover))] hover:to-[rgb(var(--brand-light-hover))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]";

/* ---------- small pieces ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
    />
  );
}

function StatCard({ label, value, helper, icon: Icon, palette }) {
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br ${palette.front} p-5 ring-1 ring-[rgb(var(--brand-line)/0.35)]`}>
      <GoldLine className="inset-x-8" />
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-white`}>
          <Icon size={17} strokeWidth={1.6} />
        </span>
      </div>
      <p className="mt-5 text-4xl font-semibold leading-none tracking-tight text-slate-900" style={serif}>
        {value}
      </p>
      <p className="mt-1.5 text-xs text-slate-600">{helper}</p>
    </div>
  );
}

function StatusTag({ status }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 size={13} />
        Active
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
        <XCircle size={13} />
        Blocked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-amber-50 px-2 py-0.5 text-xs font-medium capitalize text-amber-800 ring-1 ring-amber-200">
      <Clock size={13} />
      {status || "Review"}
    </span>
  );
}

function ModalShell({ title, subtitle, onClose, maxWidth = "max-w-lg", children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${maxWidth} overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-[rgb(var(--brand-line)/0.5)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <GoldLine />
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-gradient-to-r from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold leading-tight text-slate-900" style={serif}>
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[var(--radius-control)] p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showForm, setShowForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Try common token key names used across the project's localAuth.js
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("vendorToken") ||
    localStorage.getItem("authToken");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // GET all users (vendors)
  const fetchVendors = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/users`, authHeaders);
      const list = Array.isArray(res.data) ? res.data : res.data?.users || res.data?.data || [];
      // Only vendors (in case super admins are also returned)
      const vendorList = list.filter((u) => (u.role || "vendor") === "vendor");
      setVendors(vendorList);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
      setError(err?.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close either modal with Escape
  useEffect(() => {
    if (!showForm && !selectedVendor) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setShowForm(false);
        setSelectedVendor(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, selectedVendor]);

  // GET single user by id
  const fetchVendorById = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/users/${id}`, authHeaders);
      setSelectedVendor(res.data?.user || res.data);
    } catch (err) {
      console.error("Failed to fetch vendor:", err);
      setError(err?.response?.data?.message || "Failed to load vendor details");
    }
  };

  // PATCH/PUT status update
  const updateVendorStatus = async (id, status) => {
    setStatusUpdating(id);
    try {
      try {
        await axios.patch(`${API_BASE}/users/status/${id}`, { status }, authHeaders);
      } catch (patchErr) {
        // If PATCH isn't supported (404/405), fall back to PUT on the same endpoint
        if (patchErr?.response?.status === 404 || patchErr?.response?.status === 405) {
          await axios.put(`${API_BASE}/users/status/${id}`, { status }, authHeaders);
        } else {
          throw patchErr;
        }
      }
      setVendors((current) => current.map((v) => (v._id === id ? { ...v, status } : v)));
    } catch (err) {
      // Log full details so the real cause (401 auth, 400 bad payload, 404 wrong route) is visible
      console.error("Failed to update status:", {
        status: err?.response?.status,
        data: err?.response?.data,
        url: `${API_BASE}/users/status/${id}`,
        tokenPresent: Boolean(token),
      });
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError("Auth failed — check that the token key in localStorage matches what localAuth.js stores.");
      } else if (err?.response?.status === 404) {
        setError("Route not found — check API_BASE and the /users/status/:id path against your backend routes.");
      } else {
        setError(backendMsg || "Failed to update vendor status");
      }
    } finally {
      setStatusUpdating(null);
    }
  };

  const visibleVendors = useMemo(
    () =>
      vendors.filter((vendor) =>
        `${vendor.companyname || ""} ${vendor.email || ""} ${vendor.category || ""} ${getPhone(vendor)}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query, vendors]
  );

  const pagedVendors = visibleVendors.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  // POST create vendor (assuming same /api/users endpoint handles creation)
  const createVendor = async (event) => {
    event.preventDefault();
    if (!form.companyname.trim() || !form.email.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/users`, form, authHeaders);
      const newVendor = res.data?.user || res.data;
      setVendors((current) => [newVendor, ...current]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create vendor:", err);
      setError(err?.response?.data?.message || "Failed to create vendor");
    }
  };

  const detailRows = selectedVendor
    ? [
        ["Email", selectedVendor.email],
        ["Phone", getPhone(selectedVendor)],
        ["Category", selectedVendor.category],
        ["City", selectedVendor.city],
        ["State", selectedVendor.state],
        ["Pincode", selectedVendor.pincode],
      ]
    : [];

  return (
    <div className="space-y-7">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-6 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-8">
        <GoldLine className="inset-x-16" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Superadmin workspace
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight text-slate-900" style={serif}>
              Vendor management
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Create sellers, review onboarding, and monitor catalog performance.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search vendors"
                aria-label="Search vendors"
                className="w-full rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/85 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-4 focus:ring-[rgb(var(--brand-line)/0.15)]"
              />
            </div>
            <button onClick={() => setShowForm(true)} className={goldButton}>
              <Plus size={16} />
              Add vendor
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-rose-200 border-l-4 border-l-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error" className="text-rose-500 hover:text-rose-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Vendor summary">
        <StatCard
          label="Total vendors"
          value={visibleVendors.length}
          helper="seller panels in view"
          icon={Store}
          palette={palettes[1]}
        />
        <StatCard
          label="Active sellers"
          value={visibleVendors.filter((vendor) => vendor.status === "active").length}
          helper="approved for selling"
          icon={CheckCircle2}
          palette={palettes[0]}
        />
        <StatCard label="Vendor products" value={0} helper="catalog listings owned" icon={Package} palette={palettes[2]} />
      </section>

      {/* Table */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine />
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-5">
          <h2 className="text-2xl font-semibold text-slate-900" style={serif}>
            Vendor panels
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-stone-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[rgb(var(--brand-line))] hover:bg-[rgb(var(--tint-100))] hover:text-[rgb(var(--brand-dark))]"
          >
            <Plus size={15} />
            Add vendor
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 className="animate-spin text-[rgb(var(--brand))]" size={20} />
            Loading vendors...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[rgb(var(--brand-line)/0.3)] bg-gradient-to-r from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Vendor</th>
                  <th className="px-6 py-3 font-semibold">Phone</th>
                  <th className="px-6 py-3 font-semibold">Location</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pagedVendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <p className="text-xl font-semibold text-slate-900" style={serif}>
                        No vendors found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">Try a different search, or add a new vendor.</p>
                    </td>
                  </tr>
                )}
                {pagedVendors.map((vendor, index) => {
                  const palette = palettes[index % palettes.length];
                  return (
                    <tr key={vendor._id} className="transition-colors hover:bg-[rgb(var(--tint-50))]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-base font-semibold text-white`}
                            style={serif}
                          >
                            {initials(vendor.companyname)}
                          </span>
                          <div className="min-w-0">
                            <button
                              onClick={() => fetchVendorById(vendor._id)}
                              className="text-left text-lg font-semibold leading-tight text-slate-900 transition hover:text-[rgb(var(--brand-dark))]"
                              style={serif}
                            >
                              {vendor.companyname || "Unnamed store"}
                            </button>
                            <p className="text-xs text-slate-500">{vendor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Phone size={13} className="text-slate-400" />
                          {getPhone(vendor)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">
                          {vendor.city}
                          {vendor.city && vendor.state ? ", " : ""}
                          {vendor.state}
                        </p>
                        <p className="text-xs text-slate-500">{vendor.pincode}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Package size={14} className="text-[rgb(var(--a3))]" />
                          {vendor.category || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusTag status={vendor.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchVendorById(vendor._id)}
                            title="View details"
                            aria-label={`View details for ${vendor.companyname || "vendor"}`}
                            className="rounded-[var(--radius-control)] border border-stone-200 p-1.5 text-slate-600 transition hover:border-[rgb(var(--brand-line))] hover:bg-[rgb(var(--tint-100))] hover:text-[rgb(var(--brand-dark))]"
                          >
                            <Eye size={15} />
                          </button>
                          {vendor.status !== "active" && (
                            <button
                              disabled={statusUpdating === vendor._id}
                              onClick={() => updateVendorStatus(vendor._id, "active")}
                              className="rounded-[var(--radius-control)] border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Activate
                            </button>
                          )}
                          {vendor.status !== "blocked" && (
                            <button
                              disabled={statusUpdating === vendor._id}
                              onClick={() => updateVendorStatus(vendor._id, "blocked")}
                              className="rounded-[var(--radius-control)] border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <DataPager
              total={visibleVendors.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={updatePageSize}
            />
          </div>
        )}
      </section>

      {/* Add vendor modal */}
      {showForm && (
        <ModalShell
          title="Add vendor"
          subtitle="New vendors start in review."
          maxWidth="max-w-2xl"
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={createVendor} className="grid gap-4 p-6 md:grid-cols-2">
            {FORM_FIELDS.map((field) => (
              <label key={field.key} className="text-sm font-medium text-slate-700">
                {field.label}
                <input
                  type={field.type || "text"}
                  required={field.required}
                  value={form[field.key]}
                  onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  className={inputClass}
                />
              </label>
            ))}

            <div className="flex justify-end gap-3 border-t border-stone-100 pt-4 md:col-span-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-[var(--radius-control)] border border-stone-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
              >
                Cancel
              </button>
              <button className={goldButton}>
                <Store size={16} />
                Create vendor
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* View single vendor modal */}
      {selectedVendor && (
        <ModalShell
          title={selectedVendor.companyname || "Vendor details"}
          subtitle="Vendor details"
          onClose={() => setSelectedVendor(null)}
        >
          <dl className="divide-y divide-stone-100 px-6 py-2 text-sm">
            {detailRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value || "—"}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <StatusTag status={selectedVendor.status} />
              </dd>
            </div>
          </dl>
        </ModalShell>
      )}
    </div>
  );
}