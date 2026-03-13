#!/usr/bin/env node
/**
 * Syncs docs/configuration/default-configuration.md with lib/default-config.js.
 * Run with --write to update the doc, --check to verify (exit 1 if drift).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import defaultConfig from "../../lib/default-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_PATH = path.join(__dirname, "../../docs/configuration/default-configuration.md");

const INTRO = `# Default configuration

Please refer to the [available options](/configuration/options/) for a full explanation and possible values.
`;

/**
 * Serialize defaultUserConfig to a docs-safe JS code block.
 * Replaces AJV constructor ref with the identifier for the import.
 */
function serializeConfig(config) {
	const lines = [];
	lines.push("import AJV from \"ajv\";");
	lines.push("");
	lines.push("export default {");

	function formatValue(val, indent) {
		const pad = "  ".repeat(indent);
		if (val === null) {
			return "null";
		}

		if (val === undefined) {
			return "undefined";
		}

		if (typeof val === "string") {
			return JSON.stringify(val);
		}

		if (typeof val === "number") {
			return String(val);
		}

		if (typeof val === "boolean") {
			return String(val);
		}

		if (Array.isArray(val)) {
			if (val.length === 0) {
				return "[]";
			}

			return "[\n" + val.map((v) => pad + "  " + formatValue(v, indent + 1)).join(",\n") + "\n" + pad + "]";
		}

		if (typeof val === "object" || typeof val === "function") {
			if (val === config.defaultUserConfig.schema.ajv) {
				return "AJV";
			}

			if (typeof val === "function") {
				return String(val);
			}

			const entries = Object.entries(val).filter(([, v]) => v !== undefined);
			if (entries.length === 0) {
				return "{}";
			}

			const out = [];
			for (const [k, v] of entries) {
				out.push(pad + "  " + k + ": " + formatValue(v, indent + 1));
			}
			return "{\n" + out.join(",\n") + "\n" + pad + "}";
		}
		return String(val);
	}

	const cfg = config.defaultUserConfig;
	const entries = Object.entries(cfg).filter(([, v]) => v !== undefined);
	for (let i = 0, len = entries.length; i < len; i++) {
		const [k, v] = entries[i];
		const comma = i < len - 1 ? "," : "";
		lines.push("  " + k + ": " + formatValue(v, 1).replace(/\n/g, "\n  ") + comma);
	}
	lines.push("};");
	return lines.join("\n");
}

function generateBlock() {
	const code = serializeConfig(defaultConfig);
	return INTRO + "\n```js\n" + code + "\n```\n";
}

function main() {
	const { values } = parseArgs({
		options: {
			write: {
				type: "boolean",
				default: false
			},
			check: {
				type: "boolean",
				default: false
			}
		}
	});

	const write = values.write;
	const check = values.check;

	if ((write && check) || (!write && !check)) {
		console.error("Usage: node sync-default-config.mjs --write | --check");
		process.exit(1);
	}

	const expected = generateBlock();
	const current = fs.readFileSync(DOC_PATH, "utf8");

	if (check) {
		if (current !== expected) {
			console.error("docs/configuration/default-configuration.md is out of sync with lib/default-config.js");
			console.error("Run: pnpm docs:sync-default-config");
			process.exit(1);
		}
		process.exit(0);
	}

	if (write) {
		fs.writeFileSync(DOC_PATH, expected, "utf8");
	}
}

main();
