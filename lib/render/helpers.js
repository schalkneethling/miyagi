/**
 * Helper functions for the render module
 * @module renderHelpers
 */

import path from "path";
import anymatch from "anymatch";
import { normalizeExtensions } from "../extensions.js";

/**
 * @param {object} config - the user configuration object
 * @param {object} data - the mock data object that will be passed into the component
 * @param {object} component
 * @returns {Promise<object>} the extended data object
 */
export const extendTemplateData = async (config, data, component) => {
  for (const { extension } of normalizeExtensions(config.extensions)) {
    if (extension.extendTemplateData) {
      data = await extension.extendTemplateData(
        path.join(config.components.folder, component.paths.tpl.short),
        {},
        data,
      );
    }
  }

  return data;
};

export const getUserUiConfig = (cookies = {}) => {
  const projectName = global.config.projectName.replaceAll(" ", "-");
  const mode = cookies[`miyagi_${projectName}_mode`];
  const theme = cookies[`miyagi_${projectName}_theme`];
  const componentTextDirection =
    cookies[`miyagi_${projectName}_text_direction`];

  return {
    mode: global.config.isBuild ? "presentation" : mode || "dev",
    theme: theme || global.config.ui.mode,
    componentTextDirection:
      componentTextDirection || global.config.components.textDirection,
  };
};

export const getThemeMode = (cookies = {}) => {
  return cookies[
    `miyagi_${global.config.projectName.replaceAll(" ", "-")}_theme`
  ];
};

/**
 * @param {Array} menu
 * @returns {Array} menu with hidden components removed
 */
export function getDisplayMenu(menu) {
  const hidden = global.config.components.hidden;

  if (!menu || !hidden?.length) {
    return menu;
  }

  if (!Array.isArray(menu)) {
    return menu;
  }

  return menu.reduce((acc, item) => {
    if (
      item.shortPath &&
      anymatch(hidden, item.shortPath.replaceAll("\\", "/"))
    ) {
      return acc;
    }

    if (item.children) {
      const filteredChildren = getDisplayMenu(item.children);

      if (filteredChildren.length === 0) {
        return acc;
      }

      acc.push({ ...item, children: filteredChildren });
    } else {
      acc.push(item);
    }

    return acc;
  }, []);
}

/**
 * @param {Array} components
 * @returns {Array} components with hidden entries removed
 */
export function getDisplayComponents(components) {
  const hidden = global.config.components.hidden;

  if (!components || !hidden?.length) {
    return components;
  }

  return components.filter(
    (c) => !anymatch(hidden, c.shortPath.replaceAll("\\", "/")),
  );
}
