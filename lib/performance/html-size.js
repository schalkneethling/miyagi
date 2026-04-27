// @ts-check

import zlib from "node:zlib";

/**
 * @param {string} html - the rendered HTML string
 * @param {"raw"|"gzip"|"brotli"} compression - which size to report
 * @returns {number} byte length under the chosen compression
 */
export function measureHtmlBytes(html, compression) {
  const buffer = Buffer.from(html);
  if (compression === "raw") {
    return buffer.byteLength;
  }
  if (compression === "gzip") {
    return zlib.gzipSync(buffer).byteLength;
  }
  if (compression === "brotli") {
    return zlib.brotliCompressSync(buffer, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 },
    }).byteLength;
  }
  throw new Error(`Unknown compression "${compression}".`);
}

/**
 * Render a page variation through the supplied render function and report
 * its compressed byte size. The render function is injected so this module
 * stays pure for tests; in production the caller wires it to the existing
 * Miyagi render pipeline.
 * @param {{
 *   templatePath: string,
 *   variation: string,
 *   render: (templatePath: string, variation: string) => Promise<string>,
 *   compression: "raw"|"gzip"|"brotli",
 * }} options
 * @returns {Promise<{ html: string, bytes: number }>}
 */
export async function measureHtml({
  templatePath,
  variation,
  render,
  compression,
}) {
  let html;
  try {
    html = await render(templatePath, variation);
  } catch (error) {
    throw new Error(
      `Failed to render ${templatePath} (${variation}): ${error.message}`,
      { cause: error },
    );
  }
  return { html, bytes: measureHtmlBytes(html, compression) };
}
