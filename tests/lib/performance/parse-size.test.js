import { describe, test, expect } from "vitest";
import parseSize, {
  formatSize,
} from "../../../lib/performance/parse-size.js";

describe("parseSize", () => {
  test("returns null for null / undefined", () => {
    expect(parseSize(null)).toBe(null);
    expect(parseSize(undefined)).toBe(null);
  });

  test("treats bare numbers as bytes", () => {
    expect(parseSize(0)).toBe(0);
    expect(parseSize(1024)).toBe(1024);
    expect(parseSize(1.9)).toBe(2);
  });

  test("parses decimal kB / KB / MB / GB units", () => {
    expect(parseSize("50 kB")).toBe(50000);
    expect(parseSize("50KB")).toBe(50000);
    expect(parseSize("1.5 MB")).toBe(1500000);
    expect(parseSize("2 GB")).toBe(2000000000);
  });

  test("is case-insensitive and tolerates missing whitespace", () => {
    expect(parseSize("35kb")).toBe(35000);
    expect(parseSize("35 KB")).toBe(35000);
    expect(parseSize("35 Kb")).toBe(35000);
  });

  test("treats plain digit strings as bytes (implicit B)", () => {
    expect(parseSize("1024")).toBe(1024);
    expect(parseSize("2048 B")).toBe(2048);
  });

  test("throws for garbage strings", () => {
    expect(() => parseSize("not a size")).toThrow(TypeError);
    expect(() => parseSize("50 tb")).toThrow(TypeError);
    expect(() => parseSize("")).toThrow(TypeError);
  });

  test("throws for negative or non-finite numbers", () => {
    expect(() => parseSize(-10)).toThrow(TypeError);
    expect(() => parseSize(Number.POSITIVE_INFINITY)).toThrow(TypeError);
    expect(() => parseSize(Number.NaN)).toThrow(TypeError);
  });
});

describe("formatSize", () => {
  test("formats null / undefined as em-dash", () => {
    expect(formatSize(null)).toBe("—");
    expect(formatSize(undefined)).toBe("—");
  });

  test("formats bytes under 1 kB as plain bytes", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(512)).toBe("512 B");
  });

  test("formats kilobytes and megabytes", () => {
    expect(formatSize(50000)).toBe("50.00 kB");
    expect(formatSize(1500000)).toBe("1.50 MB");
  });
});
