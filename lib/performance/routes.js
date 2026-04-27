// @ts-check

import { existsSync } from "node:fs";
import path from "node:path";
import { CONFIG_FILE_NAME } from "./config.js";
import { runPerformance } from "./index.js";

/**
 * Attach performance API routes to the supplied Express app. Routes are
 * always registered; each handler returns 404 if miyagi.performance.json
 * is absent at request time, so users can drop the file in or out without
 * restarting the server. The runPerformance() file-size + html compression
 * caches make repeat hits cheap.
 *
 * Routes:
 *   GET /api/performance/components
 *   GET /api/performance/pages
 *   GET /api/performance/pages/:templatePath/:variation
 * @param {object} app - Express app
 * @param {{
 *   cwd: string,
 *   render?: (templatePath: string, variation: string) => Promise<string>,
 * }} options
 * @returns {boolean} true when the config file exists at registration time
 */
export function attachPerformanceRoutes(app, options) {
  const handle = async (req, res, transform) => {
    try {
      const result = await runPerformance({
        cwd: options.cwd,
        render: options.render,
      });
      if (!result.enabled) {
        res.status(404).json({ error: "Performance feature not configured." });
        return;
      }
      const transformed = transform(result, res);
      if (!res.headersSent) {
        res.json(transformed);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  app.get("/api/performance/components", (req, res) =>
    handle(req, res, (result) => result.components),
  );

  app.get("/api/performance/pages", (req, res) =>
    handle(req, res, (result) => result.pages),
  );

  app.get("/api/performance/pages/:templatePath/:variation", (req, res) =>
    handle(req, res, (result) => {
      // Express has already percent-decoded req.params; calling
      // decodeURIComponent again would over-decode and throw URIError on
      // legitimate values containing "%".
      const { templatePath, variation } = req.params;
      const match = result.pages.find(
        (p) => p.templatePath === templatePath && p.variation === variation,
      );
      if (!match) {
        res.status(404).json({ error: "Page not found." });
        return undefined;
      }
      return match;
    }),
  );

  return existsSync(path.join(options.cwd, CONFIG_FILE_NAME));
}
