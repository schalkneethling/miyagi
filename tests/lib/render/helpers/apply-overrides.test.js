import { describe, test, expect } from "vitest";
import applyOverrides from "../../../../lib/render/helpers/apply-overrides.js";

describe("applyOverrides", () => {
  describe("when overrides is null or undefined", () => {
    test("returns data unchanged when overrides is null", () => {
      const data = { color_scheme: "primary" };
      expect(applyOverrides(data, null)).toBe(data);
    });

    test("returns data unchanged when overrides is undefined", () => {
      const data = { color_scheme: "primary" };
      expect(applyOverrides(data, undefined)).toBe(data);
    });

    test("returns data unchanged when overrides is not an object", () => {
      const data = { color_scheme: "primary" };
      expect(applyOverrides(data, "string")).toBe(data);
    });
  });

  describe("string enum properties", () => {
    test("overrides a string property with the provided value", () => {
      const data = { color_scheme: "primary" };
      const schema = {
        properties: {
          color_scheme: { type: "string", enum: ["primary", "secondary"] },
        },
      };
      const result = applyOverrides(data, { color_scheme: "secondary" }, schema);
      expect(result.color_scheme).toBe("secondary");
    });

    test("keeps other properties unchanged", () => {
      const data = { color_scheme: "primary", label: "Click me" };
      const schema = {
        properties: {
          color_scheme: { type: "string", enum: ["primary", "secondary"] },
          label: { type: "string" },
        },
      };
      const result = applyOverrides(
        data,
        { color_scheme: "secondary" },
        schema,
      );
      expect(result.label).toBe("Click me");
    });

    test("returns a new object and does not mutate the original", () => {
      const data = { color_scheme: "primary" };
      const schema = {
        properties: {
          color_scheme: { type: "string", enum: ["primary", "secondary"] },
        },
      };
      const result = applyOverrides(data, { color_scheme: "secondary" }, schema);
      expect(result).not.toBe(data);
      expect(data.color_scheme).toBe("primary");
    });
  });

  describe("boolean properties", () => {
    test('coerces "true" string to boolean true', () => {
      const data = { disabled: false };
      const schema = {
        properties: { disabled: { type: "boolean" } },
      };
      const result = applyOverrides(data, { disabled: "true" }, schema);
      expect(result.disabled).toBe(true);
    });

    test('coerces "false" string to boolean false', () => {
      const data = { disabled: true };
      const schema = {
        properties: { disabled: { type: "boolean" } },
      };
      const result = applyOverrides(data, { disabled: "false" }, schema);
      expect(result.disabled).toBe(false);
    });

    test("any non-\"true\" string coerces to false", () => {
      const data = { disabled: true };
      const schema = {
        properties: { disabled: { type: "boolean" } },
      };
      const result = applyOverrides(data, { disabled: "yes" }, schema);
      expect(result.disabled).toBe(false);
    });
  });

  describe("numeric enum properties", () => {
    test("coerces a string to a number when enum values are all numbers", () => {
      const data = { columns: 1 };
      const schema = {
        properties: { columns: { enum: [1, 2, 3] } },
      };
      const result = applyOverrides(data, { columns: "2" }, schema);
      expect(result.columns).toBe(2);
      expect(typeof result.columns).toBe("number");
    });

    test("does not coerce to number when enum contains only strings", () => {
      const data = { size: "md" };
      const schema = {
        properties: { size: { enum: ["sm", "md", "lg"] } },
      };
      const result = applyOverrides(data, { size: "lg" }, schema);
      expect(result.size).toBe("lg");
      expect(typeof result.size).toBe("string");
    });

    test("does not coerce to number when enum has mixed types", () => {
      const data = { columns: "1" };
      const schema = {
        properties: { columns: { enum: [1, "two", 3] } },
      };
      const result = applyOverrides(data, { columns: "1" }, schema);
      expect(result.columns).toBe("1");
      expect(typeof result.columns).toBe("string");
    });
  });

  describe("unknown properties", () => {
    test("ignores properties not present in the schema", () => {
      const data = { color_scheme: "primary" };
      const schema = {
        properties: {
          color_scheme: { type: "string", enum: ["primary", "secondary"] },
        },
      };
      const result = applyOverrides(
        data,
        { color_scheme: "secondary", unknown_prop: "value" },
        schema,
      );
      expect(result).not.toHaveProperty("unknown_prop");
    });
  });

  describe("when schema is missing or empty", () => {
    test("returns data unchanged when schema is null", () => {
      const data = { color_scheme: "primary" };
      const result = applyOverrides(data, { color_scheme: "secondary" }, null);
      expect(result).toEqual({ color_scheme: "primary" });
    });

    test("returns data unchanged when schema has no properties", () => {
      const data = { color_scheme: "primary" };
      const result = applyOverrides(
        data,
        { color_scheme: "secondary" },
        { type: "object" },
      );
      expect(result).toEqual({ color_scheme: "primary" });
    });

    test("returns data unchanged when schema is undefined", () => {
      const data = { color_scheme: "primary" };
      const result = applyOverrides(data, { color_scheme: "secondary" });
      expect(result).toEqual({ color_scheme: "primary" });
    });
  });
});
