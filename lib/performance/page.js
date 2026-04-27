// @ts-check

import parseSize from "./parse-size.js";
import { classify } from "./classify.js";

/**
 * @typedef {object} PageMetric
 * @property {number} bytes - measured size in bytes for this metric
 * @property {number|null} budget - parsed budget bytes, or null when unset
 * @property {"ok"|"warn"|"exceed"|"unbudgeted"} status - classification
 */

/**
 * @typedef {object} PageError
 * @property {string} componentPath - path of the missing/unknown component
 * @property {string} reason - human-readable cause
 */

/**
 * @typedef {object} PageTotals
 * @property {PageMetric} css - summed CSS bytes across declared components
 * @property {PageMetric} js - summed JS bytes across declared components
 * @property {PageMetric} html - measured HTML bytes for this variation
 * @property {PageMetric} total - sum of css + js + html
 * @property {PageError[]} errors - per-component issues that didn't abort the run
 */

/**
 * Sum CSS / JS / HTML byte sizes for a single page variation and classify
 * each metric (and the grand total) against the optional budget keys
 * declared in miyagi.performance.json.
 * @param {{
 *   variationConfig: {
 *     components: string[],
 *     budget?: { css?: string, js?: string, html?: string, total?: string },
 *   },
 *   componentMeasurements: Map<string, {
 *     css: { bytes: number },
 *     js: { bytes: number },
 *   }>,
 *   htmlBytes: number,
 *   warnRatio: number,
 * }} options
 * @returns {PageTotals}
 */
export function computePageTotals({
  variationConfig,
  componentMeasurements,
  htmlBytes,
  warnRatio,
}) {
  const errors = [];
  let cssBytes = 0;
  let jsBytes = 0;

  for (const componentPath of variationConfig.components) {
    const measurement = componentMeasurements.get(componentPath);
    if (!measurement) {
      errors.push({ componentPath, reason: "not measured" });
      continue;
    }
    cssBytes += measurement.css.bytes;
    jsBytes += measurement.js.bytes;
  }

  const totalBytes = cssBytes + jsBytes + htmlBytes;
  const budget = variationConfig.budget ?? {};
  const cssBudget = parseSize(budget.css ?? null);
  const jsBudget = parseSize(budget.js ?? null);
  const htmlBudget = parseSize(budget.html ?? null);
  const totalBudget = parseSize(budget.total ?? null);

  return {
    css: {
      bytes: cssBytes,
      budget: cssBudget,
      status: classify({ bytes: cssBytes, budgetBytes: cssBudget, warnRatio }),
    },
    js: {
      bytes: jsBytes,
      budget: jsBudget,
      status: classify({ bytes: jsBytes, budgetBytes: jsBudget, warnRatio }),
    },
    html: {
      bytes: htmlBytes,
      budget: htmlBudget,
      status: classify({ bytes: htmlBytes, budgetBytes: htmlBudget, warnRatio }),
    },
    total: {
      bytes: totalBytes,
      budget: totalBudget,
      status: classify({
        bytes: totalBytes,
        budgetBytes: totalBudget,
        warnRatio,
      }),
    },
    errors,
  };
}
