import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  FileText,
  Download,
  Eye,
  ShieldCheck,
  ShieldOff,
  Clock,
  Building2,
  Store,
  Gem,
} from "lucide-react";

/*
  Serif display face for headings and numbers (falls back to Georgia).
  Optional, add to index.html <head> for the full effect:
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet" />
*/
const serif = { fontFamily: "var(--font-display)" };

const DOC_TYPES = [
  { key: "gst", label: "GST certificate" },
  { key: "pan", label: "PAN card" },
  { key: "businessLicense", label: "Business license" },
  { key: "bankProof", label: "Bank account proof" },
  { key: "addressProof", label: "Address proof" },
];

const MOCK_VENDORS = [
  {
    id: "v_1001",
    name: "Orion Electronics",
    store: "orion-electronics",
    email: "contact@orionelectronics.com",
    joined: "12 Mar 2026",
    verification: "verified",
    documents: {
      gst: { status: "approved", fileName: "orion_gst.pdf", uploaded: "10 Mar 2026" },
      pan: { status: "approved", fileName: "orion_pan.pdf", uploaded: "10 Mar 2026" },
      businessLicense: { status: "approved", fileName: "orion_license.pdf", uploaded: "10 Mar 2026" },
      bankProof: { status: "approved", fileName: "orion_bank.pdf", uploaded: "11 Mar 2026" },
      addressProof: { status: "approved", fileName: "orion_address.pdf", uploaded: "11 Mar 2026" },
    },
    permissions: { products: true, orders: true, banners: true, payouts: true, inventory: true },
  },
  {
    id: "v_1002",
    name: "Meadow & Co. Home",
    store: "meadow-home",
    email: "hello@meadowhome.com",
    joined: "28 Apr 2026",
    verification: "verified",
    documents: {
      gst: { status: "approved", fileName: "meadow_gst.pdf", uploaded: "25 Apr 2026" },
      pan: { status: "approved", fileName: "meadow_pan.pdf", uploaded: "25 Apr 2026" },
      businessLicense: { status: "approved", fileName: "meadow_license.pdf", uploaded: "26 Apr 2026" },
      bankProof: { status: "approved", fileName: "meadow_bank.pdf", uploaded: "26 Apr 2026" },
      addressProof: { status: "approved", fileName: "meadow_address.pdf", uploaded: "26 Apr 2026" },
    },
    permissions: { products: true, orders: true, banners: true, payouts: true, inventory: true },
  },
  {
    id: "v_1003",
    name: "Kestrel Outdoors",
    store: "kestrel-outdoors",
    email: "team@kestreloutdoors.com",
    joined: "02 Jun 2026",
    verification: "rejected",
    documents: {
      gst: { status: "rejected", fileName: "kestrel_gst.pdf", uploaded: "30 May 2026" },
      pan: { status: "approved", fileName: "kestrel_pan.pdf", uploaded: "30 May 2026" },
      businessLicense: { status: "rejected", fileName: "kestrel_license.pdf", uploaded: "30 May 2026" },
      bankProof: { status: "pending", fileName: "kestrel_bank.pdf", uploaded: "01 Jun 2026" },
      addressProof: { status: "approved", fileName: "kestrel_address.pdf", uploaded: "30 May 2026" },
    },
    permissions: { products: false, orders: false, banners: false, payouts: false, inventory: false },
  },
  {
    id: "v_1004",
    name: "Lumen Beauty Lab",
    store: "lumen-beauty",
    email: "support@lumenbeauty.co",
    joined: "15 Jul 2026",
    verification: "pending",
    documents: {
      gst: { status: "pending", fileName: "lumen_gst.pdf", uploaded: "14 Jul 2026" },
      pan: { status: "approved", fileName: "lumen_pan.pdf", uploaded: "14 Jul 2026" },
      businessLicense: { status: "pending", fileName: "lumen_license.pdf", uploaded: "14 Jul 2026" },
      bankProof: { status: "pending", fileName: "lumen_bank.pdf", uploaded: "15 Jul 2026" },
      addressProof: { status: "approved", fileName: "lumen_address.pdf", uploaded: "14 Jul 2026" },
    },
    permissions: { products: true, orders: false, banners: false, payouts: false, inventory: true },
  },
];

const PERMISSION_FIELDS = [
  { key: "products", label: "Products", hint: "Create and edit listings" },
  { key: "orders", label: "Orders", hint: "View and fulfil orders" },
  { key: "banners", label: "Banners", hint: "Publish storefront banners" },
  { key: "inventory", label: "Inventory", hint: "Update stock levels" },
  { key: "payouts", label: "Payouts", hint: "View and request payouts" },
];

/* Muted status tags. */
const TAG = {
  verified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
};

const SEGMENT = {
  approved: "bg-emerald-600",
  pending: "bg-[rgb(var(--brand))]",
  rejected: "bg-rose-600",
};

/* Soft fronts and rich chips, same family as the dashboard. */
const palettes = [
  { front: "from-[rgb(var(--a1-f1))] via-[rgb(var(--a1-f2))] to-[rgb(var(--a1-f3))]", chip: "from-[rgb(var(--a1))] to-[rgb(var(--a1-dark))]" },
  { front: "from-[rgb(var(--a2-f1))] via-[rgb(var(--a2-f2))] to-[rgb(var(--a2-f3))]", chip: "from-[rgb(var(--a2))] to-[rgb(var(--a2-dark))]" },
  { front: "from-[rgb(var(--a3-f1))] via-[rgb(var(--a3-f2))] to-[rgb(var(--a3-f3))]", chip: "from-[rgb(var(--a3))] to-[rgb(var(--a3-dark))]" },
  { front: "from-[rgb(var(--tint-100))] via-[rgb(var(--tint-200))] to-[rgb(var(--tint-300))]", chip: "from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))]" },
];

const initials = (name = "") =>
  name
    .split(" ")
    .filter((word) => /^[A-Za-z0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

function docCounts(documents) {
  const values = Object.values(documents);
  return {
    total: values.length,
    approved: values.filter((d) => d.status === "approved").length,
    pending: values.filter((d) => d.status === "pending").length,
    rejected: values.filter((d) => d.status === "rejected").length,
  };
}

/* ---------- small pieces ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
    />
  );
}

function Tag({ status, children }) {
  return (
    <span className={`inline-flex items-center rounded-[var(--radius-control)] px-2 py-0.5 text-xs font-medium capitalize ring-1 ${TAG[status]}`}>
      {children || status}
    </span>
  );
}

function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] ${
        disabled ? "cursor-not-allowed bg-stone-200" : checked ? "bg-gradient-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-light))]" : "bg-stone-300"
      }`}
    >
      <span
        className="inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ width: 18, height: 18, transform: checked ? "translateX(23px)" : "translateX(3px)" }}
      />
    </button>
  );
}

function StatCard({ label, value, icon: Icon, palette }) {
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
    </div>
  );
}

/* One segment per document, coloured by review status. */
function DocProgress({ documents }) {
  return (
    <div className="flex gap-1" role="img" aria-label="Document review progress">
      {DOC_TYPES.map(({ key }) => (
        <span
          key={key}
          className={`h-1.5 w-6 rounded-full ${documents[key] ? SEGMENT[documents[key].status] : "bg-stone-200"}`}
        />
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function VendorPermissions() {
  const [vendors, setVendors] = useState(MOCK_VENDORS);
  const [query, setQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [expanded, setExpanded] = useState(null); // vendor id
  const [docPreview, setDocPreview] = useState(null); // { vendor, docKey }

  useEffect(() => {
    if (!docPreview) return undefined;
    const onKey = (event) => event.key === "Escape" && setDocPreview(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docPreview]);

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const matchesQuery =
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        v.store.toLowerCase().includes(query.toLowerCase());
      const matchesVerification = verificationFilter === "all" || v.verification === verificationFilter;
      return matchesQuery && matchesVerification;
    });
  }, [vendors, query, verificationFilter]);

  const stats = useMemo(
    () => ({
      total: vendors.length,
      verified: vendors.filter((v) => v.verification === "verified").length,
      pending: vendors.filter((v) => v.verification === "pending").length,
      rejected: vendors.filter((v) => v.verification === "rejected").length,
    }),
    [vendors]
  );

  const setDocStatus = (vendorId, docKey, status) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? { ...v, documents: { ...v.documents, [docKey]: { ...v.documents[docKey], status } } }
          : v
      )
    );
    // TODO: PATCH `${apiUrl()}/admin/vendors/${vendorId}/documents/${docKey}`
    setDocPreview(null);
  };

  const togglePermission = (vendorId, field, value) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === vendorId ? { ...v, permissions: { ...v.permissions, [field]: value } } : v))
    );
    // TODO: PATCH `${apiUrl()}/admin/vendors/${vendorId}/permissions`
  };

  const setVerification = (vendorId, status) => {
    setVendors((prev) => prev.map((v) => (v.id === vendorId ? { ...v, verification: status } : v)));
    // TODO: PATCH `${apiUrl()}/admin/vendors/${vendorId}/verification`
  };

  const filters = [
    { key: "all", label: "All", count: stats.total },
    { key: "verified", label: "Verified", count: stats.verified },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "rejected", label: "Rejected", count: stats.rejected },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Page header */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Vendor compliance
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight text-slate-900" style={serif}>
              Vendor permissions &amp; documentation
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Review onboarding documents and manage what each vendor can access.
            </p>
          </div>
          <button className="w-fit rounded-[var(--radius-control)] border border-[rgb(var(--brand-text))] bg-gradient-to-b from-[rgb(var(--brand-lighter))] to-[rgb(var(--brand-light))] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:from-[rgb(var(--brand-lighter-hover))] hover:to-[rgb(var(--brand-light-hover))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]">
            Export vendor list
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total vendors" value={stats.total} icon={Building2} palette={palettes[1]} />
          <StatCard label="Verified" value={stats.verified} icon={ShieldCheck} palette={palettes[0]} />
          <StatCard label="Pending review" value={stats.pending} icon={Clock} palette={palettes[3]} />
          <StatCard label="Rejected" value={stats.rejected} icon={ShieldOff} palette={palettes[2]} />
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendor or store name"
              aria-label="Search vendor or store name"
              className="w-full rounded-[var(--radius-control)] border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[rgb(var(--brand-line))] focus:ring-4 focus:ring-[rgb(var(--brand-line)/0.15)]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-[var(--radius-card)] bg-white p-1 ring-1 ring-stone-200" role="group" aria-label="Filter by verification status">
            {filters.map((filter) => {
              const active = verificationFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setVerificationFilter(filter.key)}
                  className={`flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-gradient-to-br from-[rgb(var(--hero-b))] to-[rgb(var(--tint-300))] text-slate-900 ring-1 ring-[rgb(var(--brand-line)/0.5)]"
                      : "text-slate-600 hover:bg-stone-50"
                  }`}
                >
                  {filter.label}
                  <span className={`text-xs ${active ? "text-[rgb(var(--brand-dark))]" : "text-slate-400"}`}>{filter.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vendor list */}
        <div className="space-y-3">
          {filtered.map((v) => {
            const counts = docCounts(v.documents);
            const isOpen = expanded === v.id;
            const palette = palettes[vendors.findIndex((item) => item.id === v.id) % palettes.length];
            return (
              <div
                key={v.id}
                className={`relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 transition-shadow ${
                  isOpen ? "ring-[rgb(var(--brand-line)/0.6)]" : "ring-stone-200"
                }`}
              >
                {isOpen && <GoldLine />}

                {/* Row header */}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : v.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    {isOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight size={16} className="shrink-0 text-slate-400" />
                    )}
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-gradient-to-br ${palette.chip} text-lg font-semibold text-white`}
                      style={serif}
                    >
                      {initials(v.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold leading-tight text-slate-900" style={serif}>
                        {v.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {v.email}, joined {v.joined}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-5">
                    <div className="hidden text-right sm:block">
                      <DocProgress documents={v.documents} />
                      <p className="mt-1.5 text-xs text-slate-500">
                        {counts.approved} of {counts.total} documents approved
                      </p>
                    </div>
                    <Tag status={v.verification} />
                  </div>
                </button>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-stone-200 bg-gradient-to-b from-[rgb(var(--tint-50))] to-white px-5 py-5">
                    <div className="grid gap-8 lg:grid-cols-2">
                      {/* Documents */}
                      <div>
                        <h3 className="mb-3 text-xl font-semibold text-slate-900" style={serif}>
                          Submitted documents
                        </h3>
                        <div className="divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200 bg-white">
                          {DOC_TYPES.map(({ key, label }) => {
                            const doc = v.documents[key];
                            if (!doc) return null;
                            return (
                              <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-stone-100 text-slate-500">
                                    <FileText size={15} strokeWidth={1.6} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">{label}</p>
                                    <p className="truncate text-xs text-slate-500">
                                      {doc.fileName}, uploaded {doc.uploaded}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Tag status={doc.status} />
                                  <button
                                    type="button"
                                    onClick={() => setDocPreview({ vendor: v, docKey: key })}
                                    className="rounded-[var(--radius-control)] border border-stone-200 p-1.5 text-slate-600 transition hover:border-[rgb(var(--brand-line))] hover:bg-[rgb(var(--tint-100))] hover:text-[rgb(var(--brand-dark))]"
                                    aria-label={`Review ${label}`}
                                  >
                                    <Eye size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Permissions */}
                      <div>
                        <h3 className="mb-3 text-xl font-semibold text-slate-900" style={serif}>
                          Access permissions
                        </h3>
                        <div className="divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200 bg-white">
                          {PERMISSION_FIELDS.map(({ key, label, hint }) => (
                            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{label}</p>
                                <p className="text-xs text-slate-500">{hint}</p>
                              </div>
                              <Toggle
                                label={`${label} access for ${v.name}`}
                                checked={v.permissions[key]}
                                onChange={(val) => togglePermission(v.id, key, val)}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setVerification(v.id, "verified")}
                            className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
                          >
                            <Check size={14} />
                            Mark verified
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerification(v.id, "rejected")}
                            className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 transition hover:bg-rose-100"
                          >
                            <X size={14} />
                            Reject vendor
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-[var(--radius-card)] border border-dashed border-stone-300 bg-white px-4 py-12 text-center">
              <p className="text-xl font-semibold text-slate-900" style={serif}>
                No vendors match
              </p>
              <p className="mt-1 text-sm text-slate-500">Try a different name or clear the status filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Document preview modal */}
      {docPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
          onClick={() => setDocPreview(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Review document"
            className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-[rgb(var(--brand-line)/0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <GoldLine />
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold leading-tight text-slate-900" style={serif}>
                  {DOC_TYPES.find((d) => d.key === docPreview.docKey)?.label}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{docPreview.vendor.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDocPreview(null)}
                className="rounded-[var(--radius-control)] p-1 text-slate-400 transition hover:bg-stone-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="flex h-44 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[rgb(var(--brand-line)/0.5)] bg-gradient-to-br from-[rgb(var(--tint-50))] to-[rgb(var(--hero-b))] text-[rgb(var(--brand))]">
                <FileText size={32} strokeWidth={1.4} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{docPreview.vendor.documents[docPreview.docKey].fileName}</span>
                <Tag status={docPreview.vendor.documents[docPreview.docKey].status} />
              </div>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-stone-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
              >
                <Download size={14} />
                Download original file
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-200 bg-stone-50/60 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setDocStatus(docPreview.vendor.id, docPreview.docKey, "rejected")}
                className="rounded-[var(--radius-control)] border border-rose-300 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-800 transition hover:bg-rose-100"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setDocStatus(docPreview.vendor.id, docPreview.docKey, "approved")}
                className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[rgb(var(--brand-text))] bg-gradient-to-b from-[rgb(var(--brand-lighter))] to-[rgb(var(--brand-light))] px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:from-[rgb(var(--brand-lighter-hover))] hover:to-[rgb(var(--brand-light-hover))]"
              >
                <Check size={14} />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}