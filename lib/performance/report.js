/**
 * Generate a Markdown performance-budget report.
 * Mirrors the shape of lib/validator/html-report.js so the two read the same at
 * a glance: one summary table, then per-category detail tables. The report is
 * a stable artefact that can be committed by CI or linked from PRs.
 * @module performance/report
 */

import path from "node:path";
import { formatSize } from "./parse-size.js";

const STATUS_LABEL = {
  ok: "OK",
  warn: "WARN",
  exceed: "EXCEED",
  unbudgeted: "—",
};

/**
 * @param {"raw"|"gzip"|"brotli"} compression
 * @returns {string}
 */
function compressionLabel(compression) {
  return compression.charAt(0).toUpperCase() + compression.slice(1);
}

/**
 * @param {import("./index.js").PerformanceResult} result
 * @param {object} [options]
 * @param {string} [options.cwd] - used to relativize reported file paths
 * @returns {string} Markdown
 */
export function generatePerformanceReport(result, options = {}) {
  const cwd = options.cwd || process.cwd();
  const { measurement, evaluations, compression, summary } = result;
  const lines = [];

  lines.push("# Performance Budget Report");
  lines.push("");
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Compression:** ${compressionLabel(compression)}`);
  lines.push(
    `**OK:** ${summary.ok} | **Warn:** ${summary.warn} | **Exceed:** ${summary.exceed} | **Unbudgeted:** ${summary.unbudgeted}`,
  );
  lines.push("");

  // Evaluation summary
  lines.push("## Evaluations");
  lines.push("");
  lines.push("| Category | Item | Actual | Budget | Status |");
  lines.push("|----------|------|--------|--------|--------|");

  for (const row of evaluations) {
    let itemLabel;
    if (row.key === "total") {
      itemLabel = "Total";
    } else if (row.key === "perPage") {
      itemLabel = "Per page";
    } else {
      itemLabel = escapePipe(row.label);
    }

    lines.push(
      `| ${escapePipe(row.category)} | ${itemLabel} | ${formatSize(row.actual)} | ${formatSize(row.budget)} | ${STATUS_LABEL[row.status]} |`,
    );
  }
  lines.push("");

  // Per-category file breakdown
  for (const [category, data] of Object.entries(measurement.categories)) {
    if (data.files.length === 0) {
      continue;
    }

    lines.push(`## ${escapePipe(category)}`);
    lines.push("");
    lines.push("| File | Raw | Gzip | Brotli |");
    lines.push("|------|-----|------|--------|");

    for (const file of data.files) {
      const rel = path.relative(cwd, file.path);
      const label = file.missing ? `${rel} (missing)` : rel;
      lines.push(
        `| ${escapePipe(label)} | ${formatSize(file.raw)} | ${formatSize(file.gzip)} | ${formatSize(file.brotli)} |`,
      );
    }
    lines.push(
      `| **Total** | ${formatSize(data.totals.raw)} | ${formatSize(data.totals.gzip)} | ${formatSize(data.totals.brotli)} |`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapePipe(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}
