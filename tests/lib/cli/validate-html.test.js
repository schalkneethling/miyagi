import { beforeEach, describe, expect, test, vi } from "vitest";
import { EXIT_CODES } from "../../../lib/errors.js";

const {
  mockGetConfig,
  mockInit,
  mockValidateAllHtml,
  mockValidateComponentHtml,
  mockValidateHtmlFiles,
  mockGenerateMarkdownReport,
  mockLog,
  mockWriteFile,
} = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
  mockInit: vi.fn(),
  mockValidateAllHtml: vi.fn(),
  mockValidateComponentHtml: vi.fn(),
  mockValidateHtmlFiles: vi.fn(),
  mockGenerateMarkdownReport: vi.fn(),
  mockLog: vi.fn(),
  mockWriteFile: vi.fn(),
}));

vi.mock("../../../lib/config.js", () => ({
  default: mockGetConfig,
}));

vi.mock("../../../lib/cli/app.js", () => ({
  default: mockInit,
}));

vi.mock("../../../lib/validator/html.js", () => ({
  validateAllHtml: mockValidateAllHtml,
  validateComponentHtml: mockValidateComponentHtml,
  validateHtmlFiles: mockValidateHtmlFiles,
}));

vi.mock("../../../lib/validator/html-report.js", () => ({
  generateMarkdownReport: mockGenerateMarkdownReport,
}));

vi.mock("../../../lib/logger.js", () => ({
  default: mockLog,
}));

vi.mock("node:fs/promises", () => ({
  writeFile: mockWriteFile,
}));

import validateHtml from "../../../lib/cli/validate-html.js";

const baseConfig = {
  components: { folder: "src" },
  htmlValidation: { output: "html-validation-report.md" },
};

const passingResults = {
  components: [
    {
      component: "button",
      variations: [{ name: "default", valid: true, messages: [] }],
    },
  ],
  summary: { total: 1, passed: 1, failed: 0, errors: 0, warnings: 0 },
};

const failingResults = {
  components: [
    {
      component: "button",
      variations: [
        {
          name: "default",
          valid: false,
          messages: [
            {
              severity: 2,
              message: "test error",
              ruleId: "test",
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

describe("validate-html CLI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.config = baseConfig;
    global.state = {
      routes: [
        {
          type: "components",
          alias: "button",
          paths: {
            dir: { short: "button" },
            tpl: { full: "/src/button/button.twig" },
          },
        },
      ],
    };
    mockGetConfig.mockResolvedValue(baseConfig);
    mockInit.mockResolvedValue({});
    mockGenerateMarkdownReport.mockReturnValue("# Report");
    mockWriteFile.mockResolvedValue();
  });

  test("validates all components in render mode", async () => {
    mockValidateAllHtml.mockResolvedValue(passingResults);

    const result = await validateHtml({});

    expect(mockInit).toHaveBeenCalled();
    expect(mockValidateAllHtml).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.code).toBe(EXIT_CODES.SUCCESS);
  });

  test("validates a single component", async () => {
    mockValidateComponentHtml.mockResolvedValue({
      component: "button",
      variations: [{ name: "default", valid: true, messages: [] }],
    });

    const result = await validateHtml({ component: "src/button" });

    expect(mockValidateComponentHtml).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test("returns error for non-existent component", async () => {
    const result = await validateHtml({ component: "src/nonexistent" });

    expect(result.success).toBe(false);
    expect(result.code).toBe(EXIT_CODES.CLI_USAGE_ERROR);
  });

  test("uses files mode when --files is provided", async () => {
    mockValidateHtmlFiles.mockResolvedValue(passingResults);

    const result = await validateHtml({
      files: "build/*.html",
    });

    expect(mockValidateHtmlFiles).toHaveBeenCalledWith("build/*.html");
    expect(mockInit).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test("returns VALIDATION_ERROR when validation fails", async () => {
    mockValidateAllHtml.mockResolvedValue(failingResults);

    const result = await validateHtml({});

    expect(result.success).toBe(false);
    expect(result.code).toBe(EXIT_CODES.VALIDATION_ERROR);
  });

  test("uses --output for report path", async () => {
    mockValidateAllHtml.mockResolvedValue(passingResults);

    await validateHtml({ output: "custom-report.md" });

    expect(mockWriteFile).toHaveBeenCalledWith(
      "custom-report.md",
      "# Report",
      "utf-8",
    );
  });
});
