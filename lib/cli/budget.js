import { writeFile } from "node:fs/promises";
import getConfig from "../config.js";
import log from "../logger.js";
import { EXIT_CODES } from "../errors.js";
import { runPerformance } from "../performance/index.js";
import { generatePerformanceReport } from "../performance/report.js";
import { formatSize } from "../performance/parse-size.js";

const VALID_COMPRESSIONS = ["raw", "gzip", "brotli"];

/**
 * `miyagi budget` — on-demand performance budget check.
 * By default walks the configured global CSS/JS and asset folders, measures
 * them, and compares against `config.performance.budgets`. The HTML category
 * (post-build pages) is opt-in via `--build-folder`.
 * @param {object} args
 * @returns {Promise<object>}
 */
export default async function budgetCli(args) {
  const config = await getConfig(args);
  global.config = config;

  if (args.compression && !VALID_COMPRESSIONS.includes(args.compression)) {
    log(
      "error",
      `Unknown --compression "${args.compression}". Use one of: ${VALID_COMPRESSIONS.join(", ")}`,
    );
    return {
      success: false,
      code: EXIT_CODES.CLI_USAGE_ERROR,
      shouldExit: true,
    };
  }

  if (args.compression) {
    config.performance = {
      ...(config.performance || {}),
      compression: args.compression,
    };
  }

  const result = runPerformance({
    config,
    html: Boolean(args.buildFolder),
    buildFolder: args.buildFolder,
    listAllPages: args.listAllPages,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printTable(result);
  }

  if (args.output) {
    const report = generatePerformanceReport(result);
    try {
      await writeFile(args.output, report, "utf-8");
      log("info", `Performance report written to ${args.output}`);
    } catch (error) {
      log("error", `Failed to write report: ${error.message}`);
    }
  }

  const exceeded = result.summary.exceed > 0;
  const shouldFail =
    args.fail || config.performance?.report?.failOnExceed;

  if (exceeded && shouldFail) {
    return {
      success: false,
      code: EXIT_CODES.VALIDATION_ERROR,
      shouldExit: true,
    };
  }

  if (exceeded) {
    log(
      "warn",
      `Performance budget exceeded in ${result.summary.exceed} categor${result.summary.exceed === 1 ? "y" : "ies"}.`,
    );
  }

  return {
    success: true,
    code: EXIT_CODES.SUCCESS,
    shouldExit: true,
  };
}

/**
 * @param {import("../performance/index.js").PerformanceResult} result
 * @returns {void}
 */
function printTable(result) {
  const { evaluations, compression, summary } = result;

  log("info", `Performance budget — measured at ${compression}.`);

  const header = ["Category", "Item", "Actual", "Budget", "Status"];
  const rows = evaluations.map((row) => [
    row.category,
    row.key === "total" ? "Total" : shortLabel(row.label),
    formatSize(row.actual),
    formatSize(row.budget),
    statusLabel(row.status),
  ]);

  const columnWidths = header.map((heading, index) =>
    Math.max(heading.length, ...rows.map((row) => row[index].length)),
  );

  const padCell = (text, width) => text + " ".repeat(width - text.length);
  const renderRow = (columns) =>
    columns.map((cell, index) => padCell(cell, columnWidths[index])).join("  ");

  process.stdout.write(`${renderRow(header)}\n`);
  process.stdout.write(
    `${columnWidths.map((width) => "-".repeat(width)).join("  ")}\n`,
  );
  for (const row of rows) {
    process.stdout.write(`${renderRow(row)}\n`);
  }
  process.stdout.write(
    `\nOK: ${summary.ok}  Warn: ${summary.warn}  Exceed: ${summary.exceed}  Unbudgeted: ${summary.unbudgeted}\n`,
  );
}

const MAX_LABEL_LENGTH = 60;

/**
 * @param {string} label
 * @returns {string}
 */
function shortLabel(label) {
  if (label.length <= MAX_LABEL_LENGTH) {
    return label;
  }
  return `…${label.slice(-(MAX_LABEL_LENGTH - 1))}`;
}

/**
 * @param {string} status
 * @returns {string}
 */
function statusLabel(status) {
  switch (status) {
    case "ok":
      return "OK";
    case "warn":
      return "WARN";
    case "exceed":
      return "EXCEED";
    default:
      return "—";
  }
}
