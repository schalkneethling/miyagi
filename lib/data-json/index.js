import { getVariationData, getComponentData } from "../mocks/index.js";
import log from "../logger.js";

/**
 * Resolves the data.json content for a component.
 *
 * If no data.json exists, returns null values (no JSON exposed in DOM).
 * If data.json has useMocks: true, uses the mocks pipeline as the data source.
 * Otherwise, uses the data.json content directly (stripping the useMocks key).
 * @param {object} component - the component route object
 * @param {object} options
 * @param {string} [options.variation] - the variation name (used when useMocks is true)
 * @returns {Promise<{ json: string|null, id: string }>}
 */
export async function resolveDataJson(component, { variation } = {}) {
  const dataJsonPath = component.paths.data.full;
  const dataJsonContent = global.state.fileContents[dataJsonPath];

  if (!dataJsonContent) {
    return { json: null, id: "miyagi-mock-data" };
  }

  if (dataJsonContent.useMocks === true) {
    return resolveFromMocks(component, variation);
  }

  return resolveFromDataJson(dataJsonContent);
}

/**
 * Uses the mocks pipeline to produce the JSON content.
 * @param {object} component
 * @param {string} [variation]
 * @returns {Promise<{ json: string|null, id: string }>}
 */
async function resolveFromMocks(component, variation) {
  try {
    let data;

    if (variation) {
      data = await getVariationData(component, variation);
    } else {
      const allData = await getComponentData(component);
      data = allData?.[0] ?? null;
    }

    const resolved = data?.resolved ?? {};
    return { json: JSON.stringify(resolved), id: "miyagi-mock-data" };
  } catch (err) {
    log(
      "error",
      `Error resolving mock data for data.json in ${component.paths.dir.short}`,
      err,
    );
    return { json: null, id: "miyagi-mock-data" };
  }
}

/**
 * Uses the data.json content directly, stripping internal properties.
 * @param {object} dataJsonContent - parsed data.json object
 * @returns {{ json: string, id: string }}
 */
function resolveFromDataJson(dataJsonContent) {
  const clone = structuredClone(dataJsonContent);
  delete clone.useMocks;

  return { json: JSON.stringify(clone), id: "miyagi-mock-data" };
}
