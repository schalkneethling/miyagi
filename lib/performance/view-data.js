// @ts-check

import { formatSize } from "./parse-size.js";

/**
 * @param {object} metric - the metric object from runPerformance
 * @returns {object} compact view-data shape for the Twig templates
 */
function metricView(metric) {
  return {
    bytes: metric.bytes,
    bytesLabel: formatSize(metric.bytes),
    budget: metric.budget,
    budgetLabel: metric.budget == null ? null : formatSize(metric.budget),
    status: metric.status,
  };
}

/**
 * Build the component-overview Performance section view-data for a given
 * component path. Returns null when the feature is disabled or the component
 * isn't listed in miyagi.performance.json.
 * @param {object|null} runResult - return value of runPerformance() or null
 * @param {string} componentPath
 * @returns {object|null}
 */
export function buildComponentPerfSection(runResult, componentPath) {
  if (!runResult || !runResult.enabled) {
    return null;
  }
  const match = runResult.components.find(
    (c) => c.componentPath === componentPath,
  );
  if (!match) {
    return null;
  }
  return {
    componentPath,
    css: { ...metricView(match.css), path: match.css.path },
    js: { ...metricView(match.js), path: match.js.path },
  };
}

/**
 * Build the page-banner view-data for a given template + variation. Returns
 * null when the feature is disabled or the page isn't listed in
 * miyagi.performance.json.
 * @param {object|null} runResult - return value of runPerformance() or null
 * @param {string} templatePath
 * @param {string} variation
 * @returns {object|null}
 */
export function buildPagePerfBanner(runResult, templatePath, variation) {
  if (!runResult || !runResult.enabled) {
    return null;
  }
  const match = runResult.pages.find(
    (p) => p.templatePath === templatePath && p.variation === variation,
  );
  if (!match) {
    return null;
  }
  const t = match.totals;
  return {
    templatePath,
    variation,
    css: metricView(t.css),
    js: metricView(t.js),
    html: metricView(t.html),
    total: metricView(t.total),
    components: variationComponents(match.totals),
    errors: t.errors,
  };
}

/**
 * Surfaces undeclared / missing component paths from the totals' errors
 * array — used as a tooltip aid in the banner so users can see which
 * components weren't measured. Components that *were* measured aren't
 * listed here; the banner already shows their summed bytes.
 * @param {object} totals - the page totals object from runPerformance
 * @returns {string[]} component paths flagged in totals.errors
 */
function variationComponents(totals) {
  return (totals.errors || []).map((e) => e.componentPath);
}
