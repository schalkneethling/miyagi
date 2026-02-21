// @ts-check

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import log from "../logger.js";
import { loadAssetsConfig } from "../drupal/load-assets-config.js";
import {
	parseLibrariesYaml,
	resolveComponentAssets,
	mapLibraryToComponent,
} from "../drupal/resolve-library-assets.js";

/**
 * @typedef {{src: string, type?: string}} JsEntry
 * @typedef {{css: string[], js: JsEntry[]}} ComponentAssets
 */

/**
 * @param {object} args - CLI arguments from yargs
 */
export default async function drupalAssets(args) {
	let config;
	try {
		config = await loadAssetsConfig(args);
	} catch (err) {
		log("error", /** @type {Error} */ (err).message);
		process.exit(1);
	}

	if (!config.libraries) {
		log("error", "No libraries file specified. Use --libraries or configure it in .miyagi-assets.js.");
		process.exit(1);
	}

	let yamlContent;
	try {
		yamlContent = await readFile(config.libraries, "utf8");
	} catch {
		log("error", `Could not read libraries file: ${config.libraries}`);
		process.exit(1);
	}

	const librariesMap = parseLibrariesYaml(yamlContent);
	const targetLibraries = config.components || Object.keys(librariesMap);
	const componentsFolder = global.config?.components?.folder || "src";

	let updatedCount = 0;

	for (const libraryName of targetLibraries) {
		if (!librariesMap[libraryName]) {
			log("warn", `Library "${libraryName}" not found in ${config.libraries} — skipping.`);
			continue;
		}

		const componentPath = mapLibraryToComponent(
			libraryName,
			config.mapping,
			componentsFolder,
			config.autoDiscoveryPrefixes ?? undefined,
		);

		if (!componentPath) {
			log("warn", `Could not map library "${libraryName}" to a component folder — skipping.`);
			continue;
		}

		const assets = resolveComponentAssets(
			libraryName,
			librariesMap,
			config.ignorePrefixes,
		);

		if (config.dryRun) {
			log("info", `[dry-run] ${libraryName} → ${componentPath}`);
			console.log(JSON.stringify({ $assets: assets }, null, "\t"));
			continue;
		}

		const updated = await updateMockFile(
			path.join(componentsFolder, componentPath),
			assets,
		);

		if (updated) {
			updatedCount++;
			log("info", `Updated $assets in ${componentPath}`);
		}
	}

	if (!config.dryRun) {
		log("success", `Done. Updated ${updatedCount} component(s).`);
	}
}

/**
 * Reads a component's mock file, injects/replaces $assets, writes back.
 * @param {string} componentDir - absolute or relative path to component folder
 * @param {ComponentAssets} assets
 * @returns {Promise<boolean>} true if file was updated
 */
async function updateMockFile(componentDir, assets) {
	const mocksConfig = global.config?.files?.mocks || {
		name: "mocks",
		extension: ["yaml", "yml", "json", "js"],
	};
	const extensions = Array.isArray(mocksConfig.extension)
		? mocksConfig.extension
		: [mocksConfig.extension];

	for (const ext of extensions) {
		const filePath = path.join(componentDir, `${mocksConfig.name}.${ext}`);

		let content;
		try {
			content = await readFile(filePath, "utf8");
		} catch {
			continue;
		}

		if (["yaml", "yml"].includes(ext)) {
			/** @type {Record<string, unknown>} */
			const data = /** @type {Record<string, unknown>} */ (
				yaml.load(content) || {}
			);
			data.$assets = cleanAssets(assets);
			await writeFile(filePath, yaml.dump(data, { indent: 2 }));
			return true;
		}

		if (ext === "json") {
			/** @type {Record<string, unknown>} */
			const data = JSON.parse(content);
			data.$assets = cleanAssets(assets);
			await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
			return true;
		}
	}

	return false;
}

/**
 * Strips empty arrays from assets to keep mock files clean.
 * @param {ComponentAssets} assets
 * @returns {Partial<ComponentAssets>}
 */
function cleanAssets(assets) {
	/** @type {Partial<ComponentAssets>} */
	const result = {};
	if (assets.css?.length > 0) {
		result.css = assets.css;
	}

	if (assets.js?.length > 0) {
		result.js = assets.js;
	}
	return result;
}
