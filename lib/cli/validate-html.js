import path from "path";
import { writeFile } from "node:fs/promises";
import init from "./app.js";
import getConfig from "../config.js";
import log from "../logger.js";
import { t } from "../i18n/index.js";
import { EXIT_CODES } from "../errors.js";
import {
  validateAllHtml,
  validateComponentHtml,
  validateHtmlFiles,
} from "../validator/html.js";
import { generateMarkdownReport } from "../validator/html-report.js";

/**
 * @param {object} args
 * @returns {Promise<object>}
 */
export default async function validateHtml(args) {
  process.env.NODE_ENV = "development";

  const filesGlob = args.files;

  if (filesGlob) {
    // Files mode — validate pre-existing HTML files
    const config = await getConfig(args);
    global.config = config;
    const results = await validateHtmlFiles(filesGlob);
    return await writeReport(results, args, config);
  }

  // Render mode — render components and validate
  const componentArg = args.component;
  const config = await getConfig(args);
  global.app = await init(config);

  let results;

  if (componentArg) {
    const component = global.state.routes.find(
      ({ alias }) =>
        alias === path.relative(config.components.folder, componentArg),
    );

    if (!component) {
      const message = t("htmlValidation.componentNotFound").replace("{{component}}", componentArg);
      log("error", message);
      return {
        success: false,
        code: EXIT_CODES.CLI_USAGE_ERROR,
        shouldExit: true,
        message,
      };
    }

    const result = await validateComponentHtml(component);
    results = {
      components: [result],
      summary: {
        total: 1,
        passed: result.variations.every((v) => v.valid) ? 1 : 0,
        failed: result.variations.some((v) => !v.valid) ? 1 : 0,
        errors: result.variations.reduce(
          (sum, v) =>
            sum + v.messages.filter((m) => m.severity === 2).length,
          0,
        ),
        warnings: result.variations.reduce(
          (sum, v) =>
            sum + v.messages.filter((m) => m.severity !== 2).length,
          0,
        ),
      },
    };
  } else {
    results = await validateAllHtml();
  }

  return await writeReport(results, args, config);
}

/**
 * @param {object} results
 * @param {object} args
 * @param {object} config
 * @returns {Promise<object>}
 */
async function writeReport(results, args, config) {
  const report = generateMarkdownReport(results);
  const outputPath = args.output ?? config.htmlValidation?.output ?? "html-validation-report.md";

  try {
    await writeFile(outputPath, report, "utf-8");
    log(
      "info",
      t("htmlValidation.reportWritten").replace("{{path}}", outputPath),
    );
  } catch (error) {
    log("error", t("htmlValidation.reportWriteFailed").replace("{{error}}", error.message));
  }

  return {
    success: results.summary.failed === 0,
    code:
      results.summary.failed === 0
        ? EXIT_CODES.SUCCESS
        : EXIT_CODES.VALIDATION_ERROR,
    shouldExit: true,
  };
}
