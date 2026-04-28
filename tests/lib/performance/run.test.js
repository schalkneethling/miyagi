import { describe, expect, test, afterEach, beforeEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runPerformance } from "../../../lib/performance/index.js";
import { clearMeasureCache } from "../../../lib/performance/measure.js";

const tempRoots = [];

function makeTempCwd() {
  const dir = mkdtempSync(path.join(tmpdir(), "miyagi-perf-run-"));
  tempRoots.push(dir);
  return dir;
}

function writeFile(cwd, relPath, contents) {
  const full = path.join(cwd, relPath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, contents);
}

beforeEach(() => clearMeasureCache());

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe("runPerformance", () => {
  test("returns { enabled: false } when no config file is present", async () => {
    const cwd = makeTempCwd();
    const result = await runPerformance({ cwd });
    expect(result).toEqual({ enabled: false });
  });

  test("measures all configured components", async () => {
    const cwd = makeTempCwd();
    writeFile(cwd, "components/atoms/button/button.css", "x".repeat(1700));
    writeFile(cwd, "components/atoms/button/button.js", "y".repeat(500));
    writeFile(cwd, "miyagi.performance.json", JSON.stringify({
      compression: "raw",
      components: {
        "components/atoms/button": {
          css: { budget: "2 kB" },
          js: {},
        },
      },
    }));

    const result = await runPerformance({ cwd });

    expect(result.enabled).toBe(true);
    expect(result.compression).toBe("raw");
    expect(result.warnRatio).toBe(0.8);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].componentPath).toBe("components/atoms/button");
    expect(result.components[0].css.bytes).toBe(1700);
    expect(result.components[0].css.status).toBe("warn");
    expect(result.components[0].js.status).toBe("unbudgeted");
  });

  test("measures pages when render function is supplied", async () => {
    const cwd = makeTempCwd();
    writeFile(cwd, "components/atoms/button/button.css", "x".repeat(1000));
    writeFile(cwd, "components/atoms/button/button.js", "");
    writeFile(cwd, "miyagi.performance.json", JSON.stringify({
      compression: "raw",
      components: { "components/atoms/button": { css: {}, js: {} } },
      pages: {
        "templates/default": {
          variations: {
            home: {
              components: ["components/atoms/button"],
              budget: { total: "10 kB" },
            },
          },
        },
      },
    }));

    const render = async () => "<html>" + "z".repeat(2000) + "</html>";
    const result = await runPerformance({ cwd, render });

    expect(result.pages).toHaveLength(1);
    const page = result.pages[0];
    expect(page.templatePath).toBe("templates/default");
    expect(page.variation).toBe("home");
    expect(page.totals.css.bytes).toBe(1000);
    expect(page.totals.html.bytes).toBeGreaterThan(2000);
    expect(page.totals.total.status).toBe("ok");
  });

  test("skips pages section when no render function is supplied", async () => {
    const cwd = makeTempCwd();
    writeFile(cwd, "components/atoms/button/button.css", "x");
    writeFile(cwd, "components/atoms/button/button.js", "");
    writeFile(cwd, "miyagi.performance.json", JSON.stringify({
      components: { "components/atoms/button": { css: {}, js: {} } },
      pages: {
        "templates/default": {
          variations: {
            home: { components: ["components/atoms/button"] },
          },
        },
      },
    }));

    const result = await runPerformance({ cwd });
    expect(result.pages).toEqual([]);
  });

  test("override options take precedence over config values", async () => {
    const cwd = makeTempCwd();
    writeFile(cwd, "miyagi.performance.json", JSON.stringify({
      compression: "gzip",
      warnRatio: 0.8,
    }));

    const result = await runPerformance({
      cwd,
      compression: "brotli",
      warnRatio: 0.5,
    });

    expect(result.compression).toBe("brotli");
    expect(result.warnRatio).toBe(0.5);
  });

  test("summary counts worst-status per component and per page", async () => {
    const cwd = makeTempCwd();
    writeFile(cwd, "components/a/a.css", "x".repeat(2000));
    writeFile(cwd, "components/a/a.js", "");
    writeFile(cwd, "components/b/b.css", "x".repeat(100));
    writeFile(cwd, "components/b/b.js", "");
    writeFile(cwd, "miyagi.performance.json", JSON.stringify({
      compression: "raw",
      components: {
        "components/a": { css: { budget: "1 kB" }, js: {} },
        "components/b": { css: { budget: "10 kB" }, js: {} },
      },
    }));

    const result = await runPerformance({ cwd });

    expect(result.summary.components).toMatchObject({
      exceed: 1, // a (css 2000 > 1000)
      ok: 1, // b
    });
  });

  test("pages with errors are tallied as failing in the summary", async () => {
    const cwd = makeTempCwd();
    writeFile(cwd, "components/atoms/button/button.css", "x");
    writeFile(cwd, "components/atoms/button/button.js", "");
    writeFile(cwd, "miyagi.performance.json", JSON.stringify({
      compression: "raw",
      components: { "components/atoms/button": { css: {}, js: {} } },
      pages: {
        "templates/default": {
          variations: {
            home: {
              components: ["components/atoms/button", "components/missing"],
            },
          },
        },
      },
    }));

    const render = async () => "<html></html>";
    const result = await runPerformance({ cwd, render });

    // The page's totals object has errors → page status must reflect
    // that, not "ok" / "unbudgeted".
    expect(result.summary.pages.missing).toBe(1);
    expect(result.summary.pages.ok).toBe(0);
  });

  test("resolves component files when componentsFolder splits the path from the config key", async () => {
    // Regression test: config keys (and dir.short) are relative to componentsFolder,
    // but files live at <cwd>/<componentsFolder>/<componentPath>. Without forwarding
    // componentsFolder the measurement resolves the wrong path and returns 0 B.
    const cwd = makeTempCwd();
    writeFile(cwd, "src/components/elements/button/button.css", "x".repeat(800));
    writeFile(cwd, "src/components/elements/button/button.js", "y".repeat(200));
    writeFile(cwd, "miyagi.performance.json", JSON.stringify({
      compression: "raw",
      components: {
        "elements/button": {
          css: { budget: "5 kB" },
          js: { budget: "10 kB" },
        },
      },
    }));

    const result = await runPerformance({
      cwd,
      componentsFolder: "src/components",
    });

    expect(result.enabled).toBe(true);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].css.bytes).toBe(800);
    expect(result.components[0].js.bytes).toBe(200);
    expect(result.components[0].css.status).toBe("ok");
    expect(result.components[0].js.status).toBe("ok");
  });

  test("pages whose components are missing from measurements record errors", async () => {
    const cwd = makeTempCwd();
    writeFile(cwd, "components/atoms/button/button.css", "x");
    writeFile(cwd, "components/atoms/button/button.js", "");
    writeFile(cwd, "miyagi.performance.json", JSON.stringify({
      components: { "components/atoms/button": { css: {}, js: {} } },
      pages: {
        "templates/default": {
          variations: {
            home: {
              components: ["components/atoms/button", "components/missing"],
            },
          },
        },
      },
    }));

    const render = async () => "<html></html>";
    const result = await runPerformance({ cwd, render });

    expect(result.pages[0].totals.errors).toEqual([
      { componentPath: "components/missing", reason: "not declared in config" },
    ]);
  });
});
