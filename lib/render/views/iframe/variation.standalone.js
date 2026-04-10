import path from "path";
import config from "../../../default-config.js";
import { resolveDataJson } from "../../../data-json/index.js";
import { getUserUiConfig } from "../../helpers.js";
import resolveAssets from "../../helpers/resolve-assets.js";
import applyOverrides from "../../helpers/apply-overrides.js";

/**
 * @param {object} object - parameter object
 * @param {object} [object.res] - the express response object
 * @param {object} object.component
 * @param {object} object.componentData
 * @param {object|null} [object.componentDeclaredAssets] - $assets from mocks
 * @param {Function} [object.cb] - callback function
 * @param {object} [object.cookies]
 * @param {object} [object.overrides] - query-param override values
 * @param {string} [object.variation] - the variation name
 * @returns {Promise} gets resolved when the variation has been rendered
 */
export default async function renderIframeVariationStandalone({
  res,
  component,
  componentData,
  componentDeclaredAssets = null,
  cb,
  cookies,
  overrides,
  variation,
}) {
  if (overrides) {
    const schema =
      global.state.fileContents[component.paths?.schema?.full] ?? null;
    componentData = applyOverrides(componentData ?? {}, overrides, schema);
  }

  const directoryPath = component.paths.dir.short;
  const { json: dataJson, id: dataJsonId } = await resolveDataJson(component, {
    variation,
  });

  return new Promise((resolve, reject) => {
    global.app.render(
      component.paths.tpl.full,
      componentData ?? {},
      async (error, result) => {
        if (error) {
          if (global.config.isBuild) {
            if (cb) {
              cb(error);
            }
          } else {
            reject(error);
          }
        } else if (res) {
          const componentsEntry = global.state.components.find(
            ({ shortPath }) => shortPath === directoryPath,
          );

          const { cssFiles, jsFilesHead, jsFilesBody } = resolveAssets(
            componentDeclaredAssets,
          );

          await res.render(
            "component_variation.twig.miyagi",
            {
              html: result,
              dataJson,
              dataJsonId,
              cssFiles,
              jsFilesHead,
              jsFilesBody,
              assets: {
                css: componentsEntry
                  ? componentsEntry.assets.css
                    ? path.join("/", componentsEntry.assets.css)
                    : false
                  : false,
                js: componentsEntry
                  ? componentsEntry.assets.js
                    ? path.join("/", componentsEntry.assets.js)
                    : false
                  : false,
              },
              miyagiDev: !!process.env.MIYAGI_DEVELOPMENT,
              prod: process.env.NODE_ENV === "production",
              projectName: config.projectName,
              isBuild: global.config.isBuild,
              userUiConfig: getUserUiConfig(cookies),
              componentLanguage: global.config.components.lang,
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

          resolve();
        } else {
          resolve(result);
        }
      },
    );
  });
}
