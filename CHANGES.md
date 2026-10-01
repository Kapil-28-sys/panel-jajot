# Shared theme — one change shows in every browser

The theme is now stored once on the server. When the Super Admin clicks **Save & apply**, every browser and device loads that same theme (Chrome, Firefox, phone, other PCs).

## One-time setup on Vercel (about 2 minutes)
1. Deploy this project to Vercel (it already has `vercel.json`).
2. Vercel dashboard -> your project -> **Storage** -> **Create** -> **Blob** -> connect it to the project (either Public or Private store works).
3. **Redeploy** once. Vercel adds `BLOB_READ_WRITE_TOKEN` by itself.
4. Log in as Super Admin -> Settings -> Appearance -> change something -> **Save & apply**. The footer note should say "Loaded from the server".

If step 2 is skipped, saving shows: "No storage is connected..." with these same instructions.

## Local development
`npm install` then `npm run dev`. A built-in dev API stores the theme in `.theme-data/theme.json` (git-ignored), so saving works locally with no setup.

## Files
| File | Change |
|---|---|
| `api/settings/theme.js` | NEW. GET/PUT `/api/settings/theme` (Vercel serverless function). Vercel Blob in production, local file in dev. |
| `src/theme/themeApi.js` | NEW (restored). Calls the API on the same site; no longer uses the main Render backend. |
| `src/theme/ThemeProvider.jsx` | Loads the saved theme from the API on start; Save applies, caches and PUTs to the API. |
| `src/pages/settings/ThemeSettings.jsx` | Error toast now includes the server's reason. |
| `vite.config.js` | Dev-only plugin serving the same API handler under `npm run dev`. |
| `vercel.json` | SPA rewrite no longer swallows `/api/*`. |
| `package.json` | Adds `@vercel/blob`. |
| `.env.example`, `.gitignore` | NEW / updated. |

## Notes
- **GET is public** (the login page needs the theme). **PUT needs a token.** The static Super Admin login's token is `static-superadmin-token`, accepted by default. That is weak protection: anyone who knows the string can change the theme. Better: set `AUTH_VERIFY_URL` (protected endpoint of your real backend) and `THEME_WRITE_TOKENS` in Vercel env vars.
- A new browser shows the default look for a moment, then switches to the saved theme after the API answers.
- Not testable here: the live Vercel Blob calls (no access to Vercel from my environment). Everything else (API logic, auth, validation, dev storage, build) was tested.

---

# marketplace-themed — CHANGES

## 0. Read this first

- The uploaded project is **one Vite + React app**, not two projects. Super Admin lives under `/admin/*` and Vendor under `/vendor/*`; both render inside the same `AdminLayout` → `Sidebar` + `Navbar` and share `components/common/ui/*`. So "vendor should match super admin" is already true at shell level, and the ThemeProvider is shared automatically (one provider in `main.jsx`).
- A theme system already existed (`pages/settings/ThemeContext.jsx`: 9 colours, 4 fonts, 3 radii, localStorage only). As requested it was **merged into a new central config** (`src/theme/`) and the old file was removed.
- **No backend is in the zip**, so no server code was written. The frontend has a GET/PUT layer with full fallbacks (see §5).
- Three questions were asked; only the third was answered. Defaults chosen for the other two:
  - Backend: frontend API layer + local fallback, server side documented in §5.
  - Dark mode: works for the shell, all shared `ui/` components, Settings, Login and any page that uses standard Tailwind greys/`bg-white`. Pages with their own hard-coded CSS are **not** converted (see §2.3).

## 1. Build result

- `npm install` → OK. `npm run build` → **passed** (Vite 7, ~14 s). Only the pre-existing "chunk larger than 500 kB" warning.
- No dependencies added. `package.json` and `package-lock.json` are unchanged.
- **Not verified in a real browser** (none available in my environment). Theme logic (validation, fallback, legacy migration, dark palette, all CSS variables) was unit-tested in Node and the compiled CSS was inspected, but **no visual/responsive check was done**. Please click through both panels once.

## 2. Mismatch analysis (vendor vs super admin)

### 2.1 Shared components (same for both panels)
Layout: `AdminLayout`, `Sidebar`, `Navbar`, `ProtectedAdminPage`. UI kit in `components/common/ui/`: Button, Input, Select, SearchInput, Modal, Drawer, ConfirmDialog, PageHeader, MetricCard, StatusBadge, EmptyState, ErrorState, Loader/Skeletons, Pagination.

### 2.2 Differences found
- Only 2 pages use the shared UI kit (`products/Products.jsx`, `products/AnalysReview.jsx`). Every other page builds its own header/table/buttons with inline Tailwind classes.
- Sidebar shows different items per role but is the same component.
- Hard-coded colours and page-local `<style>` blocks (Amazon-style CSS variables such as `--amz-blue`) exist in these **vendor-side** pages, so they keep their own look:
  `orders/Workspace`, `orders/OrderReport`, `orders/Resolveclaims`, `orders/ManageReturn`, `Finance/manageTaxes`, `Finance/managepayment`, `Finance/Financeworkspace`, `products/Researchproduct`, `products/workspace`, `vendor/Banner`, `vendor/AddBanner`, plus `categoryattribute/CategoryAttribute` (admin; route currently commented out) and `Superadmin/Productsales`.

### 2.3 What is and isn't done for Goal 1
- **Done:** shell (sidebar, header, footer, page background), shared UI kit, Login, Settings, and every page's `bg-white` / slate / stone / status tints now follow the theme, incl. dark mode.
- **Not done (needs a follow-up):** rewriting the ~12 pages above onto the shared UI kit / theme variables. They inherit the shell but their content area keeps its old colours and **will look wrong in dark mode**. This was left alone to respect "no unrequested refactoring" and because it touches business-heavy pages. `apply-theme.mjs` (already in your repo) can convert their gold hex colours to variables; it does not cover their other colours.

## 3. Files

### Created
| File | Reason |
|---|---|
| `src/theme/themeConfig.js` | Central theme: defaults, presets, validation/migration, theme → CSS variables, apply to `<html>`. |
| `src/theme/themeApi.js` | GET/PUT theme (separate axios instance so a bad theme route can never log the user out). |
| `src/theme/ThemeProvider.jsx` | Shared provider: cache → API → defaults; save, reset, light/dark mode. |
| `src/theme/theme.css` | Dark palette, table striped/bordered, card-shadow variable, `bg-white` → surface colour. |
| `src/theme/imageUpload.js` | Resize logo/favicon/login image in the browser to a data URL. |
| `src/pages/settings/ThemeSettings.jsx` | New Settings > Appearance UI: Branding, Colors, Typography, Layout, Theme, Footer tabs, live preview, save/discard/reset/import/export. |
| `src/components/common/Footer.jsx` | Footer from Settings > Footer. |
| `src/components/common/BrandLogo.jsx` | Logo from Settings > Branding, default icon fallback. |
| `CHANGES.md` | This file. |

### Changed
| File | Reason |
|---|---|
| `src/main.jsx` | Uses the new ThemeProvider; imports `theme.css`. |
| `src/index.css` | Tokens now point at theme variables; default values for all new variables; base font size/family/weights. |
| `src/components/common/AdminLayout.jsx` | Sidebar width, container width, footer, collapsed state. |
| `src/components/common/Sidebar.jsx` | Theme colours/width, logo + site name, collapsible icon rail. |
| `src/components/common/Navbar.jsx` | Header colours/height, collapse button, light/dark toggle. |
| `src/context/SidebarContext.jsx` | Adds collapsed state (default from Settings, personal toggle remembered). |
| `src/components/common/ui/Button.jsx` | Uses button colours, secondary colour, error colour, button style radius. |
| `src/components/common/ui/Modal.jsx`, `Drawer.jsx` | Surface / sidebar variables; overlay no longer depends on text colour (needed for dark mode). |
| `src/components/common/ui/StatusBadge.jsx`, `MetricCard.jsx`, `ErrorState.jsx` | Success / warning / error / primary variables instead of fixed Tailwind colours. |
| `src/pages/auth/Login.jsx` | Site name, logo, login image, footer text, button colours from theme. Default title changed from "Jajot Admin" to the site name ("Seller Hub"). |
| `src/pages/settings/Settings.jsx` | Old inline Appearance code removed; renders `ThemeSettings`. Other tabs unchanged. |

### Deleted
- `src/pages/settings/ThemeContext.jsx` (merged into `src/theme/`). Old localStorage theme (`admin-panel-theme`) is migrated automatically.

### Untouched
All other pages, `routes/*`, `services/*`, `config/*`, `data/*`, `utils/*`, `components/common/ui/{Input,Select,SearchInput,Pagination,PageHeader,EmptyState,Loader,ConfirmDialog}.jsx` (they already read theme tokens), build config, `apply-theme.mjs`, `review_tail.tmp`, `.agents/` (empty).

## 4. Setup
```bash
npm install
# optional env
#   VITE_API_BASE_URL=https://your-api          (existing)
#   VITE_THEME_SETTINGS_PATH=/api/settings/theme (new, this is the default)
npm run dev      # development
npm run build    # production build → dist/
```
No DB migration is needed on the frontend. See §5 for the server side.

## 5. Backend changes (minimal) — NOT included, you need to add them
The frontend calls:
- `GET  {VITE_THEME_SETTINGS_PATH}` → theme JSON (also accepted: `{ theme }` or `{ data: theme }`). Should be **public** so the sign-in page can be themed.
- `PUT  {VITE_THEME_SETTINGS_PATH}` with body `{ "theme": {...} }` → super admin only.

Store it as one document/row, e.g. key `theme`, JSON value. Example (Express + Mongoose — adapt to your stack):
```js
const Setting = mongoose.model("Setting", new mongoose.Schema({ key: { type: String, unique: true }, value: {} }));
router.get("/api/settings/theme", async (req, res) => {
  const doc = await Setting.findOne({ key: "theme" });
  res.json({ theme: doc?.value || null });
});
router.put("/api/settings/theme", requireSuperAdmin, async (req, res) => {
  await Setting.findOneAndUpdate({ key: "theme" }, { value: req.body.theme }, { upsert: true });
  res.json({ ok: true });
});
```
Two things to watch:
1. **Body size.** Uploaded logo / favicon / login image are stored as data URLs inside the theme JSON (≈ 20–250 KB). Raise the JSON limit, e.g. `express.json({ limit: "2mb" })`.
2. **Auth.** Super Admin login in `Login.jsx` is static (`static-superadmin-token`), so a real backend will not accept it for the PUT. Until that is replaced or the route accepts it, saving works on the device but the app will report "server didn't accept the save".

**Upload mechanism:** the frontend has no upload API to reuse, so images are resized in the browser (logo 256 px, favicon 64 px, login image 1400 px) and saved in the theme. A plain `https://` URL can be pasted instead. If you later add an upload endpoint, only `src/theme/imageUpload.js` needs to change.

**Fallback behaviour:** if GET fails → device copy (localStorage `panel-theme-v2`) → built-in defaults. If PUT fails → theme still applies on that device and the user is told.

## 6. Theme variables (all on `:root`; colours are `R G B` channels so `rgb(var(--x)/0.5)` works)
| Variable | Meaning / Settings field |
|---|---|
| `--brand`, `--brand-dark`, `--brand-line`, `--brand-text` | Primary, primary dark end, accent, accent text |
| `--secondary`, `--secondary-text` | Secondary buttons (text colour is auto-picked) |
| `--ink` | Main text colour (light: Text colour; dark: fixed light) |
| `--page-bg`, `--card-bg`, `--border`, `--stripe` | Page background, card/table/modal surface, borders, striped rows |
| `--header-bg`, `--header-text` | Top bar |
| `--sidebar-bg`, `--sidebar-text` | Sidebar (same in light and dark) |
| `--btn-bg`, `--btn-bg-hover`, `--btn-text` | Primary buttons |
| `--success`, `--warning`, `--danger` (+ `-text`) | Status colours and their readable text tone |
| `--a1…a3` (+ `-dark`, `-f1…f3`, `-b1`, `-b2`, `-text`) | Three card/chart palettes |
| `--brand-hover/light/lighter/on-dark`, `--tint-50…300`, `--hero-a/b/c`, `--p4-b1/b2` | Tints derived from the primary (existing) |
| `--font-display`, `--font-body` | Heading font, body font |
| `--font-size-base` | Root font size; all rem text scales |
| `--heading-weight`, `--body-weight` | Font weights |
| `--sidebar-w`, `--sidebar-w-collapsed`, `--header-h`, `--container-w` | Layout sizes |
| `--spacing` | Tailwind spacing unit → Compact (0.21rem) / Comfortable (0.25rem) |
| `--radius-card`, `--radius-control`, `--radius-btn` | Corner style; button shape (rounded / pill / square) |
| `--shadow-card`, `--shadow-card-hover` | Card shadow (none / soft / strong) |

Attributes on `<html>`: `data-theme="light|dark"`, `data-table="plain|striped|bordered"`.
Dark mode: page/card/border colours are derived from the sidebar colour; the sun/moon toggle is remembered per browser (`panel-color-mode`) and can be hidden in Settings > Theme.

## 7. Final checklist
| Item | Status |
|---|---|
| Theme change reflects in both panels | Shared provider + variables; **not visually verified** |
| Reset to default | Implemented (confirms, then saves defaults); logic tested, UI not clicked |
| API-fail fallback | Implemented and reasoned through; not tested against a live failing API |
| Dark / light | Works for shell, ui kit, Settings, Login; **12 pages with own CSS are not converted (§2.3)** |
| Mobile / tablet / desktop | Existing responsive layout kept, sidebar drawer unchanged; **not visually verified** |
| Build | **Passed** |
| CHANGES.md | This file |

Known limits: base font size preview in Settings shows the real size only after saving (rem is root-based); heading weight/size applies to `h1–h3` only; page-local hard-coded colours are unaffected by theme changes.
