import path from "node:path";
import * as v from "valibot";

const DrupalBlockSchema = v.object({
	libraries: v.string(),
	ignorePrefixes: v.optional(v.array(v.string())),
	mapping: v.optional(v.record(v.string(), v.string())),
	autoDiscoveryPrefixes: v.optional(v.nullable(v.array(v.string()))),
	components: v.optional(v.nullable(v.array(v.string()))),
});

const ConfigSchema = v.object({
	engine: v.picklist(["drupal"]),
	drupal: DrupalBlockSchema,
});

export const NormalizedConfigSchema = v.object({
	engine: v.string(),
	libraries: v.optional(v.string()),
	ignorePrefixes: v.array(v.string()),
	mapping: v.record(v.string(), v.string()),
	autoDiscoveryPrefixes: v.nullable(v.array(v.string())),
	components: v.nullable(v.array(v.string())),
	dryRun: v.boolean(),
});

/** @typedef {v.InferOutput<typeof NormalizedConfigSchema>} NormalizedConfig */

/**
 * Loads the .miyagi-assets.js config and merges CLI overrides.
 * @param {object} cliArgs
 * @param {string} [cliArgs.engine] - engine to use (default: "drupal")
 * @param {string} [cliArgs.config] - path to config file
 * @param {string} [cliArgs.libraries] - CLI override for libraries path
 * @param {string[]} [cliArgs.components] - CLI override for components list
 * @param {string[]} [cliArgs.ignorePrefixes] - CLI override for ignore prefixes
 * @param {boolean} [cliArgs.dryRun] - dry-run mode
 * @returns {Promise<NormalizedConfig>} normalized config
 */
export async function loadAssetsConfig(cliArgs) {
	let fileConfig = null;

	const configPath = cliArgs.config || ".miyagi-assets.js";

	try {
		const resolved = path.resolve(configPath);
		const mod = await import(resolved);
		fileConfig = mod.default || mod;
	} catch {
		if (!cliArgs.libraries) {
			throw new Error(
				`Could not load config file "${configPath}" and no --libraries flag provided.`,
			);
		}
	}

	if (fileConfig) {
		const result = v.safeParse(ConfigSchema, fileConfig);

		if (!result.success) {
			const messages = result.issues.map((issue) => {
				const issuePath =
					issue.path?.map((path) => path.key).join(".") || "root";
				return `${issuePath}: ${issue.message}`;
			});
			throw new Error(`Invalid config: ${messages.join("; ")}`);
		}

		const { engine } = result.output;
		const engineBlock = result.output[engine];

		return {
			engine,
			libraries: cliArgs.libraries || engineBlock.libraries,
			ignorePrefixes:
				cliArgs.ignorePrefixes || engineBlock.ignorePrefixes || [],
			mapping: engineBlock.mapping || {},
			autoDiscoveryPrefixes: engineBlock.autoDiscoveryPrefixes ?? null,
			components:
				cliArgs.components || engineBlock.components || null,
			dryRun: cliArgs.dryRun || false,
		};
	}

	return {
		engine: cliArgs.engine || "drupal",
		libraries: cliArgs.libraries,
		ignorePrefixes: cliArgs.ignorePrefixes || [],
		mapping: {},
		autoDiscoveryPrefixes: null,
		components: cliArgs.components || null,
		dryRun: cliArgs.dryRun || false,
	};
}
