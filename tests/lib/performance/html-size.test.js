import { describe, expect, test } from "vitest";
import {
  measureHtmlBytes,
  measureHtml,
} from "../../../lib/performance/html-size.js";

describe("measureHtmlBytes", () => {
  test("returns raw byte length for compression='raw'", () => {
    const html = "<p>hello</p>";
    expect(measureHtmlBytes(html, "raw")).toBe(Buffer.byteLength(html));
  });

  test("each compression value routes to a distinct code path", () => {
    // We don't own gzip/brotli correctness — that's zlib's. What we
    // own is that the `compression` arg actually picks a different
    // code path for each value. If raw / gzip / brotli all returned
    // the same number for the same input, our routing would be broken
    // even if the individual compressors worked.
    const html = "<div>a</div>".repeat(500);
    const raw = measureHtmlBytes(html, "raw");
    const gzip = measureHtmlBytes(html, "gzip");
    const brotli = measureHtmlBytes(html, "brotli");

    expect(new Set([raw, gzip, brotli]).size).toBe(3);
  });

  test("throws on unknown compression", () => {
    expect(() => measureHtmlBytes("<p/>", "deflate")).toThrow(/compression/i);
  });
});

describe("measureHtml", () => {
  test("renders via the injected render function and measures the result", async () => {
    let called = null;
    const render = async (template, variation) => {
      called = { template, variation };
      return "<html></html>";
    };

    const { bytes, html } = await measureHtml({
      templatePath: "templates/default",
      variation: "home",
      render,
      compression: "raw",
    });

    expect(called).toEqual({
      template: "templates/default",
      variation: "home",
    });
    expect(html).toBe("<html></html>");
    expect(bytes).toBe(Buffer.byteLength("<html></html>"));
  });

  test("propagates render-function errors with template/variation context", async () => {
    const render = async () => {
      throw new Error("boom");
    };

    const promise = measureHtml({
      templatePath: "templates/default",
      variation: "home",
      render,
      compression: "raw",
    });

    await expect(promise).rejects.toThrow(/templates\/default.*home/);
    // The original error is preserved as `cause` so callers can inspect
    // the underlying failure (stack trace, custom error subclass, etc.).
    await expect(promise).rejects.toMatchObject({
      cause: expect.objectContaining({ message: "boom" }),
    });
  });
});
