import config from "../../../default-config.js";
import { getUserUiConfig, getThemeMode } from "../../helpers.js";

/**
 * Renders the main Performance page — the standard chrome (menu etc.) with
 * the iframe pointed at the Performance panel view.
 * @param {object} object
 * @param {object} object.res
 * @param {Function} [object.cb]
 * @param {object} [object.cookies]
 * @returns {void}
 */
export default function renderMainPerformance({ res, cb, cookies }) {
  const themeMode = getThemeMode(cookies);

  res.render(
    "main.twig.miyagi",
    {
      lang: global.config.ui.lang,
      folders: global.state.menu,
      components: global.state.components,
      flatUrlPattern: global.config.isBuild
        ? "/show-{{component}}.html"
        : "/show?file={{component}}",
      iframeSrc: "/iframe/performance",
      showAll: true,
      projectName: config.projectName,
      userProjectName: global.config.projectName,
      indexPath: global.config.indexPath.embedded,
      miyagiDev: !!process.env.MIYAGI_DEVELOPMENT,
      isBuild: global.config.isBuild,
      userUiConfig: getUserUiConfig(cookies),
      theme: themeMode
        ? Object.assign(global.config.ui.theme, { mode: themeMode })
        : global.config.ui.theme,
      basePath: global.config.isBuild ? global.config.build.basePath : "/",
      uiTextDirection: global.config.ui.textDirection,
      requestedComponent: "performance",
      requestedVariation: null,
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
