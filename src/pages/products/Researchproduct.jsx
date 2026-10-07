import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, X, Compass, Camera, Radio, TestTube, BatteryCharging, FlaskConical, Microscope, Layers, Store } from "lucide-react";

/* =========================================================
   NO MOCK DATA — every call below hits the real API only.
   If a request fails, the UI shows an explicit error instead
   of substituting fake products.
   ========================================================= */

const API_BASE = "https://amazon-multi-vendor-3.onrender.com";

// Icons are assigned round-robin to whatever real category names the API
// returns — we no longer guess fixed category names ourselves.
const ICON_CYCLE = [Compass, Camera, Radio, TestTube, BatteryCharging, FlaskConical];
function iconForCategory(name, categoryList) {
  const names = (categoryList || []).map((c) => (c && c.name != null ? c.name : c));
  const idx = Math.max(0, names.indexOf(name));
  return ICON_CYCLE[idx % ICON_CYCLE.length];
}

function stockLabel(stock) {
  const s = Number(stock);
  if (!Number.isFinite(s)) return { cls: "in", text: "—" };
  if (s <= 0) return { cls: "out", text: "Out of stock" };
  if (s < 6) return { cls: "low", text: "Low · " + s + " left" };
  return { cls: "in", text: "In stock · " + s };
}

/* ---------- API layer — real data only, errors are surfaced, not hidden ---------- */
function useApi(apiBase, setUsingLive) {
  const apiGet = useCallback(
    async (path, params) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const url = apiBase + path + qs;
      let res;
      try {
        res = await fetch(url);
      } catch (e) {
        setUsingLive(false);
        throw new Error(`Couldn't reach the API at ${url} (${e.message}). If this is a Render.com free-tier service it may be asleep — try again in ~30s.`);
      }
      if (!res.ok) {
        setUsingLive(false);
        throw new Error(`API returned ${res.status} ${res.statusText} for ${path}`);
      }
      setUsingLive(true);
      try {
        return await res.json();
      } catch (e) {
        throw new Error(`API response for ${path} wasn't valid JSON`);
      }
    },
    [apiBase, setUsingLive]
  );

  return {
    loadProducts: () => apiGet("/api/products"),
    searchProducts: (q) => apiGet("/api/products/search", { q }),
    categoryFilter: (categoryId) => apiGet("/api/products/filters/" + encodeURIComponent(categoryId)),
    advancedFilters: (params) => apiGet("/api/products/filters", params),
    vendorFilter: (vendorId) => apiGet("/api/products/vendor/" + encodeURIComponent(vendorId)),
    inventoryFilter: (vendorId) => apiGet("/api/products/inventory/vendor/" + encodeURIComponent(vendorId)),
    productDetails: (productId) => apiGet("/api/products/" + encodeURIComponent(productId)),
    recommendations: (divid) => apiGet("/api/products/recommendations/" + encodeURIComponent(divid)),
    loadCategories: () => apiGet("/api/categories"),
  };
}

/* ---------- Response normalization for the real API schema ---------- */
// Different endpoints wrap list responses differently — handle the shapes
// this API actually uses ({success, category:{...}}, {success, data:[...]}, etc).
function unwrapArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.categories)) return payload.categories;
  if (Array.isArray(payload.subCategories)) return payload.subCategories;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}
function unwrapObject(payload) {
  if (!payload) return null;
  if (payload.product) return payload.product;
  if (payload.category) return payload.category;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  return payload;
}

// Coerces a possibly-string, possibly-currency-prefixed value ("₹1,299") into
// a real number. Returns NaN if nothing numeric is present.
function toNumber(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
// Returns the first candidate that parses to a number > 0.
function firstPositive(...vals) {
  for (const v of vals) {
    const n = toNumber(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
// Returns the first candidate that parses to any finite number (0 is valid —
// it means genuinely out of stock, not "missing").
function firstFinite(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const n = toNumber(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
function variantPrice(v) {
  return firstPositive(v?.offer?.salePrice, v?.offer?.price, v?.sellingPrice, v?.salePrice, v?.price, v?.finalPrice, v?.mrp, v?.cost);
}
function variantStock(v) {
  return firstFinite(v?.inventory?.stock, v?.stock, v?.quantity, v?.qty);
}

// Real product documents (per the API sheet) nest price/stock inside
// variants[].offer / variants[].inventory rather than at the top level.
// This reads the real nested fields — it never invents a value.
function normalizeProduct(raw, categoryMap) {
  if (!raw) return null;
  const variants = Array.isArray(raw.variants) ? raw.variants : [];
  const firstVariant = variants[0] || {};

  const variantPrices = variants.map(variantPrice).filter((n) => n > 0);
  const price = variantPrices.length
    ? Math.min(...variantPrices)
    : firstPositive(raw.price, raw.sellingPrice, raw.salePrice, raw.finalPrice, raw.mrp, raw.offer?.salePrice, raw.offer?.price, raw.cost, raw.amount);

  const stock = variants.length
    ? variants.reduce((sum, v) => sum + variantStock(v), 0)
    : firstFinite(raw.stock, raw.inventory?.stock, raw.quantity, raw.qty);

  const vendorObj = raw.vendorId && typeof raw.vendorId === "object" ? raw.vendorId : null;
  const vendorIdRaw = vendorObj?._id ?? raw.vendorId ?? raw.vendor_id ?? "";

  const categoryObj = raw.categoryId && typeof raw.categoryId === "object" ? raw.categoryId : null;
  const categoryIdRaw = categoryObj?._id ?? raw.categoryId ?? "";
  const category =
    categoryObj?.name ?? (categoryMap && categoryMap.get(categoryIdRaw)) ?? (typeof raw.categoryId === "string" ? raw.categoryId : "Uncategorized");

  const pd = raw.productDetails || {};
  const dims = raw.dimensions || {};
  const specs = {};
  if (raw.brandName) specs.Brand = raw.brandName;
  if (pd.material) specs.Material = pd.material;
  if (pd.manufacturer) specs.Manufacturer = pd.manufacturer;
  if (pd.modelNumber) specs["Model number"] = pd.modelNumber;
  if (dims.itemWeight) specs.Weight = `${dims.itemWeight} ${dims.itemWeightUnit || "g"}`;
  if (dims.itemDimensions) {
    const d = dims.itemDimensions;
    specs.Dimensions = `${d.length ?? "—"} × ${d.width ?? "—"} × ${d.height ?? "—"} cm`;
  }
  if (raw.safetyCompliance?.countryRegionOfOrigin) specs["Country of origin"] = raw.safetyCompliance.countryRegionOfOrigin;
  if (raw.packaging?.packagingType) specs.Packaging = raw.packaging.packagingType;

  const image =
    (Array.isArray(raw.images) && raw.images[0]) ||
    (Array.isArray(firstVariant.images) && firstVariant.images[0]) ||
    raw.image ||
    null;

  return {
    id: raw._id ?? raw.id ?? raw.productId,
    sku: firstVariant.sku ?? raw.externalProductId ?? raw.sku ?? "",
    title: raw.productName ?? raw.name ?? raw.title ?? "Untitled",
    category,
    categoryId: categoryIdRaw,
    vendorId: vendorIdRaw,
    vendor: vendorObj?.companyname ?? vendorObj?.name ?? vendorObj?.email ?? (typeof raw.vendorId === "string" ? raw.vendorId : "Unknown vendor"),
    price,
    currency: raw.currency ?? "INR",
    rating: Number(raw.rating ?? raw.avgRating ?? 0),
    stock,
    description: raw.description?.productDescription ?? raw.description ?? "",
    bulletPoints: raw.description?.bulletPoints ?? [],
    specs,
    image,
    variants,
    _raw: raw,
  };
}
function normalizeProducts(payload, categoryMap) {
  return unwrapArray(payload)
    .map((raw) => normalizeProduct(raw, categoryMap))
    .filter(Boolean);
}
function normalizeCategory(raw) {
  if (!raw) return null;
  return { id: raw._id ?? raw.id, name: raw.name ?? raw.title ?? "Unnamed category" };
}
function normalizeCategories(payload) {
  return unwrapArray(payload).map(normalizeCategory).filter(Boolean);
}

function currencySymbol(code) {
  if (code === "INR") return "₹";
  if (code === "USD") return "$";
  if (code === "EUR") return "€";
  return (code || "") + " ";
}
function formatPrice(p) {
  return currencySymbol(p.currency) + Number(p.price || 0).toLocaleString("en-IN");
}

/* =========================================================
   COMPONENT
   ========================================================= */
export default function ProductResearchPage() {
  const [usingLive, setUsingLive] = useState(false);
  const api = useApi(API_BASE, setUsingLive);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("Full catalog");
  const [sub, setSub] = useState("—");

  const [allProducts, setAllProducts] = useState([]);

  const [activeCategory, setActiveCategory] = useState("");
  const [activeVendor, setActiveVendor] = useState("");
  const [inventoryOnly, setInventoryOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [minRating, setMinRating] = useState("0");
  const [sort, setSort] = useState("relevance");
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [recs, setRecs] = useState(null);

  const [categoriesList, setCategoriesList] = useState([]); // [{id, name}] from /api/categories

  // Fetch the real category list once so category filters use real IDs and
  // display real names, instead of guessing from product data alone.
  useEffect(() => {
    (async () => {
      try {
        const cats = normalizeCategories(await api.loadCategories());
        setCategoriesList(cats);
      } catch (e) {
        // Non-fatal: the sidebar falls back to categories derived from products.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryMap = useMemo(() => {
    const m = new Map();
    categoriesList.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categoriesList]);

  // Categories shown in the sidebar: prefer the real /api/categories list;
  // fall back to whatever categories/IDs actually appear on loaded products.
  const categories = useMemo(() => {
    if (categoriesList.length) return categoriesList;
    const map = new Map();
    allProducts.forEach((p) => {
      const key = p.categoryId || p.category;
      if (key && !map.has(key)) map.set(key, { id: p.categoryId || p.category, name: p.category });
    });
    return Array.from(map.values());
  }, [categoriesList, allProducts]);

  const vendors = useMemo(() => {
    const map = new Map();
    allProducts.forEach((p) => {
      const key = p.vendorId || p.vendor;
      if (key && !map.has(key)) map.set(key, { id: p.vendorId || p.vendor, name: p.vendor });
    });
    return Array.from(map.values());
  }, [allProducts]);

  const categoryCounts = useMemo(() => {
    const m = {};
    categories.forEach((c) => {
      m[c.id] = allProducts.filter((p) => p.categoryId === c.id || p.category === c.id || p.category === c.name).length;
    });
    return m;
  }, [categories, allProducts]);

  const runLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = normalizeProducts(await api.loadProducts(), categoryMap);
      setResults(data);
      setAllProducts(data);
      setTitle("Full catalog");
      setSub(data.length + " items");
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }, [api, categoryMap]);

  useEffect(() => {
    runLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* search (debounced) */
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) return; // handled by clearing filters explicitly
      setLoading(true);
      setError(null);
      try {
        const data = normalizeProducts(await api.searchProducts(query.trim()), categoryMap);
        setResults(data);
        setTitle(`Search — "${query.trim()}"`);
        setSub(data.length + " results");
      } catch (e) {
        setError(e.message);
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function pickCategory(categoryId) {
    setQuery("");
    setActiveCategory(categoryId);
    setLoading(true);
    setError(null);
    const cName = categories.find((c) => c.id === categoryId)?.name || categoryId;
    try {
      if (!categoryId) {
        const data = normalizeProducts(await api.loadProducts(), categoryMap);
        setResults(data);
        setTitle("Full catalog");
        setSub(data.length + " items");
      } else {
        const data = normalizeProducts(await api.categoryFilter(categoryId), categoryMap);
        setResults(data);
        setTitle(cName);
        setSub(data.length + " items");
      }
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }

  async function pickVendor(vendorId) {
    setActiveVendor(vendorId);
    setLoading(true);
    setError(null);
    const vName = vendors.find((v) => v.id === vendorId)?.name || vendorId;
    try {
      if (!vendorId) {
        const data = normalizeProducts(await api.loadProducts(), categoryMap);
        setResults(data);
        setTitle("Full catalog");
        setSub(data.length + " items");
      } else if (inventoryOnly) {
        const data = normalizeProducts(await api.inventoryFilter(vendorId), categoryMap);
        setResults(data);
        setTitle(vName + " — in stock");
        setSub(data.length + " items");
      } else {
        const data = normalizeProducts(await api.vendorFilter(vendorId), categoryMap);
        setResults(data);
        setTitle(vName);
        setSub(data.length + " items");
      }
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }

  async function toggleInventory() {
    const next = !inventoryOnly;
    setInventoryOnly(next);
    if (!activeVendor) return;
    setLoading(true);
    setError(null);
    const vName = vendors.find((v) => v.id === activeVendor)?.name || activeVendor;
    try {
      if (next) {
        const data = normalizeProducts(await api.inventoryFilter(activeVendor), categoryMap);
        setResults(data);
        setTitle(vName + " — in stock");
        setSub(data.length + " items");
      } else {
        const data = normalizeProducts(await api.vendorFilter(activeVendor), categoryMap);
        setResults(data);
        setTitle(vName);
        setSub(data.length + " items");
      }
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }

  async function applyAdvanced() {
    setLoading(true);
    setError(null);
    try {
      const data = normalizeProducts(await api.advancedFilters({ maxPrice, minRating }), categoryMap);
      setResults(data);
      setTitle("Filtered results");
      setSub(data.length + " items matching your filters");
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }

  async function clearAll() {
    setActiveCategory("");
    setActiveVendor("");
    setInventoryOnly(false);
    setMaxPrice(3000);
    setMinRating("0");
    setQuery("");
    await runLoad();
  }

  async function openProduct(id) {
    setSelectedId(id);
    setSelectedProduct(null);
    setModalError(null);
    setRecs(null);
    try {
      const p = normalizeProduct(unwrapObject(await api.productDetails(id)), categoryMap);
      setSelectedProduct(p);
      if (p) {
        try {
          const r = normalizeProducts(await api.recommendations(id), categoryMap);
          setRecs(r);
        } catch (e) {
          setRecs([]);
        }
      }
    } catch (e) {
      setModalError(e.message);
    }
  }
  function closeModal() {
    setSelectedId(null);
    setSelectedProduct(null);
    setModalError(null);
    setRecs(null);
  }

  const sortedResults = useMemo(() => {
    const arr = [...results];
    if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
    else if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    return arr;
  }, [results, sort]);

  return (
    <div className="prp-root">
      <style>{CSS}</style>

      <header className="prp-top">
        <div className="prp-brand">
          <span className="prp-mark">Field Index</span>
        </div>

        <div className="prp-search-wrap">
          <div className="prp-search-box">
            <Search size={15} strokeWidth={2} />
            <input
              placeholder="Search by product name, SKU, brand or vendor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className={"prp-pill " + (usingLive ? "live" : "preview")}>
            {usingLive ? "● Connected to API" : "○ API unreachable"}
          </span>
        </div>
      </header>

      {/* Hero — same look as Dashboard / Inventory / Attributes */}
      <section className="prp-hero">
        <span className="prp-goldline prp-goldline-hero" />
        <div className="prp-hero-text">
          <p className="prp-hero-kicker">
            <Microscope size={14} strokeWidth={1.6} />
            Product research
          </p>
          <h2 className="prp-hero-title">Compare products before you decide</h2>
          <p className="prp-hero-copy">
            Search the catalog, narrow it by category, vendor, price and rating, then open any product to read its specifications and see similar items side by side.
          </p>
        </div>
        <div className="prp-glance">
          <div className="prp-glance-stat">
            <Layers size={18} strokeWidth={1.5} />
            <div>
              <strong>{loading && !allProducts.length ? "—" : allProducts.length}</strong>
              <span>products indexed</span>
            </div>
          </div>
          <div className="prp-glance-stat">
            <Compass size={18} strokeWidth={1.5} />
            <div>
              <strong>{categories.length || "—"}</strong>
              <span>categories</span>
            </div>
          </div>
          <div className="prp-glance-stat">
            <Store size={18} strokeWidth={1.5} />
            <div>
              <strong>{vendors.length || "—"}</strong>
              <span>vendors</span>
            </div>
          </div>
        </div>
      </section>

      <div className="prp-grid-shell">
        <aside className="prp-filters">
          <div className="prp-fblock">
            <h3>Category</h3>
            <div className="prp-flist">
              <div className={"prp-frow" + (activeCategory === "" ? " active" : "")} onClick={() => pickCategory("")}>
                All categories <span className="prp-count">{allProducts.length}</span>
              </div>
              {categories.length === 0 ? (
                <div className="prp-empty-sub" style={{ padding: "6px 8px" }}>No categories loaded yet.</div>
              ) : (
                categories.map((c) => (
                  <div
                    key={c.id}
                    className={"prp-frow" + (activeCategory === c.id ? " active" : "")}
                    onClick={() => pickCategory(c.id)}
                  >
                    {c.name} <span className="prp-count">{categoryCounts[c.id]}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="prp-fblock">
            <h3>Vendor</h3>
            <select value={activeVendor} onChange={(e) => pickVendor(e.target.value)}>
              <option value="">All vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="prp-fblock">
            <h3>Availability</h3>
            <div className={"prp-toggle" + (inventoryOnly ? " on" : "")} onClick={toggleInventory}>
              <span>In stock only (selected vendor)</span>
              <span className="prp-switch" />
            </div>
          </div>

          <div className="prp-fblock">
            <h3>Price & rating</h3>
            <div className="prp-range-row">
              <span className="prp-range-label">Max</span>
              <input
                type="range"
                min="0"
                max="3000"
                step="50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
              />
              <span className="prp-range-val">₹{maxPrice}</span>
            </div>
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} style={{ marginTop: 10, marginBottom: 10 }}>
              <option value="0">Any rating</option>
              <option value="3">3★ and up</option>
              <option value="4">4★ and up</option>
              <option value="4.5">4.5★ and up</option>
            </select>
            <button className="prp-apply-btn" onClick={applyAdvanced}>
              Apply filters
            </button>
            <button className="prp-clear-btn" onClick={clearAll}>
              Reset all filters
            </button>
          </div>
        </aside>

        <main className="prp-main">
          <div className="prp-main-head">
            <div>
              <h1>{title}</h1>
              <div className="prp-sub">{sub}</div>
            </div>
            <div className="prp-sort-row">
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingRow label="Fetching results…" />
          ) : error ? (
            <div className="prp-empty">
              <Search size={30} strokeWidth={1.6} />
              <div>Couldn't load real data from the API.</div>
              <div className="prp-empty-sub">{error}</div>
              <button className="prp-apply-btn" style={{ maxWidth: 220, margin: "14px auto 0" }} onClick={runLoad}>
                Retry
              </button>
            </div>
          ) : sortedResults.length === 0 ? (
            <div className="prp-empty">
              <Search size={30} strokeWidth={1.6} />
              <div>No products match these filters.</div>
              <div className="prp-empty-sub">Try widening the price range or resetting a filter.</div>
            </div>
          ) : (
            <div className="prp-cardgrid">
              {sortedResults.map((p) => {
                const st = stockLabel(p.stock);
                const Icon = iconForCategory(p.category, categories);
                return (
                  <div key={p.id} className="prp-card" onClick={() => openProduct(p.id)}>
                    <div className="prp-card-icon">
                      {p.image ? (
                        <img src={p.image} alt={p.title} className="prp-card-img" onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <Icon size={36} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="prp-card-body">
                      <div className="prp-card-sku">{p.sku}</div>
                      <div className="prp-card-title">{p.title}</div>
                      <div className="prp-card-vendor">{p.vendor}</div>
                      <div className="prp-card-foot">
                        <span className="prp-card-price">{formatPrice(p)}</span>
                        <span className={"prp-stock " + st.cls}>{st.text}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedId && (
        <div className="prp-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="prp-modal">
            {modalError ? (
              <div className="prp-empty" style={{ padding: 40 }}>
                <Search size={30} strokeWidth={1.6} />
                <div>Couldn't load this product from the API.</div>
                <div className="prp-empty-sub">{modalError}</div>
                <button className="prp-close-btn" style={{ margin: "16px auto 0" }} onClick={closeModal} aria-label="Close">
                  <X size={15} />
                </button>
              </div>
            ) : !selectedProduct ? (
              <LoadingRow label="Loading specifications…" padded />
            ) : (
              <ModalBody product={selectedProduct} recs={recs} categories={categories} onClose={closeModal} onOpen={openProduct} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingRow({ label, padded }) {
  return (
    <div className="prp-loading" style={padded ? { padding: 40 } : undefined}>
      <span className="prp-dot" />
      <span className="prp-dot" />
      <span className="prp-dot" />
      {label}
    </div>
  );
}

function ModalBody({ product: p, recs, categories, onClose, onOpen }) {
  const st = stockLabel(p.stock);
  const Icon = iconForCategory(p.category, categories || []);
  const specEntries = p.specs && typeof p.specs === "object" ? Object.entries(p.specs) : [];
  return (
    <>
      <span className="prp-goldline prp-goldline-modal" />
      <div className="prp-modal-head">
        <div>
          <div className="prp-modal-sku">{p.sku}</div>
          <h2>{p.title}</h2>
          <div className="prp-modal-vendor">
            {p.vendor} · <span className={"prp-stock " + st.cls} style={{ marginLeft: 4 }}>{st.text}</span>
          </div>
        </div>
        <button className="prp-close-btn" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </div>
      <div className="prp-modal-body">
        <div className="prp-modal-icon">
          {p.image ? (
            <img src={p.image} alt={p.title} className="prp-modal-img" onError={(e) => { e.target.style.display = "none"; }} />
          ) : (
            <Icon size={40} strokeWidth={1.4} />
          )}
        </div>
        {p.description && <p className="prp-modal-desc">{p.description}</p>}
        {Array.isArray(p.bulletPoints) && p.bulletPoints.length > 0 && (
          <ul className="prp-modal-bullets">
            {p.bulletPoints.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        <h3 className="prp-section-h">Specifications</h3>
        <table className="prp-spec-table">
          <tbody>
            {specEntries.map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
            {p.rating > 0 && (
              <tr>
                <td>Rating</td>
                <td>{p.rating} / 5</td>
              </tr>
            )}
            <tr>
              <td>Category</td>
              <td>{p.category}</td>
            </tr>
          </tbody>
        </table>
        <div className="prp-modal-buy">
          <span className="prp-modal-price">{formatPrice(p)}</span>
          <button className="prp-modal-cta">Add to research list</button>
        </div>

        <div className="prp-rec-section">
          <h3 className="prp-section-h">Compare with similar products</h3>
          {recs === null ? (
            <LoadingRow label="Finding similar products…" />
          ) : recs.length === 0 ? (
            <div className="prp-empty-sub" style={{ textAlign: "left" }}>No similar products found.</div>
          ) : (
            <div className="prp-rec-grid">
              {recs.map((r) => (
                <div key={r.id} className="prp-rec-card" onClick={() => onOpen(r.id)}>
                  <div className="prp-rec-title">{r.title}</div>
                  <div className="prp-rec-price">{formatPrice(r)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   THEME — driven by the same CSS variables as Dashboard,
   Inventory and Attributes (--brand, --hero-*, --tint-*, etc.).
   Fallback values are used only if a variable isn't defined.
   ========================================================= */
const CSS = `
.prp-root{
  --accent: rgb(var(--brand, 180 120 20));
  --accent-dark: rgb(var(--brand-dark, 140 90 10));
  --accent-text: rgb(var(--brand-text, 140 90 10));
  --accent-soft: rgb(var(--tint-100, 250 243 224));
  --accent-dim: rgb(var(--brand-line, 200 160 80) / 0.55);
  --line: rgb(var(--brand-line, 200 160 80));
  --bg: rgb(var(--page-bg, 247 245 240));
  --surface:#ffffff; --surface-sunken:#f7f5f0; --border:#e7e5e4; --border-soft:#f1efec;
  --ink:#0f172a; --ink-dim:#475569; --ink-faint:#94a3b8;
  --amber:#92400e; --amber-soft:#fef3c7;
  --rust:#9f1239; --rust-soft:#ffe4e6;
  --ok:#065f46; --ok-soft:#d1fae5;
  --radius-c: var(--radius-card, 14px); --radius-k: var(--radius-control, 8px);
  --display: var(--font-display, Georgia, serif);
  color:var(--ink); background:var(--bg);
  min-height:100vh; display:flex; flex-direction:column;
}
.prp-root *{ box-sizing:border-box; }
.prp-root select, .prp-root input, .prp-root button{ font-family:inherit; }
.prp-root button:focus-visible, .prp-root select:focus-visible, .prp-frow:focus-visible{ outline:2px solid var(--line); outline-offset:2px; }

.prp-goldline{ position:absolute; top:0; height:1px; pointer-events:none; background:linear-gradient(to right, transparent, var(--line), transparent); }
.prp-goldline-hero{ left:64px; right:64px; }
.prp-goldline-modal{ left:32px; right:32px; z-index:1; }

.prp-top{ display:flex; align-items:center; gap:24px; padding:14px 28px; background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:40; }
.prp-brand{ white-space:nowrap; }
.prp-mark{ font-family:var(--display); font-weight:600; font-size:22px; }
.prp-search-wrap{ flex:1; display:flex; align-items:center; gap:10px; max-width:640px; }
.prp-search-box{ flex:1; display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid #d6d3d1; border-radius:var(--radius-k); padding:9px 12px; color:var(--ink-faint); transition:border-color .15s; }
.prp-search-box:focus-within{ border-color:var(--accent); box-shadow:0 0 0 1px var(--accent); }
.prp-search-box input{ flex:1; background:transparent; border:none; outline:none; color:var(--ink); font-size:13.5px; }
.prp-search-box input::placeholder{ color:var(--ink-faint); }
.prp-pill{ font-size:11.5px; font-weight:500; padding:5px 10px; border-radius:var(--radius-k); border:1px solid var(--border); color:var(--ink-dim); white-space:nowrap; }
.prp-pill.live{ color:var(--ok); border-color:#a7f3d0; background:var(--ok-soft); }
.prp-pill.preview{ color:var(--amber); border-color:#fcd34d; background:var(--amber-soft); }

.prp-hero{ position:relative; overflow:hidden; display:flex; align-items:flex-end; justify-content:space-between; gap:28px; flex-wrap:wrap; max-width:1400px; width:calc(100% - 56px); margin:20px auto 0; padding:32px 36px; border-radius:var(--radius-c); background:linear-gradient(135deg, rgb(var(--hero-a, 253 248 235)), rgb(var(--hero-b, 250 240 215)), rgb(var(--hero-c, 247 232 195))); box-shadow:0 0 0 1px rgb(var(--brand-line, 200 160 80) / 0.4); }
.prp-hero-text{ max-width:620px; }
.prp-hero-kicker{ display:inline-flex; align-items:center; gap:8px; margin:0; font-size:13.5px; font-weight:500; color:var(--accent-dark); }
.prp-hero-title{ margin:8px 0 0; font-family:var(--display); font-weight:600; font-size:32px; line-height:1.12; letter-spacing:-0.01em; color:var(--ink); }
.prp-hero-copy{ margin:10px 0 0; font-size:13.5px; line-height:1.6; color:#475569; }
.prp-glance{ display:flex; }
.prp-glance-stat{ display:flex; align-items:center; gap:12px; padding:0 20px; border-left:1px solid rgb(var(--brand-line, 200 160 80) / 0.4); color:var(--accent-text); }
.prp-glance-stat:first-child{ padding-left:0; border-left:none; }
.prp-glance-stat:last-child{ padding-right:0; }
.prp-glance-stat strong{ display:block; font-family:var(--display); font-size:26px; line-height:1; font-weight:600; color:var(--ink); font-variant-numeric:tabular-nums; }
.prp-glance-stat span{ display:block; margin-top:4px; font-size:12px; color:#64748b; }

.prp-grid-shell{ flex:1; display:grid; grid-template-columns:260px 1fr; max-width:1400px; width:100%; margin:0 auto; }
.prp-filters{ border-right:1px solid var(--border); padding:24px 20px 60px 28px; }
.prp-fblock{ margin-bottom:26px; }
.prp-fblock h3{ font-size:13px; font-weight:600; color:var(--ink); margin:0 0 10px; }
.prp-flist{ display:flex; flex-direction:column; gap:2px; }
.prp-frow{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 9px; border-radius:var(--radius-k); cursor:pointer; font-size:13px; color:var(--ink-dim); border:1px solid transparent; transition:background .15s, color .15s; }
.prp-frow:hover{ background:var(--surface-sunken); color:var(--ink); }
.prp-frow.active{ background:var(--accent-soft); color:var(--accent-text); border-color:var(--accent-dim); font-weight:600; }
.prp-count{ font-size:11.5px; color:var(--ink-faint); font-variant-numeric:tabular-nums; }
.prp-frow.active .prp-count{ color:var(--accent-text); }
.prp-range-row{ display:flex; align-items:center; gap:8px; }
.prp-range-row input[type=range]{ flex:1; accent-color:var(--accent); }
.prp-range-label{ font-size:12px; color:var(--ink-faint); width:30px; }
.prp-range-val{ font-size:12px; color:var(--ink-dim); width:58px; text-align:right; font-variant-numeric:tabular-nums; }
.prp-root select{ width:100%; background:var(--surface); border:1px solid #d6d3d1; color:var(--ink); border-radius:var(--radius-k); padding:8px 10px; font-size:13px; }
.prp-root select:focus{ outline:none; border-color:var(--accent); box-shadow:0 0 0 1px var(--accent); }
.prp-toggle{ display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer; background:var(--surface); border:1px solid #d6d3d1; border-radius:var(--radius-k); padding:9px 10px; font-size:13px; color:var(--ink-dim); }
.prp-switch{ width:32px; height:18px; border-radius:20px; background:#d6d3d1; position:relative; flex-shrink:0; transition:background .15s; }
.prp-switch::after{ content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.2); transition:left .15s; }
.prp-toggle.on{ border-color:var(--accent-dim); color:var(--accent-text); }
.prp-toggle.on .prp-switch{ background:var(--accent); }
.prp-toggle.on .prp-switch::after{ left:16px; }
.prp-apply-btn{ width:100%; background:linear-gradient(135deg, var(--accent), var(--accent-dark)); color:#fff; border:none; border-radius:var(--radius-k); padding:10px; font-weight:600; font-size:13px; cursor:pointer; margin-top:10px; transition:opacity .15s; }
.prp-apply-btn:hover{ opacity:.9; }
.prp-clear-btn{ width:100%; background:var(--surface); color:var(--ink-dim); border:1px solid #d6d3d1; border-radius:var(--radius-k); padding:8px; font-size:12.5px; cursor:pointer; margin-top:8px; transition:color .15s, border-color .15s; }
.prp-clear-btn:hover{ color:var(--rust); border-color:var(--rust); }

.prp-main{ padding:24px 28px 80px; }
.prp-main-head{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
.prp-main-head h1{ font-family:var(--display); font-weight:600; font-size:22px; margin:0; }
.prp-sub{ font-size:12.5px; color:var(--ink-dim); margin-top:2px; font-variant-numeric:tabular-nums; }
.prp-sort-row{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--ink-dim); }
.prp-sort-row select{ width:auto; padding:6px 8px; font-size:12.5px; }

.prp-cardgrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:16px; }
.prp-card{ position:relative; background:var(--surface); box-shadow:0 0 0 1px #e7e5e4; border-radius:var(--radius-c); cursor:pointer; overflow:hidden; display:flex; flex-direction:column; transition:box-shadow .15s; }
.prp-card:hover{ box-shadow:0 0 0 1px var(--accent-dim), 0 6px 16px rgba(15,23,42,.07); }
.prp-card-icon{ height:112px; display:flex; align-items:center; justify-content:center; background:var(--surface-sunken); border-bottom:1px solid var(--border-soft); color:var(--accent-dim); overflow:hidden; }
.prp-card-img{ width:100%; height:100%; object-fit:cover; }
.prp-card-body{ padding:12px 14px 14px; display:flex; flex-direction:column; gap:5px; flex:1; }
.prp-card-sku{ font-size:11px; color:var(--ink-faint); }
.prp-card-title{ font-size:14px; font-weight:600; line-height:1.3; color:var(--ink); }
.prp-card-vendor{ font-size:12px; color:var(--ink-dim); }
.prp-card-foot{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto; padding-top:8px; }
.prp-card-price{ font-family:var(--display); font-size:17px; color:var(--accent-text); font-weight:600; font-variant-numeric:tabular-nums; }
.prp-stock{ font-size:11px; font-weight:500; padding:2px 7px; border-radius:var(--radius-k); }
.prp-stock.in{ background:var(--ok-soft); color:var(--ok); }
.prp-stock.low{ background:var(--amber-soft); color:var(--amber); }
.prp-stock.out{ background:var(--rust-soft); color:var(--rust); }

.prp-empty{ text-align:center; padding:70px 20px; color:var(--ink-dim); }
.prp-empty svg{ margin-bottom:12px; opacity:.45; }
.prp-empty-sub{ font-size:12.5px; margin-top:4px; color:var(--ink-faint); }
.prp-loading{ display:flex; align-items:center; gap:10px; color:var(--ink-dim); font-size:13px; padding:30px 0; }
.prp-dot{ width:6px; height:6px; border-radius:50%; background:var(--accent); animation:prp-pulse 1s infinite ease-in-out; }
.prp-dot:nth-child(2){ animation-delay:.15s; } .prp-dot:nth-child(3){ animation-delay:.3s; }
@keyframes prp-pulse{ 0%,80%,100%{opacity:.25;} 40%{opacity:1;} }
@media (prefers-reduced-motion: reduce){ .prp-dot{ animation:none; opacity:.6; } .prp-card, .prp-switch, .prp-switch::after{ transition:none; } }

.prp-overlay{ position:fixed; inset:0; background:rgba(15,23,42,.4); backdrop-filter:blur(2px); display:flex; align-items:flex-start; justify-content:center; z-index:100; padding:40px 20px; overflow-y:auto; }
.prp-modal{ position:relative; overflow:hidden; background:var(--surface); border-radius:var(--radius-c); max-width:780px; width:100%; box-shadow:0 0 0 1px rgb(var(--brand-line, 200 160 80) / 0.4), 0 20px 50px rgba(15,23,42,.2); }
.prp-modal-head{ display:flex; justify-content:space-between; align-items:flex-start; padding:22px 26px; border-bottom:1px solid var(--border); gap:16px; background:linear-gradient(135deg, rgb(var(--hero-a, 253 248 235)), rgb(var(--hero-b, 250 240 215)), rgb(var(--hero-c, 247 232 195))); }
.prp-modal-sku{ font-size:12px; color:var(--accent-text); font-weight:500; margin-bottom:6px; }
.prp-modal-head h2{ font-family:var(--display); font-weight:600; font-size:24px; margin:0 0 6px; line-height:1.15; }
.prp-modal-vendor{ color:var(--ink-dim); font-size:13px; }
.prp-close-btn{ background:rgba(255,255,255,.7); border:1px solid #d6d3d1; color:var(--ink-dim); width:30px; height:30px; border-radius:var(--radius-k); cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:color .15s, border-color .15s; }
.prp-close-btn:hover{ border-color:var(--rust); color:var(--rust); }
.prp-modal-body{ padding:22px 26px; }
.prp-modal-icon{ float:right; width:96px; height:96px; margin-left:16px; margin-bottom:10px; background:var(--surface-sunken); border:1px solid var(--border); border-radius:var(--radius-k); display:flex; align-items:center; justify-content:center; color:var(--accent-dim); overflow:hidden; }
.prp-modal-img{ width:100%; height:100%; object-fit:cover; }
.prp-modal-bullets{ margin:0 0 18px; padding-left:18px; color:var(--ink-dim); font-size:13.5px; line-height:1.7; }
.prp-modal-desc{ color:var(--ink-dim); font-size:14px; line-height:1.65; margin:0 0 18px; max-width:62ch; }
.prp-section-h{ font-family:var(--display); font-size:17px; font-weight:600; color:var(--ink); margin:0 0 8px; clear:both; }
.prp-spec-table{ width:100%; border-collapse:collapse; margin-bottom:18px; }
.prp-spec-table tr{ border-bottom:1px solid var(--border-soft); }
.prp-spec-table td{ padding:8px 0; font-size:13px; color:var(--ink); }
.prp-spec-table td:first-child{ color:var(--ink-dim); width:40%; }
.prp-modal-buy{ display:flex; align-items:center; justify-content:space-between; padding:16px 0 4px; border-top:1px solid var(--border); margin-top:6px; }
.prp-modal-price{ font-family:var(--display); font-size:26px; color:var(--accent-text); font-weight:600; font-variant-numeric:tabular-nums; }
.prp-modal-cta{ background:linear-gradient(135deg, var(--accent), var(--accent-dark)); color:#fff; border:none; padding:11px 18px; border-radius:var(--radius-k); font-weight:600; font-size:13px; cursor:pointer; transition:opacity .15s; }
.prp-modal-cta:hover{ opacity:.9; }
.prp-rec-section{ margin-top:26px; padding-top:20px; border-top:1px solid var(--border); clear:both; }
.prp-rec-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:12px; }
.prp-rec-card{ border:1px solid var(--border); border-radius:var(--radius-k); padding:10px 12px; cursor:pointer; background:var(--surface-sunken); transition:border-color .15s; }
.prp-rec-card:hover{ border-color:var(--accent-dim); }
.prp-rec-title{ font-size:12.5px; font-weight:600; margin-bottom:4px; line-height:1.3; }
.prp-rec-price{ font-size:13px; color:var(--accent-text); font-weight:600; font-variant-numeric:tabular-nums; }

@media (max-width: 860px){
  .prp-grid-shell{ grid-template-columns:1fr; }
  .prp-filters{ border-right:none; border-bottom:1px solid var(--border); padding:20px; }
  .prp-search-wrap{ order:3; width:100%; max-width:none; }
  .prp-top{ flex-wrap:wrap; }
  .prp-rec-grid{ grid-template-columns:1fr; }
  .prp-hero{ width:calc(100% - 32px); padding:24px 20px; }
  .prp-hero-title{ font-size:26px; }
  .prp-glance{ flex-wrap:wrap; row-gap:14px; }
  .prp-main{ padding:20px 16px 60px; }
}
`; 