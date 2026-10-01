import { Store } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Logo from Settings > Branding, falling back to the default store icon.
 * Size/shape come from `className` (e.g. "h-9 w-9 rounded-md").
 */
export default function BrandLogo({ className = "h-9 w-9", iconSize = 19 }) {
  const { theme } = useTheme();
  const { logo, siteName } = theme.branding;

  if (logo) {
    return (
      <img
        src={logo}
        alt={siteName}
        className={`shrink-0 object-contain ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-[rgb(var(--btn-text))] ${className}`}
    >
      <Store size={iconSize} strokeWidth={2.5} />
    </div>
  );
}
