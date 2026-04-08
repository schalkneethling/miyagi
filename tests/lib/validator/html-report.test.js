import { describe, test, expect } from "vitest";
import { generateMarkdownReport } from "../../../lib/validator/html-report.js";

describe("generateMarkdownReport", () => {
  test("generates report for all-passing results", () => {
    const results = {
      components: [
        {
          component: "button",
          variations: [
            { name: "default", valid: true, messages: [] },
            { name: "variant", valid: true, messages: [] },
          ],
        },
      ],
      summary: { total: 1, passed: 1, failed: 0, errors: 0, warnings: 0 },
    };

    const report = generateMarkdownReport(results);

    expect(report).toContain("# HTML Validation Report");
    expect(report).toContain("**Passed:** 1");
    expect(report).toContain("**Failed:** 0");
    expect(report).toContain("| button | PASS | 0 | 0 |");
    expect(report).not.toContain("## Failed Components");
  });

  test("generates report with failed components", () => {
    const results = {
      components: [
        {
          component: "button",
          variations: [{ name: "default", valid: true, messages: [] }],
        },
        {
          component: "icon",
          variations: [
            {
              name: "default",
              valid: false,
              messages: [
                {
                  severity: 2,
                  message: 'Attribute "class" duplicated',
                  ruleId: "no-dup-attr",
                  line: 3,
                  column: 5,
                },
              ],
            },
          ],
        },
      ],
      summary: { total: 2, passed: 1, failed: 1, errors: 1, warnings: 0 },
    };

    const report = generateMarkdownReport(results);

    expect(report).toContain("**Failed:** 1");
    expect(report).toContain("| button | PASS | 0 | 0 |");
    expect(report).toContain("| icon | FAIL | 1 | 0 |");
    expect(report).toContain("## Failed Components");
    expect(report).toContain("### icon");
    expect(report).toContain("#### default");
    expect(report).toContain("| 3 | 5 | error | no-dup-attr |");
  });

  test("escapes pipe characters in messages", () => {
    const results = {
      components: [
        {
          component: "test",
          variations: [
            {
              name: "default",
              valid: false,
              messages: [
                {
                  severity: 2,
                  message: "value must be a|b",
                  ruleId: "test-rule",
                  line: 1,
                  column: 1,
                },
              ],
            },
          ],
        },
      ],
      summary: { total: 1, passed: 0, failed: 1, errors: 1, warnings: 0 },
    };

    const report = generateMarkdownReport(results);
    expect(report).toContain("value must be a\\|b");
  });

  test("includes date", () => {
    const results = {
      components: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0, warnings: 0 },
    };

    const report = generateMarkdownReport(results);
    expect(report).toMatch(/\*\*Date:\*\* \d{4}-\d{2}-\d{2}/);
  });

  test("includes warnings with correct severity label", () => {
    const results = {
      components: [
        {
          component: "test",
          variations: [
            {
              name: "default",
              valid: false,
              messages: [
                {
                  severity: 1,
                  message: "Consider using native element",
                  ruleId: "prefer-native-element",
                  line: 2,
                  column: 1,
                },
              ],
            },
          ],
        },
      ],
      summary: { total: 1, passed: 0, failed: 1, errors: 0, warnings: 1 },
    };

    const report = generateMarkdownReport(results);
    expect(report).toContain("| 2 | 1 | warning | prefer-native-element |");
  });
});
