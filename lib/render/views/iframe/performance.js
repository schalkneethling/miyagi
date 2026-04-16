import config from "../../../default-config.js";
import { getUserUiConfig, getThemeMode } from "../../helpers.js";
import { runPerformance } from "../../../performance/index.js";
import { formatSize } from "../../../performance/parse-size.js";

/**
 * Renders the iframe-side Performance panel. Computed on-request so the
 * numbers reflect the current on-disk state without any extra cache plumbing;
 * `measure.js` has an mtime cache so repeat renders are cheap.
 * @param {object} o
 * @param {object} o.res
 * @param {Function} [o.cb]
 * @param {object} o.cookies
 * @returns {Promise<void>}
 */
export default async function renderIframePerformance({ res, cb, cookies }) {
  const themeMode = getThemeMode(cookies);

  const result = runPerformance({ config: global.config });

  const viewData = {
    compression: result.compression,
    evaluations: result.evaluations.map((row) => ({
      ...row,
      actualFormatted: formatSize(row.actual),
      budgetFormatted: formatSize(row.budget),
      ratioPercent:
        row.ratio == null ? null : Math.round(row.ratio * 100),
    })),
    categories: Object.entries(result.measurement.categories).map(
      ([category, data]) => ({
        category,
        files: data.files.map((file) => ({
          path: file.path,
          raw: formatSize(file.raw),
          gzip: formatSize(file.gzip),
          brotli: formatSize(file.brotli),
          missing: !!file.missing,
        })),
        totals: {
          raw: formatSize(data.totals.raw),
          gzip: formatSize(data.totals.gzip),
          brotli: formatSize(data.totals.brotli),
        },
      }),
    ),
    summary: result.summary,
  };

  await res.render(
    "performance.twig.miyagi",
    {
      ...viewData,
      isBuild: global.config.isBuild,
      lang: global.config.ui.lang,
      miyagiDev: !!process.env.MIYAGI_DEVELOPMENT,
      projectName: config.projectName,
      userUiConfig: getUserUiConfig(cookies),
      theme: themeMode
        ? Object.assign(global.config.ui.theme, { mode: themeMode })
        : global.config.ui.theme,
      uiTextDirection: global.config.ui.textDirection,
    },
    (html) => {
      if (res.send) {
        res.send(html);
      }

      if (cb) {
        cb(null, html);
      }
    },
  );
}
