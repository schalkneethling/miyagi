import { describe, expect, test } from "vitest";
import {
  buildComponentPerfSection,
  buildPagePerfBanner,
} from "../../../lib/performance/view-data.js";

const enabledResult = {
  enabled: true,
  compression: "gzip",
  warnRatio: 0.8,
  components: [
    {
      componentPath: "components/atoms/button",
      css: { path: "/x/button.css", bytes: 1234, budget: 5000, status: "ok" },
      js: { path: "/x/button.js", bytes: 800, budget: null, status: "unbudgeted" },
    },
  ],
  pages: [
    {
      templatePath: "templates/default",
      variation: "home",
      totals: {
        css: { bytes: 1234, budget: null, status: "unbudgeted" },
        js: { bytes: 800, budget: null, status: "unbudgeted" },
        html: { bytes: 4000, budget: 30000, status: "ok" },
        total: { bytes: 6034, budget: 150000, status: "ok" },
        errors: [],
      },
    },
  ],
  summary: { components: {}, pages: {} },
};

describe("buildComponentPerfSection", () => {
  test("returns null when run result is null / disabled", () => {
    expect(buildComponentPerfSection(null, "x")).toBeNull();
    expect(
      buildComponentPerfSection({ enabled: false }, "x"),
    ).toBeNull();
  });

  test("returns null when componentPath is not in the result", () => {
    expect(
      buildComponentPerfSection(enabledResult, "components/missing"),
    ).toBeNull();
  });

  test("returns view data with bytesLabel and budgetLabel for budgeted asset", () => {
    const result = buildComponentPerfSection(
      enabledResult,
      "components/atoms/button",
    );
    expect(result).toMatchObject({
      componentPath: "components/atoms/button",
      css: {
        bytes: 1234,
        bytesLabel: "1.23 kB",
        budget: 5000,
        budgetLabel: "5.00 kB",
        status: "ok",
        path: "/x/button.css",
      },
      js: {
        bytes: 800,
        budgetLabel: null,
        status: "unbudgeted",
      },
    });
  });
});

describe("buildPagePerfBanner", () => {
  test("returns null when run result is null / disabled", () => {
    expect(buildPagePerfBanner(null, "x", "y")).toBeNull();
    expect(buildPagePerfBanner({ enabled: false }, "x", "y")).toBeNull();
  });

  test("returns null when (templatePath, variation) is not in the result", () => {
    expect(
      buildPagePerfBanner(enabledResult, "templates/default", "missing"),
    ).toBeNull();
  });

  test("returns view data with all four metrics", () => {
    const banner = buildPagePerfBanner(
      enabledResult,
      "templates/default",
      "home",
    );
    expect(banner).toMatchObject({
      templatePath: "templates/default",
      variation: "home",
      css: { bytes: 1234, status: "unbudgeted" },
      js: { bytes: 800, status: "unbudgeted" },
      html: { bytes: 4000, budgetLabel: "30.00 kB", status: "ok" },
      total: { bytes: 6034, budgetLabel: "150.00 kB", status: "ok" },
    });
  });
});
