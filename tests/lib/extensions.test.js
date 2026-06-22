import { describe, expect, test } from "vitest";
import {
  applyExtensionConfig,
  normalizeExtensionEntry,
  normalizeExtensions,
} from "../../lib/extensions.js";

describe("extension helpers", () => {
  test("normalizes a direct extension object", () => {
    const extension = { name: "direct-extension" };

    expect(normalizeExtensionEntry(extension)).toStrictEqual({
      extension,
      options: { locales: {} },
    });
  });

  test("normalizes a legacy tuple entry", () => {
    const extension = { name: "tuple-extension" };

    expect(normalizeExtensionEntry([extension, { locale: "en" }])).toStrictEqual(
      {
        extension,
        options: { locale: "en" },
      },
    );
  });

  test("normalizes a named plugin entry", () => {
    const extension = { name: "object-extension" };

    expect(
      normalizeExtensionEntry({
        plugin: extension,
        options: { assetRoot: "dist" },
      }),
    ).toStrictEqual({
      extension,
      options: { assetRoot: "dist" },
    });
  });

  test("filters invalid extension entries", () => {
    expect(normalizeExtensions([null, false, "plugin-name"])).toStrictEqual([]);
  });

  test("applies extension configuration hooks", () => {
    const extension = {
      configure({ options }) {
        return {
          assets: {
            shared: {
              css: [options.cssFile],
            },
          },
          watch: {
            sources: [
              {
                id: "extension-fixtures",
                type: "dir",
                path: "./fixtures/",
              },
            ],
          },
        };
      },
    };

    expect(
      applyExtensionConfig({
        extensions: [{ plugin: extension, options: { cssFile: "tokens.css" } }],
      }),
    ).toStrictEqual({
      extensions: [{ extension, options: { cssFile: "tokens.css" } }],
      assets: {
        shared: {
          css: ["tokens.css"],
        },
      },
      watch: {
        sources: [
          {
            id: "extension-fixtures",
            type: "dir",
            path: "./fixtures/",
          },
        ],
      },
    });
  });
});
