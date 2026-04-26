// @ts-check

import { formatSize } from "./parse-size.js";

/**
 * @param {object} metric - { bytes, budget, status }
 * @returns {string} table cell rendering of size + budget
 */
function metricCell(metric) {
  const size = formatSize(metric.bytes);
  if (metric.budget == null) {
    return `${size} (no budget)`;
  }
  return `${size} / ${formatSize(metric.budget)}`;
}

/**
 * @param {object[]} components
 * @returns {string}
 */
function componentsSection(components) {
  if (!components.length) {
    return "";
  }
  const rows = components.map((c) => {
    const cssStatus = `\`${c.css.status}\``;
    const jsStatus = `\`${c.js.status}\``;
    return `| ${c.componentPath} | ${metricCell(c.css)} | ${cssStatus} | ${metricCell(c.js)} | ${jsStatus} |`;
  });
  return [
    "## Components",
    "",
    "| Component | CSS | CSS status | JS | JS status |",
    "|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

/**
 * @param {object[]} pages
 * @returns {string}
 */
function pagesSection(pages) {
  if (!pages.length) {
    return "";
  }
  const rows = pages.map((p) => {
    const t = p.totals;
    return `| ${p.templatePath} | ${p.variation} | ${metricCell(t.css)} | ${metricCell(t.js)} | ${metricCell(t.html)} | ${metricCell(t.total)} | \`${t.total.status}\` |`;
  });
  return [
    "## Pages",
    "",
    "| Template | Variation | CSS | JS | HTML | Total | Total status |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

/**
 * Generate a markdown performance report from a runPerformance() result.
 * @param {object} result - the object returned by runPerformance()
 * @returns {string}
 */
export function generatePerformanceReport(result) {
  const header = [
    "# Performance report",
    "",
    `- Compression: \`${result.compression}\``,
    `- Warn ratio: \`${result.warnRatio}\``,
    "",
  ].join("\n");

  return [
    header,
    componentsSection(result.components),
    pagesSection(result.pages),
  ]
    .filter(Boolean)
    .join("\n");
}
