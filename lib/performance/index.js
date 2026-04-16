/**
 * Performance-budget orchestrator.
 * Turns the Miyagi config + filesystem state into a set of measurements and
 * evaluations against the configured budgets. The output shape is shared by the
 * CLI, the markdown report, and the dev-UI panel so each consumer renders the
 * same data differently rather than re-deriving it.
 * @module performance
 */

import fs from "node:fs";
import path from "node:path";
import { measure } from "./measure.js";
import parseSize from "./parse-size.js";

/**
 * @typedef {object} EvaluationRow
 * @property {string} category - "global-css" | "global-js" | "folder:<name>" | "html"
 * @property {string} key - stable identifier inside the category ("total", "perPage", or a file path)
 * @property {string} label - human-readable label
 * @property {number} actual - measured bytes (at the configured compression)
 * @property {number|null} budget - configured budget in bytes, or null if unset
 * @property {"ok"|"warn"|"exceed"|"unbudgeted"} status - classification against budget
 * @property {number|null} ratio - actual / budget when budget is set
 */

/**
 * @typedef {object} PerformanceResult
 * @property {import("./measure.js").Measurement} measurement - raw per-file and per-category bytes
 * @property {EvaluationRow[]} evaluations - budget comparison rows
 * @property {"raw"|"gzip"|"brotli"} compression - which metric evaluations use
 * @property {{ok: number, warn: number, exceed: number, unbudgeted: number}} summary - counts per status
 */

const WARN_RATIO = 0.8;

/**
 * Expand a css-string or js-object asset entry to a filesystem path.
 * @param {string|{src: string}} entry
 * @param {string} root
 * @returns {string|null} absolute path, or null if the entry points at a remote URL
 */
function resolveAssetPath(entry, root) {
  const rel = typeof entry === "string" ? entry : entry?.src;

  if (!rel || URL.canParse(rel)) {
    return null;
  }

  return path.resolve(root || "", rel);
}

/**
 * Walk a directory, collecting absolute paths of all non-directory entries.
 * Hidden files (starting with a dot) are skipped — they are almost never shipped.
 * @param {string} dir
 * @returns {string[]}
 */
function walkFolder(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.startsWith(".")) {
      continue;
    }

    // entry.parentPath on Node 20+ gives the containing directory as an absolute
    // path when `dir` was absolute — which it always is at our call sites.
    files.push(path.join(entry.parentPath, entry.name));
  }

  return files;
}

/**
 * Build the list of categorised file sets for the "always-on" (dev + CLI) scope:
 * global CSS, global JS, and each configured asset folder.
 * @param {object} config - global.config (or a spy equivalent in tests)
 * @returns {{category: string, label: string, files: string[]}[]}
 */
export function collectGlobalCategories(config) {
  const assets = config?.assets ?? {};
  const root = assets.root || "";

  const globalCss = [
    ...(assets.css || []),
    ...(assets.shared?.css || []),
  ]
    .map((entry) => resolveAssetPath(entry, root))
    .filter(Boolean);

  const globalJs = [...(assets.js || []), ...(assets.shared?.js || [])]
    .map((entry) => resolveAssetPath(entry, root))
    .filter(Boolean);

  const categories = [
    { category: "global-css", label: "Global CSS", files: globalCss },
    { category: "global-js", label: "Global JS", files: globalJs },
  ];

  for (const folder of assets.folder || []) {
    const abs = path.resolve(root, folder);
    categories.push({
      category: `folder:${folder}`,
      label: `Folder — ${folder}`,
      files: walkFolder(abs),
    });
  }

  return categories;
}

/**
 * Build the list of categorised file sets for post-build HTML pages.
 * @param {string} buildFolder
 * @returns {{category: string, label: string, files: string[]}[]}
 */
export function collectHtmlCategory(buildFolder) {
  const manifestPath = path.resolve(buildFolder, "output.json");

  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  /** @type {Array<string|{path: string}>} */
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return [];
  }

  const files = manifest
    .map((entry) => (typeof entry === "string" ? entry : entry?.path))
    .filter((rel) => typeof rel === "string" && rel.endsWith(".html"))
    .map((rel) => path.resolve(buildFolder, rel));

  return [{ category: "html", label: "Rendered HTML pages", files }];
}

/**
 * @param {number|null} actual
 * @param {number|null} budget
 * @returns {{status: "ok"|"warn"|"exceed"|"unbudgeted", ratio: number|null}}
 */
function classify(actual, budget) {
  if (budget == null) {
    return { status: "unbudgeted", ratio: null };
  }

  if (budget <= 0) {
    return { status: "unbudgeted", ratio: null };
  }

  const ratio = actual / budget;

  if (actual > budget) {
    return { status: "exceed", ratio };
  }

  if (ratio >= WARN_RATIO) {
    return { status: "warn", ratio };
  }

  return { status: "ok", ratio };
}

/**
 * Produce evaluation rows given a measurement and a budgets object.
 * The shape of `budgets` is the `performance.budgets` config key; see
 * lib/default-config.js for the canonical definition.
 * @param {import("./measure.js").Measurement} measurement
 * @param {object} budgets - performance.budgets config
 * @param {"raw"|"gzip"|"brotli"} compression
 * @param {{label: Record<string,string>}} meta - map category key -> human label
 * @param {object} options
 * @param {boolean} [options.listAllPages] - include every HTML page, not just those that exceed or warn
 * @returns {EvaluationRow[]}
 */
export function evaluate(measurement, budgets = {}, compression = "gzip", meta = { label: {} }, options = {}) {
  const rows = [];
  const labelFor = (category) => meta.label[category] || category;

  const globalBudgets = budgets.global || {};
  const htmlBudgets = budgets.html || {};
  const folderBudgets = budgets.folders || {};

  // Global CSS / JS
  for (const [category, budgetKey] of [
    ["global-css", "css"],
    ["global-js", "js"],
  ]) {
    const categoryMeasurement = measurement.categories[category];
    if (!categoryMeasurement) {
      continue;
    }

    const budget = parseSize(globalBudgets[budgetKey] ?? null);
    const actual = categoryMeasurement.totals[compression];
    const { status, ratio } = classify(actual, budget);

    rows.push({
      category,
      key: "total",
      label: labelFor(category),
      actual,
      budget,
      status,
      ratio,
    });
  }

  // Global umbrella (CSS + JS) if set
  if (globalBudgets.total != null) {
    const cssTotal = measurement.categories["global-css"]?.totals[compression] ?? 0;
    const jsTotal = measurement.categories["global-js"]?.totals[compression] ?? 0;
    const actual = cssTotal + jsTotal;
    const budget = parseSize(globalBudgets.total);
    const { status, ratio } = classify(actual, budget);
    rows.push({
      category: "global",
      key: "total",
      label: "Global total (CSS + JS)",
      actual,
      budget,
      status,
      ratio,
    });
  }

  // Folders
  for (const [category, categoryMeasurement] of Object.entries(measurement.categories)) {
    if (!category.startsWith("folder:")) {
      continue;
    }
    const name = category.slice("folder:".length);
    const folderBudget = folderBudgets[name];
    const budget = parseSize(folderBudget?.total ?? null);
    const actual = categoryMeasurement.totals[compression];
    const { status, ratio } = classify(actual, budget);
    rows.push({
      category,
      key: "total",
      label: labelFor(category),
      actual,
      budget,
      status,
      ratio,
    });
  }

  if (folderBudgets.total != null) {
    let actual = 0;
    for (const [category, categoryMeasurement] of Object.entries(measurement.categories)) {
      if (category.startsWith("folder:")) {
        actual += categoryMeasurement.totals[compression];
      }
    }
    const budget = parseSize(folderBudgets.total);
    const { status, ratio } = classify(actual, budget);
    rows.push({
      category: "folders",
      key: "total",
      label: "All folders total",
      actual,
      budget,
      status,
      ratio,
    });
  }

  // HTML: one row per page for perPage, one row for the total.
  // By default only pages that exceed or warn are listed — a project with many
  // component variants can produce hundreds of pages and the table becomes noise.
  // Pass options.listAllPages to include every page.
  const htmlMeasurement = measurement.categories.html;
  if (htmlMeasurement) {
    const perPageBudget = parseSize(htmlBudgets.perPage ?? null);

    if (perPageBudget != null) {
      let pagesChecked = 0;
      let pagesPassed = 0;

      for (const file of htmlMeasurement.files) {
        const actual = file[compression];
        const { status, ratio } = classify(actual, perPageBudget);
        pagesChecked++;

        if (status === "ok") {
          pagesPassed++;
          if (!options.listAllPages) {
            continue;
          }
        }

        rows.push({
          category: "html",
          key: file.path,
          label: path.basename(file.path),
          actual,
          budget: perPageBudget,
          status,
          ratio,
        });
      }

      // When filtering, add a summary row so the reader knows pages were checked
      if (!options.listAllPages && pagesPassed > 0) {
        rows.push({
          category: "html",
          key: "pages-ok",
          label: `${pagesPassed} of ${pagesChecked} pages within budget`,
          actual: 0,
          budget: null,
          status: "ok",
          ratio: null,
        });
      }
    }

    if (htmlBudgets.total != null) {
      const actual = htmlMeasurement.totals[compression];
      const budget = parseSize(htmlBudgets.total);
      const { status, ratio } = classify(actual, budget);
      rows.push({
        category: "html",
        key: "total",
        label: "All pages total",
        actual,
        budget,
        status,
        ratio,
      });
    }
  }

  return rows;
}

/**
 * Summarise evaluation rows into bucket counts.
 * @param {EvaluationRow[]} rows
 * @returns {{ok: number, warn: number, exceed: number, unbudgeted: number}}
 */
export function summarise(rows) {
  const summary = { ok: 0, warn: 0, exceed: 0, unbudgeted: 0 };

  for (const row of rows) {
    summary[row.status] += 1;
  }

  return summary;
}

/**
 * Run the full pipeline: collect → measure → evaluate → summarise.
 * @param {object} [options]
 * @param {object} [options.config] - override global.config, for tests
 * @param {boolean} [options.html] - include post-build HTML measurement
 * @param {string} [options.buildFolder] - required when html is true
 * @param {boolean} [options.listAllPages] - list every HTML page, not just those that exceed or warn
 * @returns {PerformanceResult}
 */
export function runPerformance(options = {}) {
  const config = options.config ?? global.config;
  const perfConfig = config?.performance ?? {};
  const compression = perfConfig.compression || "gzip";
  const budgets = perfConfig.budgets || {};

  const categories = collectGlobalCategories(config);

  if (options.html && options.buildFolder) {
    categories.push(...collectHtmlCategory(options.buildFolder));
  }

  /** @type {Record<string, string>} */
  const labelMap = {};
  for (const category of categories) {
    labelMap[category.category] = category.label;
  }

  const measurement = measure(
    categories.map(({ category, files }) => ({ category, files })),
  );

  const evaluations = evaluate(measurement, budgets, compression, {
    label: labelMap,
  }, { listAllPages: options.listAllPages });
  const summary = summarise(evaluations);

  return { measurement, evaluations, compression, summary };
}
