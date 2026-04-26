// @ts-check

import path from "node:path";
import { measure } from "./measure.js";
import parseSize from "./parse-size.js";

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
 * @param {{
 *   bytes: number,
 *   budgetBytes: number|null,
 *   warnRatio: number,
 *   missing: boolean,
 * }} input
 * @returns {"ok"|"warn"|"exceed"|"unbudgeted"|"missing"}
 */
function classify({ bytes, budgetBytes, warnRatio, missing }) {
  if (missing) {
    return "missing";
  }
  if (budgetBytes == null) {
    return "unbudgeted";
  }
  if (bytes > budgetBytes) {
    return "exceed";
  }
  if (bytes >= budgetBytes * warnRatio) {
    return "warn";
  }
  return "ok";
}

/**
 * Measure the CSS and JS bundle sizes for a single component and classify
 * each against the (optional) budget set in miyagi.performance.json.
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

  const measurement = measure([
    { category: "css", files: [cssPath] },
    { category: "js", files: [jsPath] },
  ]);
  const cssFile = measurement.categories.css.files[0];
  const jsFile = measurement.categories.js.files[0];

  const cssBudget = parseSize(entry?.css?.budget ?? null);
  const jsBudget = parseSize(entry?.js?.budget ?? null);

  return {
    componentPath,
    css: {
      path: cssPath,
      bytes: cssFile.missing ? 0 : cssFile[compression],
      budget: cssBudget,
      status: classify({
        bytes: cssFile.missing ? 0 : cssFile[compression],
        budgetBytes: cssBudget,
        warnRatio,
        missing: Boolean(cssFile.missing),
      }),
    },
    js: {
      path: jsPath,
      bytes: jsFile.missing ? 0 : jsFile[compression],
      budget: jsBudget,
      status: classify({
        bytes: jsFile.missing ? 0 : jsFile[compression],
        budgetBytes: jsBudget,
        warnRatio,
        missing: Boolean(jsFile.missing),
      }),
    },
  };
}
