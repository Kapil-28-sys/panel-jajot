const TONES = {
  orange: "bg-[rgb(var(--brand)/0.13)] text-[rgb(var(--brand-text))]",
  green: "bg-[rgb(var(--success)/0.13)] text-[rgb(var(--success-text))]",
  blue: "bg-sky-50 text-sky-600",
  purple: "bg-indigo-50 text-indigo-600",
  red: "bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger-text))]",
};

/** Common summary/metric card used at the top of module pages. */
export default function MetricCard({ label, value, helper, icon: Icon, tone = "orange" }) {
  return (
    <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[1.7rem] font-bold tracking-tight text-ink-950">{value}</p>
        </div>
        {Icon && (
          <div className={`shrink-0 rounded-[var(--radius-card)] p-2.5 ${TONES[tone] || TONES.orange}`}>
            <Icon size={20} strokeWidth={2.25} />
          </div>
        )}
      </div>
      {helper && <p className="mt-3 text-xs font-medium text-slate-400">{helper}</p>}
    </div>
  );
}
