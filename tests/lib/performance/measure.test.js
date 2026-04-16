import { afterEach, beforeEach, describe, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import {
  clearMeasureCache,
  measure,
} from "../../../lib/performance/measure.js";

let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "miyagi-measure-"));
  clearMeasureCache();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

/**
 * @param {string} name
 * @param {string} contents
 * @returns {string}
 */
function write(name, contents) {
  const filePath = path.join(tmp, name);
  fs.writeFileSync(filePath, contents);
  return filePath;
}

describe("measure", () => {
  test("returns raw/gzip/brotli byte lengths matching zlib", () => {
    const contents = "body { color: red; }".repeat(50);
    const file = write("a.css", contents);

    const result = measure([{ category: "global-css", files: [file] }]);

    const raw = Buffer.byteLength(contents);
    const gzip = zlib.gzipSync(Buffer.from(contents)).byteLength;
    const brotli = zlib.brotliCompressSync(Buffer.from(contents), {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 },
    }).byteLength;

    const [measured] = result.categories["global-css"].files;
    expect(measured.raw).toBe(raw);
    expect(measured.gzip).toBe(gzip);
    expect(measured.brotli).toBe(brotli);
  });

  test("sums totals per category and overall", () => {
    const a = write("a.js", "a".repeat(1000));
    const b = write("b.js", "b".repeat(2000));
    const c = write("c.css", "c".repeat(500));

    const result = measure([
      { category: "global-js", files: [a, b] },
      { category: "global-css", files: [c] },
    ]);

    expect(result.categories["global-js"].totals.raw).toBe(3000);
    expect(result.categories["global-css"].totals.raw).toBe(500);
    expect(result.totals.raw).toBe(3500);
  });

  test("marks missing files but does not throw", () => {
    const ghost = path.join(tmp, "does-not-exist.js");
    const result = measure([{ category: "global-js", files: [ghost] }]);

    const [measured] = result.categories["global-js"].files;
    expect(measured.missing).toBe(true);
    expect(measured.raw).toBe(0);
    expect(result.totals.raw).toBe(0);
  });

  test("caches by mtime — unchanged file is not re-read into different numbers", () => {
    const file = write("a.txt", "hello");
    const first = measure([{ category: "a", files: [file] }]);
    const second = measure([{ category: "a", files: [file] }]);

    expect(first.categories.a.files[0]).toEqual(second.categories.a.files[0]);
  });
});
