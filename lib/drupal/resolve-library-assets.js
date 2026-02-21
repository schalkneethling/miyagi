// @ts-check

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/**
 * @typedef {{src: string, type?: string}} JsEntry
 * @typedef {{prefix: string, name: string}} DepEntry
 * @typedef {{css: string[], js: JsEntry[], dependencies: DepEntry[]}} LibraryEntry
 */

/**
 * Parses a Drupal *.libraries.yml string into a normalized map.
 * @param {string} yamlContent - raw YAML string (not a file path)
 * @returns {Record<string, LibraryEntry>}
 */
export function parseLibrariesYaml(yamlContent) {
	/**
	 * @type {Record<string, {
	 *   css?: Record<string, Record<string, object>>,
	 *   js?: Record<string, {attributes?: {type?: string}}>,
	 *   dependencies?: string[]
	 * }>}
	 */
	const raw = /** @type {never} */ (yaml.load(yamlContent));
	/** @type {Record<string, LibraryEntry>} */
	const map = {};

	for (const [name, entry] of Object.entries(raw)) {
		const css = entry.css
			? Object.values(entry.css).flatMap(Object.keys)
			: [];

		const js = entry.js
			? Object.entries(entry.js).map(([src, opts]) =>
				opts?.attributes?.type
					? { src, type: opts.attributes.type }
					: { src },
			)
			: [];

		const dependencies = (entry.dependencies || [])
			.filter((dep) => dep.includes("/"))
			.map((dep) => ({
				prefix: dep.slice(0, dep.indexOf("/")),
				name: dep.slice(dep.indexOf("/") + 1),
			}));

		map[name] = { css, js, dependencies };
	}

	return map;
}

/**
 * Recursively resolves all CSS and JS assets for a library, depth-first.
 * Dependencies are collected before the component's own assets to preserve
 * the CSS cascade (base styles before component styles) and ensure JS
 * dependencies are available before scripts that rely on them.
 * @param {string} libraryName
 * @param {Record<string, LibraryEntry>} librariesMap - output of parseLibrariesYaml
 * @param {string[]} ignorePrefixes - dependency prefixes to skip
 * @returns {{css: string[], js: JsEntry[]}}
 */
export function resolveComponentAssets(
	libraryName,
	librariesMap,
	ignorePrefixes,
) {
	const cssSet = [];
	const jsSet = [];
	const resolved = new Set();

	/**
	 * @param {string} name
	 * @param {Set<string>} ancestors
	 */
	function walk(name, ancestors) {
		if (ancestors.has(name)) {
			console.warn(
				`Circular dependency detected: "${name}" already in chain.`,
			);
			return;
		}

		if (resolved.has(name)) {
			return;
		}

		const lib = librariesMap[name];
		if (!lib) {
			console.warn(
				`Dependency "${name}" not found in libraries — skipping.`,
			);
			return;
		}

		const chain = new Set(ancestors);
		chain.add(name);

		for (const dep of lib.dependencies) {
			if (ignorePrefixes.includes(dep.prefix)) {
				continue;
			}
			walk(dep.name, chain);
		}

		for (const cssFile of lib.css) {
			if (!cssSet.includes(cssFile)) {
				cssSet.push(cssFile);
			}
		}

		for (const jsEntry of lib.js) {
			if (!jsSet.some((entry) => entry.src === jsEntry.src)) {
				jsSet.push(jsEntry);
			}
		}

		resolved.add(name);
	}

	walk(libraryName, new Set());
	return { css: cssSet, js: jsSet };
}

const DEFAULT_PREFIXES = ["element-", "pattern-", "template-", "component-"];

/**
 * Maps a Drupal library name to a miyagi component folder path.
 * Uses explicit mapping first, falls back to auto-discovery.
 * @param {string} libraryName
 * @param {Record<string, string>} mapping - explicit library-to-folder mapping
 * @param {string} componentsFolder - root components folder path
 * @param {string[]} [autoDiscoveryPrefixes] - prefixes to strip when matching folder names
 * @returns {string|null} component folder relative path, or null if not found
 */
export function mapLibraryToComponent(
	libraryName,
	mapping,
	componentsFolder,
	autoDiscoveryPrefixes = DEFAULT_PREFIXES,
) {
	if (mapping[libraryName]) {
		return mapping[libraryName];
	}

	const candidates = [libraryName];

	for (const prefix of autoDiscoveryPrefixes) {
		if (libraryName.startsWith(prefix)) {
			candidates.push(libraryName.slice(prefix.length));
		}
	}

	try {
		/** @type {string[]} */
		const searchDirs = [componentsFolder];
		while (searchDirs.length > 0) {
			const dir = /** @type {string} */ (searchDirs.pop());

			if (!fs.existsSync(dir)) {
				continue;
			}

			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				if (!entry.isDirectory()) {
					continue;
				}

				if (candidates.includes(entry.name)) {
					return path.relative(
						componentsFolder,
						path.join(dir, entry.name),
					);
				}
				searchDirs.push(path.join(dir, entry.name));
			}
		}
	} catch {
		// Swallow filesystem errors (missing/unreadable dirs) intentionally.
		// Caller handles null return with a user-facing warning.
	}

	return null;
}
