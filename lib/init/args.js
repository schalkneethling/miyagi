/**
 * Module for printing and parsing CLI arguments
 * @module initArgs
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import pkgJson from "../../package.json" with { type: "json" };
import { EXIT_CODES, MiyagiError } from "../errors.js";

/**
 * @param {object} handlers
 * @param {string[]} [argv]
 * @returns {object}
 */
export default function createCli(handlers, argv = process.argv) {
  let result;

  const commandHandler = (handler) => async (args) => {
    result = await handler(args);
    return result;
  };

  const cli = yargs(hideBin(argv))
    .scriptName("miyagi")
    .option("verbose", {
      alias: "v",
      description:
        "Logging additional information — helpful mainly in case of errors.",
      type: "boolean",
      global: true,
    })
    .command(
      "start",
      "Starts the miyagi server",
      (builder) =>
        builder
          .option("watch-report", {
            description: "Enable watch report output on startup.",
            type: "boolean",
          })
          .option("watch-report-format", {
            description: "Set watch report format.",
            type: "string",
            choices: ["pretty", "summary", "json"],
          })
          .option("watch-report-no-color", {
            description: "Disable colors in watch report output.",
            type: "boolean",
          }),
      commandHandler(handlers.start),
    )
    .command(
      "build",
      "Creates a static build of all your components",
      (builder) =>
        builder.option("folder", {
          description: "The folder where your static build files will be saved",
          type: "string",
        }),
      commandHandler(handlers.build),
    )
    .command(
      "new <component>",
      "Creates a new component folder (including template, CSS, JS, documentation, mocks, and schema files)",
      (builder) =>
        builder
          .positional("component", {
            description: "The component path to create",
            type: "string",
          })
          .option("skip", {
            description:
              "files that will not be created\n(space separated list of tpl, css, js, docs, mocks, schema)",
            type: "array",
          })
          .option("only", {
            description:
              "tells miyagi to only created the passes file types\n(space separated list of tpl, css, js, docs, mocks, schema)",
            type: "array",
          }),
      commandHandler(handlers.new),
    )
    .command(
      "mocks <component>",
      "Creates a mock data file with dummy content based on the schema file",
      (builder) =>
        builder.positional("component", {
          description: "The component path to generate mock data for",
          type: "string",
        }),
      commandHandler(handlers.mocks),
    )
    .command(
      "lint [component]",
      "Validates if the component's mock data matches its JSON schema",
      (builder) =>
        builder.positional("component", {
          description: "Optional component path to lint",
          type: "string",
        }),
      commandHandler(handlers.lint),
    )
    .command(
      "validate-html [component]",
      "Validates rendered HTML of components and generates a Markdown report",
      (builder) =>
        builder
          .positional("component", {
            description: "Optional component path to validate (render mode)",
            type: "string",
          })
          .option("files", {
            alias: "f",
            description:
              "Glob pattern pointing to HTML files to validate (e.g. build/miyagi/component-*.html)",
            type: "string",
          })
          .option("output", {
            alias: "o",
            description: "Path for the Markdown report file",
            type: "string",
          }),
      commandHandler(handlers.validateHtml),
    )
    .command(
      "drupal-assets",
      "Resolves Drupal *.libraries.yml dependencies and updates component $assets in mock files",
      (builder) =>
        builder
          .option("engine", {
            alias: "e",
            description: "Engine to use for asset resolution",
            type: "string",
            choices: ["drupal"],
            default: "drupal",
          })
          .option("config", {
            description: "Path to .miyagi-assets.js config file",
            type: "string",
            default: ".miyagi-assets.js",
          })
          .option("libraries", {
            alias: "l",
            description: "Path to *.libraries.yml (overrides config)",
            type: "string",
          })
          .option("components", {
            alias: "c",
            description: "Library names to process (space-separated)",
            type: "array",
          })
          .option("ignore-prefixes", {
            description:
              'Dependency prefixes to skip (e.g. "core" to ignore core/jquery)',
            type: "array",
          })
          .option("dry-run", {
            description: "Print resolved $assets without writing files",
            type: "boolean",
            default: false,
          }),
      commandHandler(handlers.drupalAssets),
    )
    .command(
      "doctor",
      "Checks your miyagi environment and config for common setup issues",
      () => {},
      commandHandler(handlers.doctor),
    )
    .command(
      "perf",
      "Reports component and page bundle sizes against miyagi.performance.json",
      (builder) =>
        builder
          .option("compression", {
            description: "Compression to compare against the budget",
            type: "string",
            choices: ["raw", "gzip", "brotli"],
          })
          .option("warn-ratio", {
            description: "Override warnRatio (must be in (0, 1))",
            type: "number",
          })
          .option("fail", {
            description: "Exit non-zero if any component or page is exceed",
            type: "boolean",
            default: false,
          })
          .option("json", {
            description: "Emit the full result as JSON on stdout",
            type: "boolean",
            default: false,
          }),
      commandHandler(handlers.perf),
    )
    .help()
    .version(pkgJson.version)
    .alias("help", "h")
    .strictCommands()
    .demandCommand()
    .exitProcess(false)
    .fail((message, error) => {
      if (error) {
        throw error;
      }

      throw new MiyagiError(message || "CLI parsing failed.", {
        code: EXIT_CODES.CLI_USAGE_ERROR,
      });
    })
    .epilogue(
      "Please check https://docs.miyagi.dev/configuration/options/ for all options",
    );

  return {
    cli,
    getResult() {
      return result;
    },
  };
}
