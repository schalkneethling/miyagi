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

  test("returns smaller-than-raw size for repetitive HTML under gzip", () => {
    const html = "<div>a</div>".repeat(500);
    const gzip = measureHtmlBytes(html, "gzip");
    expect(gzip).toBeGreaterThan(0);
    expect(gzip).toBeLessThan(Buffer.byteLength(html));
  });

  test("returns smaller-than-raw size under brotli", () => {
    const html = "<div>a</div>".repeat(500);
    const brotli = measureHtmlBytes(html, "brotli");
    expect(brotli).toBeGreaterThan(0);
    expect(brotli).toBeLessThan(Buffer.byteLength(html));
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

    await expect(
      measureHtml({
        templatePath: "templates/default",
        variation: "home",
        render,
        compression: "raw",
      }),
    ).rejects.toThrow(/templates\/default.*home/);
  });
});
