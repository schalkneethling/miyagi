import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tempCwd;
let originalCwd;
let stdoutChunks;
let originalWrite;

function writeFile(rel, contents) {
  const full = path.join(tempCwd, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, contents);
}

beforeEach(() => {
  tempCwd = mkdtempSync(path.join(tmpdir(), "miyagi-perf-cli-"));
  originalCwd = process.cwd();
  process.chdir(tempCwd);
  stdoutChunks = [];
  originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    stdoutChunks.push(chunk.toString ? chunk.toString() : String(chunk));
    return true;
  };
});

afterEach(() => {
  process.stdout.write = originalWrite;
  process.chdir(originalCwd);
  rmSync(tempCwd, { recursive: true, force: true });
  vi.restoreAllMocks();
});

async function importCliPerf() {
  // Re-import per test so module state doesn't leak across temp cwds.
  vi.resetModules();
  const mod = await import("../../../lib/cli/perf.js");
  return mod.default;
}

describe("miyagi perf CLI", () => {
  test("prints disabled message and exits 0 when no config file", async () => {
    const perfCli = await importCliPerf();
    const result = await perfCli({});
    expect(result.success).toBe(true);
    expect(result.code).toBe(0);
  });

  test("--json emits parseable JSON", async () => {
    writeFile("components/atoms/button/button.css", "x".repeat(100));
    writeFile("components/atoms/button/button.js", "");
    writeFile(
      "miyagi.performance.json",
      JSON.stringify({
        compression: "raw",
        components: { "components/atoms/button": { css: {}, js: {} } },
      }),
    );

    // Stub the heavy init() call so we don't bring up the full app.
    vi.doMock("../../../lib/index.js", () => ({
      default: async () => ({}),
    }));
    vi.doMock("../../../lib/config.js", () => ({
      default: async () => ({}),
    }));

    const perfCli = await importCliPerf();
    await perfCli({ json: true });

    const out = stdoutChunks.join("");
    const parsed = JSON.parse(out);
    expect(parsed.enabled).toBe(true);
    expect(parsed.compression).toBe("raw");
    expect(parsed.components).toHaveLength(1);
  });

  test("--fail exits non-zero when a component exceeds its budget", async () => {
    writeFile("components/atoms/button/button.css", "x".repeat(2000));
    writeFile("components/atoms/button/button.js", "");
    writeFile(
      "miyagi.performance.json",
      JSON.stringify({
        compression: "raw",
        components: {
          "components/atoms/button": {
            css: { budget: "1 kB" },
            js: {},
          },
        },
      }),
    );

    vi.doMock("../../../lib/index.js", () => ({ default: async () => ({}) }));
    vi.doMock("../../../lib/config.js", () => ({ default: async () => ({}) }));

    const perfCli = await importCliPerf();
    const result = await perfCli({ fail: true });
    expect(result.success).toBe(false);
    expect(result.code).not.toBe(0);
  });

  test("--compression overrides config", async () => {
    writeFile("components/atoms/button/button.css", "x".repeat(2000));
    writeFile("components/atoms/button/button.js", "");
    writeFile(
      "miyagi.performance.json",
      JSON.stringify({
        compression: "raw",
        components: { "components/atoms/button": { css: {}, js: {} } },
      }),
    );

    vi.doMock("../../../lib/index.js", () => ({ default: async () => ({}) }));
    vi.doMock("../../../lib/config.js", () => ({ default: async () => ({}) }));

    const perfCli = await importCliPerf();
    await perfCli({ json: true, compression: "brotli" });
    const out = stdoutChunks.join("");
    const parsed = JSON.parse(out);
    expect(parsed.compression).toBe("brotli");
    expect(parsed.components[0].css.bytes).toBeLessThan(2000);
  });
});
