import { describe, expect, test, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  loadPerformanceConfig,
  CONFIG_FILE_NAME,
} from "../../../lib/performance/config.js";

const tempRoots = [];

function makeTempCwd() {
  const dir = mkdtempSync(path.join(tmpdir(), "miyagi-perf-config-"));
  tempRoots.push(dir);
  return dir;
}

function writeConfig(cwd, contents) {
  const file = path.join(cwd, CONFIG_FILE_NAME);
  writeFileSync(
    file,
    typeof contents === "string" ? contents : JSON.stringify(contents),
  );
  return file;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("loadPerformanceConfig", () => {
  test("returns null when miyagi.performance.json is missing", () => {
    const cwd = makeTempCwd();
    expect(loadPerformanceConfig({ cwd })).toBeNull();
  });

  test("returns parsed object with defaults applied when file is empty object", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, {});

    const result = loadPerformanceConfig({ cwd });

    expect(result).toMatchObject({
      compression: "gzip",
      warnRatio: 0.8,
      components: {},
      pages: {},
    });
  });

  test("returns parsed object preserving user values", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, {
      compression: "brotli",
      warnRatio: 0.5,
      components: {
        "components/atoms/button": {
          css: { budget: "5 kB" },
          js: {},
        },
      },
      pages: {
        "templates/default": {
          variations: {
            home: {
              components: ["components/atoms/button"],
              budget: { css: "30 kB", total: "150 kB" },
            },
          },
        },
      },
    });

    const result = loadPerformanceConfig({ cwd });

    expect(result.compression).toBe("brotli");
    expect(result.warnRatio).toBe(0.5);
    expect(
      result.components["components/atoms/button"].css.budget,
    ).toBe("5 kB");
    expect(
      result.pages["templates/default"].variations.home.components,
    ).toEqual(["components/atoms/button"]);
  });

  test("throws a descriptive error on invalid JSON", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, "{ this is not json");

    expect(() => loadPerformanceConfig({ cwd })).toThrow(
      /miyagi\.performance\.json.*JSON/i,
    );
  });

  test("throws on unknown compression value", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, { compression: "deflate" });
    expect(() => loadPerformanceConfig({ cwd })).toThrow(/compression/i);
  });

  test("throws when warnRatio is outside (0, 1)", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, { warnRatio: 1.5 });
    expect(() => loadPerformanceConfig({ cwd })).toThrow(/warnRatio/i);
  });

  test("throws when warnRatio is zero", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, { warnRatio: 0 });
    expect(() => loadPerformanceConfig({ cwd })).toThrow(/warnRatio/i);
  });

  test("throws when components value is not an object", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, { components: ["nope"] });
    expect(() => loadPerformanceConfig({ cwd })).toThrow(/components/i);
  });

  test("throws when a page variation is missing the components array", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, {
      pages: {
        "templates/default": {
          variations: {
            broken: { budget: { css: "10 kB" } },
          },
        },
      },
    });
    expect(() => loadPerformanceConfig({ cwd })).toThrow(/components/i);
  });

  test("accepts a page variation without a budget", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, {
      pages: {
        "templates/default": {
          variations: {
            home: { components: ["components/atoms/button"] },
          },
        },
      },
    });

    expect(() => loadPerformanceConfig({ cwd })).not.toThrow();
  });

  test("falls through to default cwd when not provided", () => {
    const cwd = makeTempCwd();
    const cwdSpy = process.cwd();
    try {
      process.chdir(cwd);
      writeConfig(cwd, {});
      expect(loadPerformanceConfig()).toMatchObject({ compression: "gzip" });
    } finally {
      process.chdir(cwdSpy);
    }
  });

  test("exposes CONFIG_FILE_NAME as the canonical filename", () => {
    expect(CONFIG_FILE_NAME).toBe("miyagi.performance.json");
  });

  test("rejects empty components key (component name '')", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, { components: { "": {} } });
    expect(() => loadPerformanceConfig({ cwd })).toThrow();
  });

  test("rejects unknown top-level fields", () => {
    const cwd = makeTempCwd();
    writeConfig(cwd, { somethingElse: true });
    expect(() => loadPerformanceConfig({ cwd })).toThrow(/somethingelse|additional/i);
  });
});
