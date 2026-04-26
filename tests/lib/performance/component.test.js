import { describe, expect, test, afterEach, beforeEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { measureComponent } from "../../../lib/performance/component.js";
import { clearMeasureCache } from "../../../lib/performance/measure.js";

const tempRoots = [];

function makeTempCwd() {
  const dir = mkdtempSync(path.join(tmpdir(), "miyagi-perf-component-"));
  tempRoots.push(dir);
  return dir;
}

function writeComponent(cwd, relPath, files) {
  const folder = path.join(cwd, relPath);
  mkdirSync(folder, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(path.join(folder, name), contents);
  }
  return folder;
}

beforeEach(() => clearMeasureCache());

afterEach(() => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("measureComponent", () => {
  test("locates <component-name>.css and .js by terminal folder segment", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": ".btn { color: red; }",
      "button.js": "export const x = 1;",
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: {}, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.componentPath).toBe("components/atoms/button");
    expect(result.css.bytes).toBe(20);
    expect(result.js.bytes).toBe("export const x = 1;".length);
    expect(result.css.status).toBe("unbudgeted");
    expect(result.js.status).toBe("unbudgeted");
  });

  test("ignores .miyagi.css/.miyagi.js infix; only <name>.css/.js are read", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.miyagi.css": ".btn-old { color: red; }",
      "button.miyagi.js": "console.log('legacy');",
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: {}, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.status).toBe("missing");
    expect(result.js.status).toBe("missing");
    expect(result.css.bytes).toBe(0);
    expect(result.js.bytes).toBe(0);
  });

  test("classifies as ok when bytes < warnRatio * budget", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": "x".repeat(100),
      "button.js": "y".repeat(100),
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: { budget: "1 kB" }, js: { budget: "1 kB" } },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.status).toBe("ok");
    expect(result.js.status).toBe("ok");
  });

  test("classifies as warn when warnRatio * budget <= bytes <= budget", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": "x".repeat(850),
      "button.js": "y".repeat(900),
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: { budget: "1 kB" }, js: { budget: "1 kB" } },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.status).toBe("warn");
    expect(result.js.status).toBe("warn");
  });

  test("classifies as exceed when bytes > budget", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": "x".repeat(2000),
      "button.js": "y".repeat(50),
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: { budget: "1 kB" }, js: { budget: "1 kB" } },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.status).toBe("exceed");
    expect(result.js.status).toBe("ok");
  });

  test("status is 'missing' when asset file is absent", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": ".btn { color: red; }",
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: {}, js: { budget: "10 kB" } },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.status).toBe("unbudgeted");
    expect(result.js.status).toBe("missing");
    expect(result.js.bytes).toBe(0);
  });

  test("respects custom warnRatio", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": "x".repeat(550),
      "button.js": "",
    });

    const lenient = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: { budget: "1 kB" }, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });
    expect(lenient.css.status).toBe("ok");

    const strict = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: { budget: "1 kB" }, js: {} },
      compression: "raw",
      warnRatio: 0.5,
    });
    expect(strict.css.status).toBe("warn");
  });

  test("uses gzip-compressed bytes when compression is 'gzip'", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": "a".repeat(10000),
      "button.js": "b".repeat(10000),
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: {}, js: {} },
      compression: "gzip",
      warnRatio: 0.8,
    });

    expect(result.css.bytes).toBeLessThan(10000);
    expect(result.js.bytes).toBeLessThan(10000);
  });

  test("returns the absolute file path so the UI can show it", () => {
    const cwd = makeTempCwd();
    const folder = writeComponent(cwd, "components/atoms/button", {
      "button.css": ".btn {}",
      "button.js": "1",
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: {}, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.path).toBe(path.join(folder, "button.css"));
    expect(result.js.path).toBe(path.join(folder, "button.js"));
  });

  test("returns the parsed budget bytes when budget is set", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": ".btn {}",
      "button.js": "1",
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: { budget: "5 kB" }, js: { budget: "10 kB" } },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.budget).toBe(5000);
    expect(result.js.budget).toBe(10000);
  });
});
