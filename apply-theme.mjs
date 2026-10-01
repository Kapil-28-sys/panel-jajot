#!/usr/bin/env node
/**
 * apply-theme.mjs
 * One-time script that makes every page follow the Settings > Appearance theme.
 *
 * It rewrites hard-coded colours in your .jsx files into CSS-variable colours:
 *   from-[#c0923f]        ->  from-[rgb(var(--brand))]
 *   ring-[#c9a45c]/35     ->  ring-[rgb(var(--brand-line)/0.35)]
 *   stroke="#3a7563"      ->  stroke="rgb(var(--a1))"
 * and, unless you pass --no-radius / --no-font:
 *   rounded-2xl / xl      ->  rounded-[var(--radius-card)]
 *   rounded-lg / md       ->  rounded-[var(--radius-control)]
 *   Cormorant font stack  ->  var(--font-display)
 *   bg-surface            ->  bg-[rgb(var(--page-bg))]
 *
 * Usage (from your project root):
 *   node apply-theme.mjs src --dry     # preview what would change
 *   node apply-theme.mjs src           # apply
 *
 * Commit your work first so you can review the diff with `git diff`.
 * Safe to run twice: already-converted files are left alone.
 * Colours not in the map below (emerald / rose / amber status colours, chart
 * greys) are intentionally left as they are.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const doRadius = !args.includes("--no-radius");
const doFont = !args.includes("--no-font");
const root = args.find((a) => !a.startsWith("--")) || "src";

/* hex (lowercase, no #)  ->  CSS variable name (without --) */
const MAP = {
  // primary and gold family
  c9a45c: "brand-line",
  c0923f: "brand",
  b98a3c: "brand",
  "8c6626": "brand-dark",
  "8a6624": "brand-dark",
  "84601f": "brand-dark",
  a8802f: "brand-text",
  cc9d48: "brand-hover",
  "9a722c": "brand-dark-hover",
  d2aa5c: "brand-light",
  d9b366: "brand-light-hover",
  f0d9a0: "brand-lighter",
  f4e0b0: "brand-lighter-hover",
  e6c987: "brand-on-dark",

  // cream tints
  fdfaf4: "tint-50",
  fbf7ec: "tint-100",
  f5ebd5: "tint-200",
  ebdab7: "tint-300",
  fbf8f3: "hero-a",
  f6efe4: "hero-b",
  eee6ef: "hero-c",

  // card palette 4 (uses the primary)
  "5d4522": "p4-b1",
  "33250f": "p4-b2",

  // card palette 1 (green by default)
  "3a7563": "a1",
  "1f4a3c": "a1-dark",
  f3f6f2: "a1-f1",
  e6eee7: "a1-f2",
  d3e2d8: "a1-f3",
  "1f3f34": "a1-b1",
  "0f2721": "a1-b2",
  "2b5a49": "a1-text",

  // card palette 2 (blue by default)
  "4a75a3": "a2",
  "2a4b74": "a2-dark",
  f3f6fa: "a2-f1",
  e5edf6: "a2-f2",
  d2e0ee: "a2-f3",
  "20385a": "a2-b1",
  "101f37": "a2-b2",
  "2f5480": "a2-text",

  // card palette 3 (plum by default)
  "94628f": "a3",
  "65405f": "a3-dark",
  f8f3f7: "a3-f1",
  f0e6ef: "a3-f2",
  e2d3e1: "a3-f3",
  "4d2d4a": "a3-b1",
  "2b1729": "a3-b2",
  "6e4568": "a3-text",
};

const SKIP_FILE = /theme|apply-theme/i; // never touch the theme files themselves
const SKIP_DIR = new Set(["node_modules", "dist", "build", ".git"]);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.has(entry.name)) walk(full);
    } else if (/\.(jsx|tsx)$/.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      files.push(full);
    }
  }
})(root);

let totalFiles = 0;
let totalEdits = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  let edits = 0;
  const count = (fn) => (...m) => {
    edits += 1;
    return fn(...m);
  };

  // 1) Tailwind arbitrary values: [#c0923f] and [#c9a45c]/35
  after = after.replace(
    /\[#([0-9a-fA-F]{6})\](?:\/(\d{1,3}))?/g,
    count((whole, hex, alpha) => {
      const token = MAP[hex.toLowerCase()];
      if (!token) {
        edits -= 1; // not ours, leave untouched
        return whole;
      }
      return alpha ? `[rgb(var(--${token})/${Number(alpha) / 100})]` : `[rgb(var(--${token}))]`;
    })
  );

  // 2) Bare colours in JS / JSX props: "#3a7563"
  after = after.replace(
    /(["'`])#([0-9a-fA-F]{6})\1/g,
    count((whole, quote, hex) => {
      const token = MAP[hex.toLowerCase()];
      if (!token) {
        edits -= 1;
        return whole;
      }
      return `${quote}rgb(var(--${token}))${quote}`;
    })
  );

  // 3) Heading font
  if (doFont) {
    after = after.replace(
      /fontFamily:\s*"'Cormorant Garamond'[^"]*"/g,
      count(() => 'fontFamily: "var(--font-display)"')
    );
  }

  // 4) Corner radius
  if (doRadius) {
    after = after
      .replace(/(?<![\w-])rounded-(?:2xl|xl)(?![\w-])/g, count(() => "rounded-[var(--radius-card)]"))
      .replace(/(?<![\w-])rounded-(?:lg|md)(?![\w-])/g, count(() => "rounded-[var(--radius-control)]"));
  }

  // 5) Page background
  after = after.replace(/(?<![\w-])bg-surface(?![\w-])/g, count(() => "bg-[rgb(var(--page-bg))]"));

  if (after !== before) {
    totalFiles += 1;
    totalEdits += edits;
    console.log(`${dry ? "[dry] " : ""}${file}  (${edits} changes)`);
    if (!dry) fs.writeFileSync(file, after);
  }
}

console.log(
  `\n${dry ? "Would update" : "Updated"} ${totalFiles} of ${files.length} files, ${totalEdits} changes.` +
    (dry ? "\nRun again without --dry to apply." : "\nReview with `git diff`, then restart the dev server.")
);
