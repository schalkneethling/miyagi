// @ts-check

import path from "node:path";
import { existsSync } from "node:fs";
import dependencyTree from "dependency-tree";
import { measure } from "./measure.js";
import parseSize from "./parse-size.js";
import { classify } from "./classify.js";

/**
 * @typedef {object} AssetMeasurement
 * @property {string} path - absolute path to the asset
 * @property {number} bytes - measured bytes for the chosen compression
 * @property {number|null} budget - budget in bytes, or null when unset
 * @property {"ok"|"warn"|"exceed"|"unbudgeted"|"missing"} status - classification
 */

/**
 * @typedef {object} ComponentMeasurement
 * @property {string} componentPath - library-relative path to the component folder
 * @property {AssetMeasurement} css - the CSS asset measurement
 * @property {AssetMeasurement} js - the JS asset measurement
 */

/**
 * Resolve all files reachable from `entryPath` via static `import` (JS/TS) or
 * `@import` (CSS) statements. Returns just the entry path when the file is
 * missing, has no imports, or the walker fails for any reason. The walker
 * sees what's reachable in source — it cannot tree-shake, dedup runtime-only
 * branches, or follow dynamic imports, so the resulting number is an
 * upper-bound proxy for what a bundler would emit.
 * @param {string} entryPath - absolute path to the entry file
 * @returns {string[]} absolute paths of every file in the import graph
 */
function resolveImportGraph(entryPath) {
  if (!existsSync(entryPath)) {
    return [entryPath];
  }
  try {
    const list = dependencyTree.toList({
      filename: entryPath,
      directory: path.dirname(entryPath),
      filter: (filePath) => !filePath.includes("node_modules"),
    });
    return list && list.length > 0 ? list : [entryPath];
  } catch {
    return [entryPath];
  }
}

/**
 * Measure the CSS and JS bundle sizes for a single component and classify
 * each against the (optional) budget set in miyagi.performance.json. Walks
 * static imports from the entry file so a 2 kB component that imports a
 * 50 kB util shows the real reachable size, not just the entry file.
 * @param {{
 *   cwd: string,
 *   componentPath: string,
 *   entry: { css?: { budget?: string }, js?: { budget?: string } },
 *   compression: "raw"|"gzip"|"brotli",
 *   warnRatio: number,
 * }} options
 * @returns {ComponentMeasurement}
 */
export function measureComponent({
  cwd,
  componentPath,
  entry,
  compression,
  warnRatio,
}) {
  const folder = path.join(cwd, componentPath);
  const componentName = path.basename(componentPath);
  const cssPath = path.join(folder, `${componentName}.css`);
  const jsPath = path.join(folder, `${componentName}.js`);

  const cssFiles = resolveImportGraph(cssPath);
  const jsFiles = resolveImportGraph(jsPath);

  const measurement = measure([
    { category: "css", files: cssFiles },
    { category: "js", files: jsFiles },
  ]);
  const cssEntry = measurement.categories.css.files[0];
  const jsEntry = measurement.categories.js.files[0];
  const cssTotals = measurement.categories.css.totals;
  const jsTotals = measurement.categories.js.totals;

  const cssBudget = parseSize(entry?.css?.budget ?? null);
  const jsBudget = parseSize(entry?.js?.budget ?? null);

  const cssMissing = Boolean(cssEntry.missing);
  const jsMissing = Boolean(jsEntry.missing);
  const cssBytes = cssMissing ? 0 : cssTotals[compression];
  const jsBytes = jsMissing ? 0 : jsTotals[compression];

  return {
    componentPath,
    css: {
      path: cssPath,
      bytes: cssBytes,
      budget: cssBudget,
      status: classify({
        bytes: cssBytes,
        budgetBytes: cssBudget,
        warnRatio,
        missing: cssMissing,
      }),
    },
    js: {
      path: jsPath,
      bytes: jsBytes,
      budget: jsBudget,
      status: classify({
        bytes: jsBytes,
        budgetBytes: jsBudget,
        warnRatio,
        missing: jsMissing,
      }),
    },
  };
}
