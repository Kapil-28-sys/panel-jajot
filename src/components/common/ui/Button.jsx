import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-[rgb(var(--btn-bg))] text-[rgb(var(--btn-text))] hover:bg-[rgb(var(--btn-bg-hover))] focus-visible:ring-[rgb(var(--btn-bg)/0.3)] shadow-sm shadow-[rgb(var(--btn-bg)/0.2)]",
  secondary: "bg-[rgb(var(--secondary))] text-[rgb(var(--secondary-text))] hover:opacity-90 focus-visible:ring-[rgb(var(--secondary)/0.25)]",
  outline: "border border-line bg-white text-ink-800 hover:bg-[rgb(var(--page-bg))] focus-visible:ring-slate-300",
  danger: "bg-[rgb(var(--danger))] text-white hover:brightness-95 focus-visible:ring-[rgb(var(--danger)/0.3)]",
  ghost: "text-ink-700 hover:bg-[rgb(var(--page-bg))] focus-visible:ring-slate-300",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3 text-sm gap-2",
};

/**
 * Common button used across the app. Keep every clickable action consistent:
 * same radius, focus ring, disabled/loading behavior.
 */
export default function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <Component
      disabled={Component === "button" ? isDisabled : undefined}
      aria-disabled={isDisabled}
      className={`inline-flex items-center justify-center rounded-[var(--radius-btn)] font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {!loading && Icon && <Icon size={16} />}
      {children}
    </Component>
  );
}
