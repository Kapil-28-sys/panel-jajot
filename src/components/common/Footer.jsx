import { Facebook, Instagram, Linkedin, Mail, Phone, Twitter, Youtube } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { fillTokens } from "../../theme/themeConfig";

const SOCIAL = [
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "twitter", label: "Twitter / X", icon: Twitter },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "youtube", label: "YouTube", icon: Youtube },
];

/** Footer content is controlled from Settings > Footer. Renders nothing if switched off. */
export default function Footer() {
  const { theme } = useTheme();
  const f = theme.footer;
  if (!f.show) return null;

  const copyright = fillTokens(f.copyright, theme);
  const links = SOCIAL.filter((s) => f.social[s.key]);
  if (!f.text && !copyright && !f.supportEmail && !f.supportPhone && !links.length) return null;

  return (
    <footer className="border-t border-line bg-surface-raised px-4 py-4 text-xs text-slate-500 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          {f.text && <p className="text-sm text-ink-800">{fillTokens(f.text, theme)}</p>}
          {copyright && <p>{copyright}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {f.supportEmail && (
            <a href={`mailto:${f.supportEmail}`} className="inline-flex items-center gap-1.5 hover:text-amber-600">
              <Mail size={13} /> {f.supportEmail}
            </a>
          )}
          {f.supportPhone && (
            <a href={`tel:${f.supportPhone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-amber-600">
              <Phone size={13} /> {f.supportPhone}
            </a>
          )}
          {links.length > 0 && (
            <span className="flex items-center gap-1.5">
              {links.map(({ key, label, icon: Icon }) => (
                <a
                  key={key}
                  href={f.social[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-[var(--radius-control)] p-1.5 hover:bg-[rgb(var(--page-bg))] hover:text-amber-600"
                >
                  <Icon size={15} />
                </a>
              ))}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
