import { describe, expect, test, afterEach, beforeEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  cpSync,
  readdirSync,
  statSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { measureComponent } from "../../../lib/performance/component.js";
import { clearMeasureCache } from "../../../lib/performance/measure.js";

const FIXTURES_ROOT = path.join(
  import.meta.dirname,
  "../../_setup/perf-fixtures",
);

const tempRoots = [];

function makeTempCwd() {
  const dir = mkdtempSync(path.join(tmpdir(), "miyagi-perf-component-"));
  tempRoots.push(dir);
  return dir;
}

function* walkFiles(dir, ext) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkFiles(full, ext);
    } else if (full.endsWith(ext)) {
      yield full;
    }
  }
}

function sumFilesIn(dir, ext) {
  let total = 0;
  for (const file of walkFiles(dir, ext)) {
    total += readFileSync(file).byteLength;
  }
  return total;
}

function countFilesIn(dir, ext) {
  return [...walkFiles(dir, ext)].length;
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

  test("walks JS imports and counts every reachable file", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.js": `import "./helpers/dom.js";\nimport "./helpers/format.js";\nexport const x = 1;\n`,
    });
    writeComponent(cwd, "components/atoms/button/helpers", {
      "dom.js": "x".repeat(500),
      "format.js": "y".repeat(800),
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: {}, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });

    // Entry file plus both helpers should be summed; raw size should
    // dominantly reflect the helper sizes (500 + 800 = 1300 plus the
    // small entry).
    expect(result.js.bytes).toBeGreaterThan(1300);
  });

  test("walks CSS @import statements and counts every reachable file", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": `@import url("./helpers/typography.css");\n.btn { color: red; }\n`,
    });
    writeComponent(cwd, "components/atoms/button/helpers", {
      "typography.css": "a".repeat(2000),
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: {}, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.bytes).toBeGreaterThan(2000);
  });

  test("walks every JS import pattern (named, default, star, reexport, side-effect)", () => {
    // Stage the js-imports fixture as a "component" by giving it the
    // entry-file naming convention measureComponent expects.
    const cwd = makeTempCwd();
    cpSync(
      path.join(FIXTURES_ROOT, "js-imports"),
      path.join(cwd, "components/js-imports"),
      { recursive: true },
    );
    // Rename entry.js → js-imports.js to match the <component-name>.js rule.
    const folder = path.join(cwd, "components/js-imports");
    cpSync(path.join(folder, "entry.js"), path.join(folder, "js-imports.js"));
    rmSync(path.join(folder, "entry.js"));
    // Stub CSS so component.js is happy.
    writeFileSync(path.join(folder, "js-imports.css"), "");

    const result = measureComponent({
      cwd,
      componentPath: "components/js-imports",
      entry: { css: {}, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });

    // Sum the on-disk size of every .js file in the fixture (minus the
    // renamed-away entry.js, plus the renamed-in js-imports.js). If the
    // walker missed any pattern, the measured bytes would be smaller.
    const expected = sumFilesIn(folder, ".js");
    expect(result.js.bytes).toBe(expected);
    // Sanity: the fixture has a non-trivial number of files.
    expect(countFilesIn(folder, ".js")).toBeGreaterThanOrEqual(8);
  });

  test("walks every CSS @import variant (quoted, single-quoted, url(), bare url())", () => {
    const cwd = makeTempCwd();
    cpSync(
      path.join(FIXTURES_ROOT, "css-imports"),
      path.join(cwd, "components/css-imports"),
      { recursive: true },
    );
    const folder = path.join(cwd, "components/css-imports");
    cpSync(
      path.join(folder, "entry.css"),
      path.join(folder, "css-imports.css"),
    );
    rmSync(path.join(folder, "entry.css"));
    writeFileSync(path.join(folder, "css-imports.js"), "");

    const result = measureComponent({
      cwd,
      componentPath: "components/css-imports",
      entry: { css: {}, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });

    const expected = sumFilesIn(folder, ".css");
    expect(result.css.bytes).toBe(expected);
    expect(countFilesIn(folder, ".css")).toBe(5);
  });

  test("falls back to the entry file when the import walker fails", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      // Deliberately broken JS — dependency-tree should bail; we still
      // want a measurement of the entry file rather than a thrown error.
      "button.js": "import from",
      "button.css": ".btn {}",
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: {}, js: {} },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.js.status).toBe("unbudgeted");
    expect(result.js.bytes).toBe("import from".length);
  });

  test("zero-byte asset against zero budget classifies as ok, not warn", () => {
    const cwd = makeTempCwd();
    writeComponent(cwd, "components/atoms/button", {
      "button.css": "",
      "button.js": "",
    });

    const result = measureComponent({
      cwd,
      componentPath: "components/atoms/button",
      entry: { css: { budget: "0 B" }, js: { budget: "0 B" } },
      compression: "raw",
      warnRatio: 0.8,
    });

    expect(result.css.status).toBe("ok");
    expect(result.js.status).toBe("ok");
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
