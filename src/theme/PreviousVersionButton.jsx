import { History } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/** "Previous version" — undo the last saved theme (Super Admin: shared theme, Vendor: their own look). */
export default function PreviousVersionButton({ notify }) {
  const { restorePrevious } = useTheme();
  const onClick = async () => {
    if (!window.confirm("Go back to the previous saved look?")) return;
    const r = await restorePrevious();
    if (r.remote) notify("Went back to the previous look.");
    else notify(r.error?.response?.data?.message || "There is no earlier version to go back to.", "error");
  };
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-[var(--radius-btn)] px-4 py-2 text-sm font-medium ring-1 ring-stone-300 hover:bg-white/60">
      <History size={16} /> Previous version
    </button>
  );
}
