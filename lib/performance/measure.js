/**
 * Measure on-disk, gzip-compressed, and brotli-compressed sizes of files.
 * Transfer size is what a user actually downloads, which is almost never the raw
 * on-disk size — gzip and brotli are reported alongside raw so users can see all
 * three and pick the metric their hosting actually serves.
 * We measure whichever files the user has configured in their assets — source
 * files, bundled output from esbuild/rollup/webpack, or anything else. Point
 * `config.assets` at the files you actually ship and the budget reflects reality.
 * Results are cached by absolute path + mtime. In dev the file watcher changes
 * the mtime on every save, naturally invalidating the cache.
 * @module performance/measure
 */

import fs from "node:fs";
import zlib from "node:zlib";

const cache = new Map();

/**
 * @typedef {object} FileMeasurement
 * @property {string} path - absolute path
 * @property {number} raw - on-disk byte length
 * @property {number} gzip - gzip-compressed byte length
 * @property {number} brotli - brotli-compressed byte length
 * @property {boolean} [missing] - true when the file could not be read
 */

/**
 * @typedef {object} CategoryMeasurement
 * @property {FileMeasurement[]} files - per-file measurements in this category
 * @property {{raw: number, gzip: number, brotli: number}} totals - sum across files
 */

/**
 * @typedef {object} Measurement
 * @property {Record<string, CategoryMeasurement>} categories - keyed by category name
 * @property {{raw: number, gzip: number, brotli: number}} totals - sum across categories
 */

/**
 * Clear the cached results. Intended for tests and for watcher-driven
 * whole-state refreshes.
 * @returns {void}
 */
export function clearMeasureCache() {
  cache.clear();
}

/**
 * @param {string} absPath
 * @returns {FileMeasurement}
 */
function measureFile(absPath) {
  // Open a file descriptor first, then stat and read through it. This avoids
  // a race where the file is modified between stat and read — both operations
  // now refer to the same version of the file.
  let fd;
  try {
    fd = fs.openSync(absPath, "r");
  } catch {
    return { path: absPath, raw: 0, gzip: 0, brotli: 0, missing: true };
  }

  let stat;
  let buffer;
  try {
    stat = fs.fstatSync(fd);
    buffer = Buffer.alloc(stat.size);
    fs.readSync(fd, buffer, 0, stat.size, 0);
  } catch {
    fs.closeSync(fd);
    return { path: absPath, raw: 0, gzip: 0, brotli: 0, missing: true };
  }
  fs.closeSync(fd);

  const cacheKey = `${absPath}:${stat.mtimeMs}:${stat.size}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const measurement = {
    path: absPath,
    raw: buffer.byteLength,
    gzip: zlib.gzipSync(buffer).byteLength,
    // Brotli default is text mode with maximum quality which is _very_ slow on
    // large files; use quality 6 to approximate what a CDN typically serves.
    brotli: zlib.brotliCompressSync(buffer, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 },
    }).byteLength,
  };

  cache.set(cacheKey, measurement);
  return measurement;
}

/**
 * Measure a set of categorised file lists.
 * @param {{category: string, files: string[]}[]} categorised
 * @returns {Measurement}
 */
export function measure(categorised) {
  /** @type {Record<string, CategoryMeasurement>} */
  const categories = {};
  const grand = { raw: 0, gzip: 0, brotli: 0 };

  for (const { category, files } of categorised) {
    const measured = files.map((absPath) => measureFile(absPath));
    const totals = measured.reduce(
      (acc, file) => ({
        raw: acc.raw + file.raw,
        gzip: acc.gzip + file.gzip,
        brotli: acc.brotli + file.brotli,
      }),
      { raw: 0, gzip: 0, brotli: 0 },
    );

    categories[category] = { files: measured, totals };
    grand.raw += totals.raw;
    grand.gzip += totals.gzip;
    grand.brotli += totals.brotli;
  }

  return { categories, totals: grand };
}
