// @ts-check

import { getVariationData } from "../mocks/index.js";

/**
 * Render a configured page (a component-shaped entry under templates/...)
 * to its raw HTML for performance measurement. Looks up the entry in
 * global.state.routes by its shortPath, resolves the variation's mock data,
 * and runs the template engine. Returns the rendered HTML string.
 * @param {string} templatePath
 * @param {string} variation
 * @returns {Promise<string>}
 */
export async function renderPageHtml(templatePath, variation) {
  const route = global.state?.routes?.find(
    (r) => r.paths?.dir?.short === templatePath,
  );
  if (!route || !route.paths?.tpl?.full) {
    throw new Error(
      `Performance: no template found for "${templatePath}". ` +
        `Make sure the path matches a component's library-relative folder.`,
    );
  }
  const data = (await getVariationData(route, variation)) ?? {};
  return new Promise((resolve, reject) => {
    global.app.render(route.paths.tpl.full, data, (error, html) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(html);
    });
  });
}
