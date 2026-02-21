/**
 * Module for printing and parsing CLI arguments
 * @module initArgs
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import pkgJson from "../../package.json" with { type: "json" };

export default yargs(hideBin(process.argv))
	.command("start", "Starts the miyagi server", {
		verbose: {
			description:
				"Logging additional information — helpful mainly in case of errors.",
			type: "boolean",
		},
	})
	.command("build", "Creates a static build of all your components", {
		folder: {
			description: "The folder where your static build files will be saved",
			type: "string",
		},
	})
	.command(
		"new",
		"Creates a new component folder (including template, CSS, JS, documentation, mocks, and schema files)",
		{
			skip: {
				description:
					"files that will not be created\n(space separated list of tpl, css, js, docs, mocks, schema)",
				type: "array",
			},
			only: {
				description:
					"tells miyagi to only created the passes file types\n(space separated list of tpl, css, js, docs, mocks, schema)",
				type: "array",
			},
		},
	)
	.command(
		"mocks",
		"Creates a mock data file with dummy content based on the schema file",
	)
	.command(
		"lint",
		"Validates if the component's mock data matches its JSON schema",
	)
	.command(
		"drupal-assets",
		"Resolves Drupal *.libraries.yml dependencies and updates component $assets in mock files",
		{
			engine: {
				alias: "e",
				description: "Engine to use for asset resolution",
				type: "string",
				choices: ["drupal"],
				default: "drupal",
			},
			config: {
				description: "Path to .miyagi-assets.js config file",
				type: "string",
				default: ".miyagi-assets.js",
			},
			libraries: {
				alias: "l",
				description: "Path to *.libraries.yml (overrides config)",
				type: "string",
			},
			components: {
				alias: "c",
				description: "Library names to process (space-separated)",
				type: "array",
			},
			"ignore-prefixes": {
				description:
					'Dependency prefixes to skip (e.g. "core" to ignore core/jquery)',
				type: "array",
			},
			"dry-run": {
				description: "Print resolved $assets without writing files",
				type: "boolean",
				default: false,
			},
		},
	)
	.help()
	.version(pkgJson.version)
	.alias("help", "h")
	.alias("verbose", "v")
	.demandCommand()
	.epilogue(
		"Please check https://docs.miyagi.dev/configuration/options/ for all options",
	);
