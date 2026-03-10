/**
 * Resolves the final CSS and JS asset lists for a component render.
 *
 * Resolution logic:
 * - If componentAssets ($assets from mocks) is provided:
 *     shared + componentAssets
 * - Else if isolateComponents is true:
 *     shared only
 * - Else (legacy fallback):
 *     global.config.assets.css / .js
 * @param {object|null|undefined} componentAssets - the $assets declaration from mocks, or null/undefined
 * @returns {{ cssFiles: string[], jsFilesHead: object[], jsFilesBody: object[] }}
 */
export default function resolveAssets(componentAssets) {
  const { shared, isolateComponents, css, js } = global.config.assets;

  if (componentAssets) {
    const mergedCss = [...shared.css, ...(componentAssets.css || [])];
    const mergedJs = [...shared.js, ...(componentAssets.js || [])];

    return {
      cssFiles: mergedCss,
      jsFilesHead: mergedJs.filter(
        (entry) => entry.position === "head" || !entry.position,
      ),
      jsFilesBody: mergedJs.filter((entry) => entry.position === "body"),
    };
  }

  if (isolateComponents) {
    return {
      cssFiles: [...shared.css],
      jsFilesHead: shared.js.filter(
        (entry) => entry.position === "head" || !entry.position,
      ),
      jsFilesBody: shared.js.filter((entry) => entry.position === "body"),
    };
  }

  // Legacy fallback: return all global assets
  return {
    cssFiles: css,
    jsFilesHead: js.filter(
      (entry) => entry.position === "head" || !entry.position,
    ),
    jsFilesBody: js.filter((entry) => entry.position === "body"),
  };
}
