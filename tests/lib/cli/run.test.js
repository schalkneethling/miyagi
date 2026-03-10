import { beforeEach, describe, expect, test, vi } from "vitest";
import { EXIT_CODES, MiyagiError } from "../../../lib/errors.js";

const {
  mockInitRendering,
  mockGetConfig,
  mockMockGenerator,
  mockLint,
  mockComponent,
  mockDrupalAssets,
  mockDoctor,
  mockLog,
} = vi.hoisted(() => ({
  mockInitRendering: vi.fn(),
  mockGetConfig: vi.fn(),
  mockMockGenerator: vi.fn(),
  mockLint: vi.fn(),
  mockComponent: vi.fn(),
  mockDrupalAssets: vi.fn(),
  mockDoctor: vi.fn(),
  mockLog: vi.fn(),
}));

vi.mock("../../../lib/init/rendering.js", () => ({
  default: mockInitRendering,
}));

vi.mock("../../../lib/config.js", () => ({
  default: mockGetConfig,
}));

vi.mock("../../../lib/generator/mocks.js", () => ({
  default: mockMockGenerator,
}));

vi.mock("../../../lib/cli/index.js", () => ({
  lint: mockLint,
  component: mockComponent,
  drupalAssets: mockDrupalAssets,
  doctor: mockDoctor,
}));

vi.mock("../../../lib/logger.js", () => ({
  default: mockLog,
}));

import { runCli } from "../../../lib/cli/run.js";

describe("runCli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NODE_ENV;
    delete process.env.VERBOSE;
    global.config = undefined;
    mockGetConfig.mockResolvedValue({
      components: {
        folder: "src/components",
      },
      docs: {
        folder: "docs",
      },
      files: {
        mocks: {
          name: "mocks",
          extension: ["json"],
        },
        schema: {
          name: "schema",
          extension: "json",
        },
      },
    });
  });

  test("returns rendering result for start", async () => {
    mockInitRendering.mockResolvedValue({
      success: true,
      code: 0,
      shouldExit: false,
      port: 5000,
    });

    const result = await runCli(["node", "miyagi", "start", "--verbose"]);

    expect(mockGetConfig).toHaveBeenCalled();
    expect(mockInitRendering).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.objectContaining({
          folder: "src/components",
        }),
      }),
    );
    expect(process.env.NODE_ENV).toBe("development");
    expect(process.env.VERBOSE).toBe("true");
    expect(result).toStrictEqual({
      success: true,
      code: EXIT_CODES.SUCCESS,
      shouldExit: false,
      port: 5000,
    });
  });

  test("maps mock generator failures to exit code 1", async () => {
    mockMockGenerator.mockResolvedValue({
      success: false,
      message: {
        type: "error",
        text: "No schema file.",
      },
    });

    const result = await runCli(["node", "miyagi", "mocks", "atoms/button"]);

    expect(mockMockGenerator).toHaveBeenCalledWith(
      "atoms/button",
      expect.objectContaining({
        mocks: expect.any(Object),
      }),
    );
    expect(result).toStrictEqual({
      success: false,
      code: EXIT_CODES.GENERAL_ERROR,
      shouldExit: true,
      message: "No schema file.",
    });
  });

  test("returns parser failures as cli usage errors", async () => {
    const result = await runCli(["node", "miyagi", "unknown"]);

    expect(result.success).toBe(false);
    expect(result.code).toBe(EXIT_CODES.CLI_USAGE_ERROR);
    expect(result.shouldExit).toBe(true);
  });

  test("logs a doctor hint for config errors outside doctor", async () => {
    mockGetConfig.mockResolvedValue({
      components: {
        folder: null,
      },
      docs: {
        folder: null,
      },
      files: {
        mocks: {
          name: "mocks",
          extension: ["json"],
        },
        schema: {
          name: "schema",
          extension: "json",
        },
      },
    });

    const result = await runCli(["node", "miyagi", "start"]);

    expect(result.code).toBe(EXIT_CODES.CONFIG_ERROR);
    expect(mockLog).toHaveBeenCalledWith(
      "info",
      "Run `miyagi doctor` for a setup check.",
    );
  });

  test("does not double-log MiyagiError instances already marked logged", async () => {
    mockDoctor.mockRejectedValue(
      new MiyagiError("Already logged.", {
        code: EXIT_CODES.CONFIG_ERROR,
        logged: true,
      }),
    );

    const result = await runCli(["node", "miyagi", "doctor"]);

    expect(result).toStrictEqual({
      success: false,
      code: EXIT_CODES.CONFIG_ERROR,
      shouldExit: true,
      message: "Already logged.",
    });
    expect(mockLog).not.toHaveBeenCalledWith("error", "Already logged.");
  });

  test("does not log a doctor hint when already running doctor", async () => {
    mockDoctor.mockRejectedValue(
      new MiyagiError("Doctor config issue.", {
        code: EXIT_CODES.CONFIG_ERROR,
        logged: true,
      }),
    );

    await runCli(["node", "miyagi", "doctor"]);

    expect(mockLog).not.toHaveBeenCalledWith(
      "info",
      "Run `miyagi doctor` for a setup check.",
    );
  });
});
