import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart2,
  FileText,
  Gem,
  Loader2,
  Search,
} from "lucide-react";

/* ---------- design tokens (same CSS variables as the Dashboard) ---------- */

const serif = { fontFamily: "var(--font-display)" };

const TABS = ["All order reports", "Scheduled reports", "Custom reports"];

const REPORT_TYPES = [
  {
    value: "unshipped",
    label: "Unshipped Orders Report",
    desc: "Lists all orders that have not yet been marked as shipped, useful for daily fulfilment tracking.",
  },
  {
    value: "all_orders",
    label: "All Orders Report",
    desc: "A complete list of orders placed within the selected date range, including status and totals.",
  },
  {
    value: "flat_file",
    label: "Flat File Order Report",
    desc: "Tab-delimited order data formatted for bulk upload into inventory or accounting systems.",
  },
  {
    value: "returns",
    label: "Order Returns Report",
    desc: "Summarizes return requests, reasons, and refund amounts for the selected period.",
  },
  {
    value: "cancelled",
    label: "Cancelled Orders Report",
    desc: "Lists all orders cancelled by buyers or sellers within the selected date range.",
  },
];

const INITIAL_REPORTS = [
  {
    id: "RPT-99213045",
    name: "All Orders Report",
    range: "1 Jul 2026 – 15 Jul 2026",
    requested: "16 Jul 2026, 9:14 AM",
    format: "CSV",
    status: "ready",
    size: "482 KB",
  },
  {
    id: "RPT-99212988",
    name: "Unshipped Orders Report",
    range: "10 Jul 2026 – 17 Jul 2026",
    requested: "17 Jul 2026, 7:02 AM",
    format: "CSV",
    status: "processing",
    size: "—",
  },
  {
    id: "RPT-99211872",
    name: "Order Returns Report",
    range: "1 Jun 2026 – 30 Jun 2026",
    requested: "1 Jul 2026, 6:45 AM",
    format: "XLSX",
    status: "ready",
    size: "210 KB",
  },
  {
    id: "RPT-99209341",
    name: "Flat File Order Report",
    range: "1 Jun 2026 – 15 Jun 2026",
    requested: "16 Jun 2026, 8:30 AM",
    format: "TXT",
    status: "failed",
    size: "—",
  },
  {
    id: "RPT-99201120",
    name: "All Orders Report",
    range: "Weekly · every Monday",
    requested: "Recurring",
    format: "CSV",
    status: "scheduled",
    size: "—",
  },
];

const statusMeta = {
  ready: { label: "Ready", pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  processing: { label: "Processing", pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500 animate-pulse" },
  failed: { label: "Failed", pill: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
  scheduled: { label: "Scheduled", pill: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
};

const linkClass =
  "text-sm font-medium text-[rgb(var(--brand-text))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]";

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]";

/* ---------- building blocks (same look as Dashboard) ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
    />
  );
}

function GlanceStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3 px-5 first:pl-0 last:pr-0">
      <Icon size={18} strokeWidth={1.5} className="text-[rgb(var(--brand-text))]" />
      <div>
        <p className="text-2xl font-semibold leading-none text-slate-900" style={serif}>
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function OrderReports() {
  const [activeTab, setActiveTab] = useState(0);
  const [reportType, setReportType] = useState("unshipped");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-17");
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [query, setQuery] = useState("");

  const selectedType = REPORT_TYPES.find((t) => t.value === reportType);

  const handleGenerate = () => {
    const newReport = {
      id: `RPT-${Math.floor(90000000 + Math.random() * 9999999)}`,
      name: selectedType.label,
      range: `${startDate} – ${endDate}`,
      requested: "Just now",
      format: "CSV",
      status: "processing",
      size: "—",
    };
    setReports([newReport, ...reports]);
  };

  const visibleReports = reports.filter((r) => {
    if (activeTab === 1) return r.status === "scheduled";
    if (activeTab === 2) return false;
    return true;
  });

  const filtered = visibleReports.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.id.toLowerCase().includes(query.toLowerCase())
  );

  const readyCount = reports.filter((r) => r.status === "ready").length;
  const processingCount = reports.filter((r) => r.status === "processing").length;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <a href="#" className="text-[rgb(var(--brand-text))] hover:underline">
          Orders
        </a>
        <span className="mx-2">›</span>
        <span>Order Reports</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Reporting
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
              Order reports
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Generate and download reports about your orders, returns, and fulfilment.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
              <GlanceStat icon={FileBarChart2} value={reports.length} label="total reports" />
              <GlanceStat icon={CheckCircle2} value={readyCount} label="ready to download" />
              <GlanceStat icon={Loader2} value={processingCount} label="processing" />
            </div>

            <button
              type="button"
              className="rounded-[var(--radius-control)] border border-[rgb(var(--brand-line)/0.5)] bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
            >
              Manage scheduled reports
            </button>
          </div>
        </div>
      </section>

      {/* Generate report */}
      <section className="relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7">
        <GoldLine className="inset-x-10" />
        <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
          <FileText size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />
          Request a new report
        </h2>

        <div className="mt-6 grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="reportType" className="mb-1.5 block text-sm font-medium text-slate-700">
              Report type
            </label>
            <select id="reportType" value={reportType} onChange={(e) => setReportType(e.target.value)} className={fieldClass}>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="mb-1.5 block text-sm font-medium text-slate-700">
              Start date
            </label>
            <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1.5 block text-sm font-medium text-slate-700">
              End date
            </label>
            <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldClass} />
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="w-full rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))]"
          >
            Request report
          </button>
        </div>

        {selectedType && (
          <p className="mt-4 rounded-[var(--radius-control)] bg-[rgb(var(--tint-50))] px-4 py-3 text-sm text-slate-600">
            {selectedType.desc}
          </p>
        )}
      </section>

      {/* Reports list */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-stone-200">
        <GoldLine className="inset-x-10" />

        {/* tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-stone-200 px-4 pt-3">
          {TABS.map((t, i) => {
            const active = activeTab === i;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(i)}
                aria-pressed={active}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))] ${
                  active
                    ? "border-[rgb(var(--brand))] text-[rgb(var(--brand-text))]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-6 py-4">
          <label className="relative block min-w-[200px] flex-1 sm:max-w-xs">
            <span className="sr-only">Search reports</span>
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by report name or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-control)] border border-stone-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]"
            />
          </label>
          {["Last 90 days", "Format", "Status"].map((label) => (
            <button
              key={label}
              type="button"
              className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] border border-stone-300 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
            >
              {label}
              <ChevronDown size={12} />
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <FileText size={40} strokeWidth={1.2} className="mb-3 text-slate-300" />
            <div className="text-lg font-semibold text-slate-900" style={serif}>
              No reports found
            </div>
            <div className="mt-1 max-w-xs text-sm text-slate-500">
              Request a new report above, or adjust your search and filters.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-[rgb(var(--tint-50))] text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Report</th>
                  <th className="px-6 py-3 font-semibold">Date range</th>
                  <th className="px-6 py-3 font-semibold">Requested</th>
                  <th className="px-6 py-3 font-semibold">Format</th>
                  <th className="px-6 py-3 font-semibold">Size</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r) => {
                  const meta = statusMeta[r.status];
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{r.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{r.id}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">{r.range}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">{r.requested}</td>
                      <td className="px-6 py-4 text-slate-700">{r.format}</td>
                      <td className="px-6 py-4 text-slate-700">{r.size}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-medium ring-1 ${meta.pill}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {r.status === "ready" ? (
                          <a className={`inline-flex items-center gap-1.5 ${linkClass}`} href="#">
                            <Download size={14} strokeWidth={1.8} /> Download
                          </a>
                        ) : r.status === "failed" ? (
                          <a className={linkClass} href="#">
                            Retry
                          </a>
                        ) : r.status === "scheduled" ? (
                          <a className={linkClass} href="#">
                            Edit schedule
                          </a>
                        ) : (
                          <span className="pointer-events-none cursor-not-allowed text-sm font-medium text-slate-400">
                            Download
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-6 py-3">
            <span className="text-xs text-slate-500">
              1–{filtered.length} of {filtered.length} reports
            </span>
            <div className="flex items-center gap-1 text-sm">
              <button type="button" disabled aria-label="Previous page" className="rounded-[var(--radius-control)] p-1 text-slate-300">
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-current="page"
                className="rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-2.5 py-1 font-medium text-white"
              >
                1
              </button>
              <button type="button" disabled aria-label="Next page" className="rounded-[var(--radius-control)] p-1 text-slate-300">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}