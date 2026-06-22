import { describe, expect, test } from "vitest";
import { extendTemplateData } from "../../../lib/render/helpers.js";

describe("render helpers", () => {
  test("ignores non-callable extension template data hooks", async () => {
    const data = { title: "Button" };

    await expect(
      extendTemplateData(
        {
          components: { folder: "src" },
          extensions: [{ extendTemplateData: true }],
        },
        data,
        {
          paths: {
            tpl: {
              short: "button/button.twig",
            },
          },
        },
      ),
    ).resolves.toBe(data);
  });
});
