/**
 * Generate a Markdown report from HTML validation results.
 * @param {object} results - output from validateAllHtml, validateComponentHtml, or validateHtmlFiles
 * @param {Array<object>} results.components
 * @param {object} results.summary
 * @returns {string} Markdown-formatted report
 */
export function generateMarkdownReport(results) {
  const { components, summary } = results;
  const lines = [];

  lines.push("# HTML Validation Report");
  lines.push("");
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(
    `**Total components:** ${summary.total} | **Passed:** ${summary.passed} | **Failed:** ${summary.failed}`,
  );
  lines.push(
    `**Errors:** ${summary.errors} | **Warnings:** ${summary.warnings}`,
  );
  lines.push("");

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| Component | Status | Errors | Warnings |");
  lines.push("|-----------|--------|--------|----------|");

  for (const comp of components) {
    const hasErrors = comp.variations.some((v) => !v.valid);
    const status = hasErrors ? "FAIL" : "PASS";
    let errors = 0;
    let warnings = 0;

    for (const variation of comp.variations) {
      for (const msg of variation.messages) {
        if (msg.severity === 2) {
          errors++;
        } else {
          warnings++;
        }
      }
    }

    lines.push(`| ${comp.component} | ${status} | ${errors} | ${warnings} |`);
  }

  // Failed component details
  const failedComponents = components.filter((comp) =>
    comp.variations.some((v) => !v.valid),
  );

  if (failedComponents.length > 0) {
    lines.push("");
    lines.push("## Failed Components");

    for (const comp of failedComponents) {
      lines.push("");
      lines.push(`### ${comp.component}`);

      const failedVariations = comp.variations.filter((v) => !v.valid);

      for (const variation of failedVariations) {
        lines.push("");
        lines.push(`#### ${variation.name}`);
        lines.push("");
        lines.push("| Line | Col | Severity | Rule | Message |");
        lines.push("|------|-----|----------|------|---------|");

        for (const msg of variation.messages) {
          const severity = msg.severity === 2 ? "error" : "warning";
          const escapedMessage = msg.message
            .replace(/\\/g, "\\\\")
            .replace(/\|/g, "\\|");
          lines.push(
            `| ${msg.line} | ${msg.column} | ${severity} | ${msg.ruleId} | ${escapedMessage} |`,
          );
        }
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}
