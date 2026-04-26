// @ts-check

import { writeFile } from "node:fs/promises";
import path from "node:path";
import init from "../index.js";
import getConfig from "../config.js";
import { runPerformance } from "../performance/index.js";
import { generatePerformanceReport } from "../performance/report.js";
import { renderPageHtml } from "../performance/render-page.js";
import { formatSize } from "../performance/parse-size.js";
import { loadPerformanceConfig } from "../performance/config.js";
import { EXIT_CODES } from "../errors.js";
import log from "../logger.js";

const STATUS_GLYPH = {
  ok: "✓",
  warn: "⚠",
  exceed: "✗",
  unbudgeted: "·",
  missing: "?",
};

/**
 * @param {object} args - parsed yargs args
 * @returns {Promise<object>} CLI result envelope
 */
export default async function perfCli(args) {
  const cwd = process.cwd();
  // Probe for the config file before booting the full app — that avoids
  // initializing the render pipeline for projects that haven't opted in.
  const probe = loadPerformanceConfig({ cwd });
  if (!probe) {
    log("info", "Performance feature not configured (no miyagi.performance.json).");
    return {
      success: true,
      code: EXIT_CODES.SUCCESS,
      shouldExit: true,
    };
  }

  // Initialize Miyagi like the api endpoints do — full state + engines, no
  // listen(). Needed so renderPageHtml() can resolve mocks and run templates.
  global.config = await getConfig(args, false);
  await init("api");

  const result = await runPerformance({
    cwd,
    compression: args.compression,
    warnRatio: args["warn-ratio"] ?? args.warnRatio,
    render: renderPageHtml,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printTable(result);
  }

  if (args.output) {
    const target = path.resolve(args.output);
    await writeFile(target, generatePerformanceReport(result), "utf-8");
    log("info", null, `Wrote ${target}.`);
  }

  const failed =
    args.fail &&
    (result.summary.components.exceed > 0 || result.summary.pages.exceed > 0);

  return {
    success: !failed,
    code: failed ? EXIT_CODES.GENERAL_ERROR : EXIT_CODES.SUCCESS,
    shouldExit: true,
  };
}

/**
 * @param {object} result - return value of runPerformance()
 * @returns {void}
 */
function printTable(result) {
  process.stdout.write(
    `Performance (${result.compression}, warn at ${result.warnRatio})\n`,
  );

  if (result.components.length > 0) {
    process.stdout.write("\nComponents:\n");
    for (const c of result.components) {
      process.stdout.write(
        `  ${formatLine(c.componentPath, "CSS", c.css)}\n`,
      );
      process.stdout.write(`  ${formatLine(c.componentPath, "JS", c.js)}\n`);
    }
  }

  if (result.pages.length > 0) {
    process.stdout.write("\nPages:\n");
    for (const p of result.pages) {
      const id = `${p.templatePath}#${p.variation}`;
      process.stdout.write(`  ${formatLine(id, "CSS", p.totals.css)}\n`);
      process.stdout.write(`  ${formatLine(id, "JS", p.totals.js)}\n`);
      process.stdout.write(`  ${formatLine(id, "HTML", p.totals.html)}\n`);
      process.stdout.write(`  ${formatLine(id, "Total", p.totals.total)}\n`);
      for (const e of p.totals.errors ?? []) {
        process.stdout.write(`    ! ${e.componentPath}: ${e.reason}\n`);
      }
    }
  }
}

/**
 * @param {string} subject
 * @param {string} kind
 * @param {object} metric
 * @returns {string}
 */
function formatLine(subject, kind, metric) {
  const glyph = STATUS_GLYPH[metric.status] ?? " ";
  const budget =
    metric.budget == null ? "(no budget)" : `/ ${formatSize(metric.budget)}`;
  return `${glyph} ${subject} ${kind}: ${formatSize(metric.bytes)} ${budget} [${metric.status}]`;
}
