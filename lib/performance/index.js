// @ts-check

import { loadPerformanceConfig } from "./config.js";
import { measureComponent } from "./component.js";
import { measureHtml } from "./html-size.js";
import { computePageTotals } from "./page.js";

const STATUS_RANK = {
  exceed: 4,
  missing: 3,
  warn: 2,
  ok: 1,
  unbudgeted: 0,
};

/**
 * @param {string[]} statuses
 * @returns {string} the worst-ranked status, or "unbudgeted" if empty
 */
function worstStatus(statuses) {
  let worst = "unbudgeted";
  for (const s of statuses) {
    if ((STATUS_RANK[s] ?? -1) > (STATUS_RANK[worst] ?? -1)) {
      worst = s;
    }
  }
  return worst;
}

/**
 * @param {string[]} statuses
 * @returns {{ok: number, warn: number, exceed: number, unbudgeted: number, missing: number}}
 */
function tally(statuses) {
  const counts = { ok: 0, warn: 0, exceed: 0, unbudgeted: 0, missing: 0 };
  for (const s of statuses) {
    if (s in counts) {
      counts[s] += 1;
    }
  }
  return counts;
}

/**
 * Run the opt-in performance feature: load miyagi.performance.json, measure
 * declared components, and (when a render function is supplied) measure each
 * declared page variation.
 * @param {{
 *   cwd?: string,
 *   componentsFolder?: string,
 *   compression?: "raw"|"gzip"|"brotli",
 *   warnRatio?: number,
 *   render?: (templatePath: string, variation: string) => Promise<string>,
 * }} [options]
 * @returns {Promise<object>}
 */
export async function runPerformance(options = {}) {
  const config = loadPerformanceConfig({ cwd: options.cwd });
  if (!config) {
    return { enabled: false };
  }

  const cwd = options.cwd ?? process.cwd();
  const componentsFolder = options.componentsFolder ?? "";
  const compression = options.compression ?? config.compression;
  const warnRatio = options.warnRatio ?? config.warnRatio;

  const componentMeasurements = new Map();
  const components = [];
  for (const [componentPath, entry] of Object.entries(config.components)) {
    const measurement = measureComponent({
      cwd,
      componentsFolder,
      componentPath,
      entry,
      compression,
      warnRatio,
    });
    components.push(measurement);
    componentMeasurements.set(componentPath, measurement);
  }

  const pages = [];
  if (options.render) {
    for (const [templatePath, pageEntry] of Object.entries(config.pages)) {
      const variations = pageEntry.variations ?? {};
      for (const [variation, variationConfig] of Object.entries(variations)) {
        const enrichedErrors = [];
        // Pre-flight: components that the page references but that aren't
        // declared at the top level can't be measured. Surface them as a
        // separate, clearer error than the page module's "not measured".
        const declaredComponents = variationConfig.components.filter(
          (componentPath) => {
            if (componentMeasurements.has(componentPath)) {
              return true;
            }
            enrichedErrors.push({
              componentPath,
              reason: "not declared in config",
            });
            return false;
          },
        );

        const { bytes: htmlBytes } = await measureHtml({
          templatePath,
          variation,
          render: options.render,
          compression,
        });

        const totals = computePageTotals({
          variationConfig: {
            components: declaredComponents,
            budget: variationConfig.budget,
          },
          componentMeasurements,
          htmlBytes,
          warnRatio,
        });
        // Replace the inner errors with our enriched ones (they're never both
        // populated because we filtered the inputs).
        totals.errors = enrichedErrors;
        pages.push({ templatePath, variation, totals });
      }
    }
  }

  const componentStatuses = components.map((c) =>
    worstStatus([c.css.status, c.js.status]),
  );
  const pageStatuses = pages.map((p) => {
    const statuses = [
      p.totals.css.status,
      p.totals.js.status,
      p.totals.html.status,
      p.totals.total.status,
    ];
    // Pages whose declared components couldn't be measured produce
    // numerically-incomplete totals; surface that as "missing" so the
    // summary can't claim the page is ok/unbudgeted.
    if (p.totals.errors && p.totals.errors.length > 0) {
      statuses.push("missing");
    }
    return worstStatus(statuses);
  });

  return {
    enabled: true,
    compression,
    warnRatio,
    components,
    pages,
    summary: {
      components: tally(componentStatuses),
      pages: tally(pageStatuses),
    },
  };
}
