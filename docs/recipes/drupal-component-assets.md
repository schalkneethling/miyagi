# Drupal: Resolving component assets from libraries.yml

If your component library lives inside a Drupal theme, you can use the `miyagi drupal-assets` command to automatically resolve each component's CSS and JS dependencies from your `*.libraries.yml` file and write them as [`$assets`](/how-to/writing-mock-data/#declaring-component-assets) entries in your mock files.

## Prerequisites

- [Component asset isolation](/configuration/options/#isolatecomponents) configured in `.miyagi.js`
- A Drupal `*.libraries.yml` file that declares your component libraries

## Quick start

### 1. Create `.miyagi-assets.js`

Create a `.miyagi-assets.js` (or `.miyagi-assets.mjs`) file in your project root:

```js
export default {
  engine: "drupal",
  drupal: {
    libraries: "mytheme.libraries.yml",
    ignorePrefixes: ["core", "drupal"],
    mapping: {
      "element-info-message": "elements/info-message",
      "element-alert-box": "elements/alert-box",
    },
  },
};
```

### 2. Run the command

```bash
miyagi drupal-assets
```

This parses your libraries file, resolves each component's dependency tree, and writes the flattened `$assets` into the corresponding `mocks.json` (or `mocks.yaml`) file.

### 3. Preview changes first (dry run)

```bash
miyagi drupal-assets --dry-run
```

Prints the resolved `$assets` for each component without modifying any files. For larger projects, pipe the output to a file for easier review:

```bash
miyagi drupal-assets --dry-run > dry-run-output.json
```

## Configuration reference

All configuration goes in `.miyagi-assets.js` inside an engine-keyed structure:

```js
export default {
  engine: "drupal",
  drupal: {
    // ...options
  },
};
```

| Property                       | Required | Default                                               | Description                                                                                                                        |
| ------------------------------ | -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `engine`                       | **yes**  | —                                                     | Which engine block to read. Currently only `"drupal"` is supported.                                                                |
| `drupal.libraries`             | **yes**  | —                                                     | Path to your `*.libraries.yml` file.                                                                                               |
| `drupal.ignorePrefixes`        | no       | `[]`                                                  | Dependency prefixes to skip. Use `["core", "drupal"]` to ignore Drupal core dependencies like `core/jquery`.                       |
| `drupal.mapping`               | no       | `{}`                                                  | Maps library names to component folder paths (relative to `components.folder`). When omitted, miyagi attempts auto-discovery.      |
| `drupal.autoDiscoveryPrefixes` | no       | `["element-", "pattern-", "template-", "component-"]` | Prefixes stripped from library names when auto-discovering component folders. Override to match your project's naming conventions. |
| `drupal.components`            | no       | all                                                   | Array of library names to process. Omit to process all libraries that map to a miyagi component.                                   |

## CLI options

All CLI options override their `.miyagi-assets.js` counterparts:

```bash
miyagi drupal-assets [options]
  --engine, -e       Engine to use (default: "drupal")
  --config           Path to config file (default: .miyagi-assets.js)
  --libraries, -l    Path to *.libraries.yml
  --components, -c   Library names to process (space-separated)
  --ignore-prefixes  Dependency prefixes to skip
  --dry-run          Print resolved $assets without writing files
```

### Examples

Process only specific components:

```bash
miyagi drupal-assets --components element-info-message element-button
```

Use a different libraries file:

```bash
miyagi drupal-assets --libraries subtheme.libraries.yml
```

CLI-only mode (no config file needed):

```bash
miyagi drupal-assets \
  --libraries mytheme.libraries.yml \
  --ignore-prefixes core drupal \
  --dry-run
```

## How dependency resolution works

Given this `*.libraries.yml`:

```yaml
element-info-message:
  css:
    component:
      build/assets/css/info-message.css: {}
  js:
    build/assets/js/info-message.js:
      attributes:
        type: module
  dependencies:
    - mytheme/element-alert-box

element-alert-box:
  css:
    component:
      build/assets/css/alert-box.css: {}
```

Running `miyagi drupal-assets` for `element-info-message` produces:

```json
{
  "$assets": {
    "css": [
      "build/assets/css/alert-box.css",
      "build/assets/css/info-message.css"
    ],
    "js": [
      {
        "src": "build/assets/js/info-message.js",
        "type": "module"
      }
    ]
  }
}
```

Dependencies are resolved depth-first: a dependency's assets load before the component's own assets. Circular dependencies are detected and warned about. Duplicate assets are deduplicated.

## Library-to-component mapping

### Explicit mapping (recommended)

The most reliable and fastest approach — an O(1) lookup per library, no filesystem scanning. Especially beneficial for large projects with many components:

```js
mapping: {
 "element-info-message": "elements/info-message",
 "element-alert-box": "elements/alert-box",
}
```

Paths are relative to your `components.folder` setting in `.miyagi.js`.

### Auto-discovery

When `mapping` is omitted, miyagi walks your `components.folder` and matches library names against folder names. It strips prefixes defined in `autoDiscoveryPrefixes` (default: `element-`, `pattern-`, `template-`, `component-`) when searching. Override this list if your project uses different naming conventions. If a match can't be found, the library is skipped with a warning.

## Idempotent writes

Re-running the command produces identical output. If the resolved `$assets` hasn't changed, Git won't show the file as modified.

## Adding a new engine

Currently only Drupal is supported, but the architecture is designed to be extended. To add support for another framework (e.g. WordPress, Laravel), follow these four steps.

### 1. Create a resolver module

Create `lib/<engine>/resolve-library-assets.js` and export three functions:

| Function                                                  | Purpose                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `parseLibraries*(content)`                                | Parse the engine's manifest format into a normalized map of `{ css, js, dependencies }` per library. |
| `resolveComponentAssets(name, map, ignorePrefixes)`       | Walk the dependency tree and return flattened `{ css: string[], js: JsEntry[] }`.                    |
| `mapLibraryToComponent(name, mapping, folder, prefixes?)` | Resolve a library name to a component folder path.                                                   |

Use `lib/drupal/resolve-library-assets.js` as a reference implementation.

### 2. Register the engine schema

In `lib/drupal/load-assets-config.js`:

1. Define a new Valibot schema for the engine-specific config block (e.g. `WordPressBlockSchema`).
2. Add the engine name to `ConfigSchema`'s picklist:

```js
const ConfigSchema = v.object({
  engine: v.picklist(["drupal", "wordpress"]),
  drupal: v.optional(DrupalBlockSchema),
  wordpress: v.optional(WordPressBlockSchema),
});
```

The `NormalizedConfig` output shape is engine-agnostic, so downstream code (mock file updates, dry-run output) works without changes.

### 3. Add CLI support

In `lib/init/args.js`, add the new engine name to the `choices` array of the `--engine` option:

```js
engine: {
  alias: "e",
  choices: ["drupal", "wordpress"],
  default: "drupal",
},
```

### 4. Wire up the CLI handler

In `lib/cli/drupal-assets.js`, import the new resolver module and branch on `config.engine`:

```js
import * as drupal from "../drupal/resolve-library-assets.js";
import * as wordpress from "../wordpress/resolve-library-assets.js";

const engines = { drupal, wordpress };
const engine = engines[config.engine];

const librariesMap = engine.parseLibraries(yamlContent);
// ...
const assets = engine.resolveComponentAssets(
  libraryName,
  librariesMap,
  config.ignorePrefixes,
);
```
