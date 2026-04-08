import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "path";
import { validateHtmlFiles } from "../../../lib/validator/html.js";
import { generateMarkdownReport } from "../../../lib/validator/html-report.js";

const BUTTON_FIXTURE = "tests/_setup/html/component-button-variation-default.html";
const ALL_FIXTURES = "tests/_setup/html/component-*-variation-*.html";

const testConfig = {
  extends: ["html-validate:recommended"],
  rules: { "input-missing-label": "error" },
};

let tmpDir;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "miyagi-html-report-test-"));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true });
  vi.restoreAllMocks();
});

describe("generateMarkdownReport — integration (real files)", () => {
  test("writes report from real validation results and reads back expected content", async () => {
    const results = await validateHtmlFiles(ALL_FIXTURES, {
      htmlValidateConfig: testConfig,
    });
    const report = generateMarkdownReport(results);
    const outputPath = path.join(tmpDir, "report.md");

    await writeFile(outputPath, report, "utf-8");
    const content = await readFile(outputPath, "utf-8");

    expect(content).toContain("# HTML Validation Report");
    expect(content).toContain("**Passed:** 2");
    expect(content).toContain("**Failed:** 2");

    // Valid components appear as PASS with no errors
    expect(content).toContain("| button | PASS | 0 | 0 |");
    expect(content).toContain("| card | PASS | 0 | 0 |");

    // Invalid components appear in the summary table as FAIL
    expect(content).toMatch(/\| icon \| FAIL \| [1-9]/);
    expect(content).toMatch(/\| form \| FAIL \| [1-9]/);

    // Failed component detail sections are present
    expect(content).toContain("## Failed Components");
    expect(content).toContain("### icon");
    expect(content).toContain("### form");

    // Specific rule IDs appear in the detail tables
    expect(content).toContain("no-dup-attr");
    expect(content).toContain("wcag/h37");
    expect(content).toContain("no-implicit-button-type");
    expect(content).toContain("input-missing-label");
    expect(content).toContain("empty-heading");
    expect(content).toContain("no-implicit-button-type");
  });

  test("report for all-valid files contains no Failed Components section", async () => {
    const results = await validateHtmlFiles(BUTTON_FIXTURE, {
      htmlValidateConfig: testConfig,
    });
    const report = generateMarkdownReport(results);
    const outputPath = path.join(tmpDir, "valid-report.md");

    await writeFile(outputPath, report, "utf-8");
    const content = await readFile(outputPath, "utf-8");

    expect(content).toContain("**Passed:** 1");
    expect(content).toContain("**Failed:** 0");
    expect(content).toContain("| button | PASS | 0 | 0 |");
    expect(content).not.toContain("## Failed Components");
  });
});
