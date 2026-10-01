import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import PreviousVersionButton from "../../theme/PreviousVersionButton";
import ThemeSettings from "./ThemeSettings";
import { useTheme } from "../../theme/ThemeProvider";

export default function VendorAppearance() {
  const { revision } = useTheme();
  const [notice, setNotice] = useState(null);
  const notify = (message, type = "success") => setNotice({ message, type });

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Appearance</h1>
          <p className="text-sm opacity-70">Customise how your panel looks. Only you see these changes.</p>
        </div>
        <PreviousVersionButton notify={notify} />
      </div>

      <ThemeSettings key={revision} notify={notify} />

      {notice && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-[var(--radius-card)] px-5 py-3.5 text-sm font-medium text-white shadow-2xl ${
            notice.type === "success" ? "bg-[rgb(var(--ink))]" : "bg-rose-700"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notice.message}
        </div>
      )}
    </div>
  );
}

