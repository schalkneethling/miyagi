import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { validateHtmlFiles } from "../../../lib/validator/html.js";

const BUTTON_FIXTURE = "tests/_setup/html/component-button-variation-default.html";
const CARD_FIXTURE = "tests/_setup/html/component-card-variation-default.html";
const ICON_FIXTURE = "tests/_setup/html/component-icon-variation-default.html";
const FORM_FIXTURE = "tests/_setup/html/component-form-variation-invalid.html";
const ALL_FIXTURES = "tests/_setup/html/component-*-variation-*.html";

const testConfig = {
  extends: ["html-validate:recommended"],
  rules: { "input-missing-label": "error" },
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateHtmlFiles — integration", () => {
  test("button fixture passes validation", async () => {
    const results = await validateHtmlFiles(BUTTON_FIXTURE, {
      htmlValidateConfig: testConfig,
    });

    expect(results.summary.total).toBe(1);
    expect(results.summary.passed).toBe(1);
    expect(results.summary.failed).toBe(0);
    expect(results.summary.errors).toBe(0);
    expect(results.components[0].variations[0].valid).toBe(true);
    expect(results.components[0].variations[0].messages).toHaveLength(0);
  });

  test("card fixture passes validation", async () => {
    const results = await validateHtmlFiles(CARD_FIXTURE, {
      htmlValidateConfig: testConfig,
    });

    expect(results.summary.total).toBe(1);
    expect(results.summary.passed).toBe(1);
    expect(results.summary.failed).toBe(0);
    expect(results.summary.errors).toBe(0);
    expect(results.components[0].variations[0].valid).toBe(true);
    expect(results.components[0].variations[0].messages).toHaveLength(0);
  });

  test("icon fixture fails with duplicate attribute and missing alt text", async () => {
    const results = await validateHtmlFiles(ICON_FIXTURE, {
      htmlValidateConfig: testConfig,
    });

    expect(results.summary.total).toBe(1);
    expect(results.summary.passed).toBe(0);
    expect(results.summary.failed).toBe(1);
    expect(results.summary.errors).toBeGreaterThanOrEqual(2);

    const [component] = results.components;
    expect(component.variations[0].valid).toBe(false);

    const ruleIds = component.variations[0].messages.map((m) => m.ruleId);
    expect(ruleIds).toContain("no-dup-attr");
    expect(ruleIds).toContain("wcag/h37");
  });

  test("form fixture fails with unlabelled input, empty heading, missing alt, and implicit button type", async () => {
    const results = await validateHtmlFiles(FORM_FIXTURE, {
      htmlValidateConfig: testConfig,
    });

    expect(results.summary.total).toBe(1);
    expect(results.summary.passed).toBe(0);
    expect(results.summary.failed).toBe(1);
    expect(results.summary.errors).toBeGreaterThanOrEqual(4);

    const [component] = results.components;
    expect(component.variations[0].valid).toBe(false);

    const ruleIds = component.variations[0].messages.map((m) => m.ruleId);
    expect(ruleIds).toContain("input-missing-label");
    expect(ruleIds).toContain("empty-heading");
    expect(ruleIds).toContain("wcag/h37");
    expect(ruleIds).toContain("no-implicit-button-type");
  });

  test("glob matching all fixtures produces correct summary", async () => {
    const results = await validateHtmlFiles(ALL_FIXTURES, {
      htmlValidateConfig: testConfig,
    });

    expect(results.summary.total).toBe(4);
    expect(results.summary.passed).toBe(2);
    expect(results.summary.failed).toBe(2);

    const componentNames = results.components.map((c) => c.component);
    expect(componentNames).toContain("button");
    expect(componentNames).toContain("card");
    expect(componentNames).toContain("icon");
    expect(componentNames).toContain("form");
  });
});
