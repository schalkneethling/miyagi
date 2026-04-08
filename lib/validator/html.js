import { readFile } from "node:fs/promises";
import { globSync } from "node:fs";
import path from "path";
import { HtmlValidate } from "html-validate";
import { getComponentData } from "../mocks/index.js";
import { t } from "../i18n/index.js";
import log from "../logger.js";

/**
 * @param {string} templatePath
 * @param {object} data
 * @returns {Promise<string>}
 */
function renderTemplate(templatePath, data) {
  return new Promise((resolve, reject) => {
    global.app.render(templatePath, data, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * @param {object} htmlValidateConfig
 * @returns {HtmlValidate}
 */
function createValidator(htmlValidateConfig) {
  return new HtmlValidate(htmlValidateConfig);
}

/**
 * @param {Array<object>} componentResults
 * @returns {object}
 */
function buildSummary(componentResults) {
  let errors = 0;
  let warnings = 0;
  let passed = 0;
  let failed = 0;

  for (const comp of componentResults) {
    const hasErrors = comp.variations.some((v) => !v.valid);
    if (hasErrors) {
      failed++;
    } else {
      passed++;
    }
    for (const variation of comp.variations) {
      for (const msg of variation.messages) {
        if (msg.severity === 2) {
          errors++;
        } else {
          warnings++;
        }
      }
    }
  }

  return {
    total: componentResults.length,
    passed,
    failed,
    errors,
    warnings,
  };
}

/**
 * Validate rendered HTML for all components.
 * @param {object} [options]
 * @param {object} [options.htmlValidateConfig]
 * @returns {Promise<{components: Array<object>, summary: object}>}
 */
export async function validateAllHtml(options = {}) {
  const config =
    options.htmlValidateConfig ?? global.config.htmlValidation?.htmlValidateConfig;
  const validator = createValidator(config);
  const components = global.state.routes.filter(
    (route) => route.type === "components" && route.paths.tpl,
  );

  log(
    "info",
    t("htmlValidation.all.start"),
  );

  const componentResults = await Promise.all(
    components.map((component) =>
      validateSingleComponent(component, validator),
    ),
  );

  const summary = buildSummary(componentResults);

  if (summary.failed === 0) {
    log("success", t("htmlValidation.all.valid"));
  } else {
    const msg =
      summary.failed === 1
        ? t("htmlValidation.all.invalid.one")
        : t("htmlValidation.all.invalid.other").replace(
            "{{amount}}",
            summary.failed,
          );
    log("error", msg);
  }

  return { components: componentResults, summary };
}

/**
 * Validate rendered HTML for a single component (all variations).
 * @param {object} component - route object from global.state.routes
 * @param {object} [options]
 * @param {object} [options.htmlValidateConfig]
 * @returns {Promise<{component: string, variations: Array<object>}>}
 */
export async function validateComponentHtml(component, options = {}) {
  const config =
    options.htmlValidateConfig ?? global.config.htmlValidation?.htmlValidateConfig;
  const validator = createValidator(config);

  log(
    "info",
    t("htmlValidation.component.start").replace(
      "{{component}}",
      component.paths.dir.short,
    ),
  );

  const result = await validateSingleComponent(component, validator);

  const allValid = result.variations.every((v) => v.valid);
  if (allValid) {
    log("success", t("htmlValidation.component.valid"));
  }

  return result;
}

/**
 * @param {object} component
 * @param {HtmlValidate} validator
 * @returns {Promise<{component: string, variations: Array<object>}>}
 */
async function validateSingleComponent(component, validator) {
  const data = await getComponentData(component);
  const variations = [];

  if (data && data.length > 0) {
    for (const entry of data) {
      try {
        const html = await renderTemplate(
          component.paths.tpl.full,
          entry.resolved ?? {},
        );
        const report = await validator.validateString(html);
        const messages = report.results.flatMap((r) =>
          r.messages.map((msg) => ({
            severity: msg.severity,
            message: msg.message,
            ruleId: msg.ruleId,
            line: msg.line,
            column: msg.column,
          })),
        );

        variations.push({
          name: entry.name,
          valid: report.valid,
          messages,
        });
      } catch (error) {
        log(
          "warn",
          t("htmlValidation.component.renderFailed")
            .replace("{{component}}", component.paths.dir.short)
            .replace("{{variation}}", entry.name),
        );
        variations.push({
          name: entry.name,
          valid: false,
          messages: [
            {
              severity: 2,
              message: `Render error: ${error.message || error}`,
              ruleId: "render-error",
              line: 0,
              column: 0,
            },
          ],
        });
      }
    }
  } else {
    // No mock data — render with empty object for default variation
    try {
      const html = await renderTemplate(component.paths.tpl.full, {});
      const report = await validator.validateString(html);
      const messages = report.results.flatMap((r) =>
        r.messages.map((msg) => ({
          severity: msg.severity,
          message: msg.message,
          ruleId: msg.ruleId,
          line: msg.line,
          column: msg.column,
        })),
      );

      variations.push({
        name: "default",
        valid: report.valid,
        messages,
      });
    } catch (error) {
      variations.push({
        name: "default",
        valid: false,
        messages: [
          {
            severity: 2,
            message: `Render error: ${error.message || error}`,
            ruleId: "render-error",
            line: 0,
            column: 0,
          },
        ],
      });
    }
  }

  return {
    component: component.paths.dir.short,
    variations,
  };
}

/**
 * Parse component and variation name from a build output filename.
 * Expected pattern: component-<path>-variation-<name>.html
 * @param {string} filePath
 * @returns {{ component: string, variation: string }}
 */
function parseFileName(filePath) {
  const basename = path.basename(filePath, ".html");

  const variationMatch = basename.match(/^component-(.+)-variation-(.+)$/);
  if (variationMatch) {
    const componentPart = variationMatch[1].replace(/-/g, "/");
    return {
      component: componentPart,
      variation: variationMatch[2],
    };
  }

  // Fallback: use full basename as component name
  return {
    component: basename,
    variation: "default",
  };
}

/**
 * Validate pre-existing HTML files matching a glob pattern.
 * Files are validated as full HTML documents.
 * @param {string} globPattern
 * @param {object} [options]
 * @param {object} [options.htmlValidateConfig]
 * @returns {Promise<{components: Array<object>, summary: object}>}
 */
export async function validateHtmlFiles(globPattern, options = {}) {
  const baseConfig =
    options.htmlValidateConfig ?? global.config?.htmlValidation?.htmlValidateConfig;

  // For file mode, use full-document validation (don't disable doctype rules)
  const fileConfig = {
    ...baseConfig,
    rules: {
      ...(baseConfig?.rules ?? {}),
      "doctype-style": undefined,
      "missing-doctype": undefined,
    },
  };

  // Remove undefined keys so they fall back to the preset defaults
  for (const [key, value] of Object.entries(fileConfig.rules)) {
    if (value === undefined) {
      delete fileConfig.rules[key];
    }
  }

  const validator = createValidator(fileConfig);

  log(
    "info",
    t("htmlValidation.files.start").replace("{{pattern}}", globPattern),
  );

  const files = globSync(globPattern);

  if (files.length === 0) {
    log(
      "warn",
      t("htmlValidation.files.noFilesFound").replace(
        "{{pattern}}",
        globPattern,
      ),
    );
    return { components: [], summary: buildSummary([]) };
  }

  // Group files by component
  const componentMap = new Map();

  for (const filePath of files) {
    const { component, variation } = parseFileName(filePath);
    if (!componentMap.has(component)) {
      componentMap.set(component, []);
    }
    componentMap.get(component).push({ filePath, variation });
  }

  const componentResults = [];

  for (const [componentName, fileEntries] of componentMap) {
    const variations = [];

    for (const { filePath, variation } of fileEntries) {
      try {
        const html = await readFile(filePath, "utf-8");
        const report = await validator.validateString(html);
        const messages = report.results.flatMap((r) =>
          r.messages.map((msg) => ({
            severity: msg.severity,
            message: msg.message,
            ruleId: msg.ruleId,
            line: msg.line,
            column: msg.column,
          })),
        );

        variations.push({
          name: variation,
          valid: report.valid,
          messages,
        });
      } catch (error) {
        variations.push({
          name: variation,
          valid: false,
          messages: [
            {
              severity: 2,
              message: `File read error: ${error.message || error}`,
              ruleId: "file-error",
              line: 0,
              column: 0,
            },
          ],
        });
      }
    }

    componentResults.push({
      component: componentName,
      variations,
    });
  }

  const summary = buildSummary(componentResults);

  if (summary.failed === 0) {
    log("success", t("htmlValidation.all.valid"));
  } else {
    const msg =
      summary.failed === 1
        ? t("htmlValidation.all.invalid.one")
        : t("htmlValidation.all.invalid.other").replace(
            "{{amount}}",
            summary.failed,
          );
    log("error", msg);
  }

  return { components: componentResults, summary };
}
