---
title: "Options"
---

## `assets`

_Settings for assets that miyagi serves (independently from your components)._

### `root`

default: `""`<br>
type: `string`

This setting can be helpful if assets are located in another folder, e.g. `public/assets`, but they should actually be served from `assets/`. In that case you could set this option to `public`.

### `css`

default: `[]`<br>
type: `string[]`

An array of CSS file paths.

### `customProperties`

default:

```json
{
  "files": [],
  "prefixes": {
    "color": "color",
    "typo": "typo",
    "spacing": "spacing"
  }
}
```

type: `object`

This object is used to generate your automated design token overview.

[More information about the automated design token overview](/how-to/creating-a-design-token-overview).

### `folder`

default: `[]`<br>
type: `array`

If you need _miyagi_ to serve static assets (like images, SVGs, etc.), you can define one or multiple folders here.

```json
["images", "svgs", "templates"]
```

### `isolateComponents`

default: `false`<br>
type: `boolean`

When set to `true`, components that do not declare [`$assets` in their mock data](/how-to/writing-mock-data/#declaring-component-assets) will only load the `shared` assets (see below) plus their own `<component>.miyagi.css` / `<component>.miyagi.js` files. When `false` (default), components without `$assets` load all global `css` and `js` files (legacy behavior).

### `js`

default: `[]`<br>
type: `array`

```json
[
  {
    "src": "src/index.js",
    "defer": false,
    "async": false,
    "type": null,
    "position": "head"
  }
]
```

`defer`, `async`, `type` and `position` are optional.

Please also refer to [How to / Adding JS files](/how-to/adding-js-files/).

### `manifest`

default: `null`<br>
type: `string`

If you create CSS and JS files with hashes and have therefore a manifest file, you can set this here and then use the same keys of the manifest file for your CSS and JS files in `assets.css` and `assets.js`. _miyagi_ will then resolve these.

### `shared`

default:

```json
{
  "css": [],
  "js": []
}
```

type: `object`

Assets that should always be loaded when a component uses [isolated asset loading via `$assets`](/how-to/writing-mock-data/#declaring-component-assets). Typically used for base styles like design tokens, resets, or utility CSS that all components depend on.

```json
{
  "assets": {
    "shared": {
      "css": ["dist/tokens.css", "dist/reset.css"],
      "js": []
    }
  }
}
```

The `js` entries support the same format as `assets.js` (string or object with `src`, `defer`, `async`, `type`, `position`).

## `build`

_Settings for creating a static build._

### `basePath`

default: `/`<br>
type: `string`

If you deploy your build into a subfolder instead of the root folder, set this option to the path of the subfolder.

### `folder`

default: `"build/"`<br>
type: `string`

The folder where your build files will be saved. Use `--folder` when using as a cli argument.

## `components`

### `folder`

default: `"src"`<br>
type: `string`

The folder where your components live.

### `ignores`

default: `["node_modules", ".git", "package.json", "package-lock.json", ".miyagi.js", ".miyagi.mjs"]`<br>
type: `array`

_miyagi_ ignores these folders and files when looking for your components.

When setting a value, it is added to the default value and does not overwrite it.

### `lang`

default: `"en"`<br>
type: `string`

Used to determine the language of components. This will set the value for the `lang` attribute.

### `textDirection`

default: `"ltr"`<br>
type: `string`

Used to determine the value of the `dir` attribute on the `<html>` element.

_**Note:** This only applies the text direction of the components, not if miyagi itself_

## docs

### folder

default: `"docs"`<br>
type: `string|null`

The folder where your documentation lives.

## engine

### render

default `null`<br>
type: `Function`
required: true

The render function for your templates. The function will be called with an object containing the following key/value pairs:

- `name`: type `string` — the template path
- `context`: type `object` — the data being passed to the template
- `cb`: type `Function` — callback functions that expects an error as the first, and the HTML response as a second argument.

#### Example

```js
{
 engine: {
  async render({ name, context, cb }) {
   try {
    return cb(null, await twing.render(name, context));
   } catch (err) {
    return cb(err.toString());
   }
  }
 }
}
```

## `extensions`

default: `[]`<br>
type: `array`

## `files`

_This is the configuration for your actual component files._

Each entry accepts an object with the following keys:

- `extension`: the file extension in your components folder (type: `string`)
- `name`: the name of the file in your components folder (type: `string`)

### `css`

default:

```json
{
  "extension": "css",
  "name": "index"
}
```

_**Note:** You can use `"<component>"` for `name` if the file should have the same name as the component folder._

### `js`

default:

```json
{
  "extension": "js",
  "name": "index"
}
```

_**Note:** You can use `"<component>"` for `name` if the file should have the same name as the component folder._

### `mocks`

default:

```json
{
  "extension": ["json", "js"],
  "name": "mocks"
}
```

This option supports multiple file extension. This can be helpful if you usually have static mock data, but in some cases you want run some method which returns the mock data (see [Asynchronous mock data](/how-to/writing-mock-data/#asynchronous-mock-data)).

The main extension for mock data is always the first one of this array. So, for example, when creating components via `miyagi new` the mock data would be of type `json` (when using the default values).

If you provide a string instead of an array, you can still use `.js` files as well, as this is the fallback for the second extension.

### `schema`

default:

```json
{
  "extension": "json",
  "name": "schema"
}
```

### `templates`

default:

```json
{
  "name": "index",
  "extension": null
}
```

_**Note:** You can use `"<component>"` for `name` if the file should have the same name as the component folder._

## `namespaces`

Namespaces are often used in templating engines. While you need to add these to your templating engine directly, you can use the same namespaces also in your mock files to reference template or other mock files.

default: `{}`<br>
type: `object`

Example:

```json
{
  "@templates": "/path/to/your/templates"
}
```

You can then use `$tpl: "@templates/some-template"` or `$ref: "@templates/some-mocks"` in your mock data.

## `projectName`

default: `"miyagi"`<br>
type: `string`

## `lint`

### `logLevel`

default: `"error"`<br>
type: `string`<br>
values: `error|warn|info`

Controls CLI lint output verbosity:

- `error`: only errors
- `warn`: errors + warnings
- `info`: errors + warnings + info/success messages

Example:

```json
{
  "lint": {
    "logLevel": "warn"
  }
}
```

## Performance

The performance feature is opt-in and configured **outside `.miyagi.js`**, in a dedicated `miyagi.performance.json` file at the project root. See [Performance](/cli-commands/performance-budget/) for the file shape and the `miyagi perf` CLI.

## `ui`

_Settings for the [web UI](/the-ui)._

### `mode`

default: `light`<br>
type: `string`<br>
values: `light|dark|auto`

Defines if the _miyagi_ UI should by default be rendered in light mode, dark mode or listen to the OS setting.

### `reload`

default: `true`<br>
type: `boolean`

Defines if your component automatically reloads after saving.

### `reloadAfterChanges`

#### `componentAssets`

default: `true`<br>
type: `boolean`

Defines if your component automatically reloads after the css or js file of your component has been updated.

_**NOTE:** This is a legacy option. Prefer using [`watch.reload.rules`](#rules) for fine-grained control over reload behavior._

### `textDirection`

default: `"ltr"`<br>
type: `string`

Defines the text direction (`dir` attribute on the `html` tag) of the _miyagi_ UI.

_**NOTE:** This does not set the text direction for the components. If you want to change that as well, please have a look at [`components.textDirection`](#textdirection)._

### `watchConfigFile`

default: `true`<br>
type: `boolean`

When `true`, the miyagi config file (`.miyagi.js` or `.miyagi.mjs`) is watched for changes. When it changes, the server reloads. This setting is also used to populate `watch.configFile.enabled` when merging config.

### `theme`

default:

```json
{
  "favicon": null, // path to a favicon
  "logo": null, // path to a logo — can be used if the same logo should be used for light and dark mode
  "light": {
    // theming for light mode
    "logo": null, // path to a logo
    "navigation": {
      "colorText": "hsl(0, 0%, 12%)",
      "colorBackground": "hsl(0, 0%, 86%)",
      "colorLinks": "hsl(0, 0%, 12%)",
      "colorLinksActive": "hsl(0, 0%, 96%)",
      "colorSearchBorder": "rgba(0, 0, 0, 0.25)"
    },
    "content": {
      "colorBackground": "hsl(0, 0%, 100%)",
      "colorText": "hsl(0, 0%, 12%)",
      "colorHeadline1": "hsl(0, 0%, 12%)",
      "colorHeadline2": "hsl(0, 0%, 12%)"
    }
  },
  "dark": {
    // theming for light mode
    "logo": null, // path to a logo
    "navigation": {
      "colorText": "hsl(0, 0%, 100%)",
      "colorBackground": "hsl(0, 0%, 16%)",
      "colorLinks": "hsl(0, 0%, 100%)",
      "colorLinksActive": "hsl(0, 0%, 16%)",
      "colorSearchBorder": "rgba(255, 255, 255, 0.25)"
    },
    "content": {
      "colorBackground": "hsl(0, 0%, 16%)",
      "colorText": "hsl(0, 0%, 100%)",
      "colorHeadline1": "hsl(0, 0%, 100%)",
      "colorHeadline2": "hsl(0, 0%, 100%)"
    }
  },
  "css": null, // string of CSS which gets added to miyagi and components. can be used to changed the styling of miyagi or e.g. add custom fonts,
  "js": null // string of JS which gets added to components
}
```

## `watch`

_Settings for file watching, live reload transport, and startup watch reporting._

### `backend`

default: `"chokidar"`<br>
type: `string`<br>
values: `chokidar`

`node-watch` is no longer supported.

### `enabled`

default: `true`<br>
type: `boolean`

Enable or disable file watching globally.

### `sources`

default: `[]`
type: `array`

By default, miyagi derives watched sources from known config locations:

- `components.folder`
- `docs.folder`
- local `assets` entries (`assets.folder`, `assets.css`, `assets.js`, and `assets.shared`)
- config file watch settings

`watch.sources` behavior is explicit:

- if `watch.sources` is omitted, defaults above are used
- if `watch.sources` is `[]`, defaults above are used
- as soon as `watch.sources` contains at least one entry, those entries replace auto-derived defaults

Sources can target directories or files. Each source accepts:

- `id`: stable source id (`string`)
- `type`: `dir` or `file`
- `path`: path to watch (`string`)
- `recursive`: whether to recurse (`boolean`, default `true`)
- `optional`: marks a source as expected to be environment-dependent (reported in watch output)

Missing or invalid paths are skipped at runtime. They are shown as `missing` in the startup watch report. If no valid watch targets remain after resolution, miyagi logs a watch startup failure.

### `ignore`

#### `defaults`

default: `true`<br>
type: `boolean`

Includes baseline ignore patterns (`node_modules/**`, `.git/**`).

#### `patterns`

default: `[]`<br>
type: `string[]`

Additional ignore globs. Legacy `components.ignores` values are merged here.

### `behavior`

#### `startupGraceMs`

default: `500`<br>
type: `number`

Grace period (in milliseconds) after the file watcher starts during which all events are silently dropped. This prevents spurious state updates caused by parallel build processes (e.g. esbuild, webpack) writing output files to watched directories during server startup.

Set to `0` to disable.

#### `debounceMs`

default: `60`<br>
type: `number`

Event debounce window before processing starts.

#### `coalesceWindowMs`

default: `120`<br>
type: `number`

Additional coalescing window for burst writes.

#### `awaitWriteFinish`

default:

```json
{
  "enabled": true,
  "stabilityThresholdMs": 200,
  "pollIntervalMs": 50
}
```

Controls write-finish stabilization for atomic save patterns.

### `reload`

#### `enabled`

default: `true`<br>
type: `boolean`

Global reload toggle.

#### `rules`

default:

```json
{
  "template": "iframe",
  "data": "parent",
  "docs": "parent",
  "schema": "iframe",
  "componentAsset": "iframe",
  "globalCss": "iframe",
  "globalJs": "iframe",
  "unknown": "parent"
}
```

Rule values: `none`, `iframe`, `parent`.

These rules determine which part of the miyagi UI is reloaded based on what changed.

- `none`: do not reload browser
- `iframe`: reload only the component iframe
- `parent`: reload the parent UI window (full shell + iframe)

Use `iframe` when a change only affects rendered component output. Use `parent` when navigation/menu/source tree context may have changed.

Rules:

- `template`: component template file changes
- `data`: mock data changes (often affects menu/variation state, so default `parent`)
- `docs`: markdown docs changes (default `parent`)
- `schema`: schema file changes (default `iframe`)
- `componentAsset`: component-local CSS/JS changes (default `iframe`)
- `globalCss`: global CSS asset changes
- `globalJs`: global JS asset changes
- `unknown`: fallback for unclassified changes

You can set any rule to `none`, `iframe`, or `parent` depending on your project workflow. Typical examples:

- Bundled asset pipeline where miyagi should not reload on build output: set `componentAsset`, `globalCss`, `globalJs` to `none`
- Direct file serving during development: keep defaults (`iframe`)
- If state/menu consistency is more important than speed: prefer `parent`

### `socket`

#### `reconnect`

default:

```json
{
  "enabled": true,
  "initialDelayMs": 250,
  "maxDelayMs": 5000,
  "jitter": true
}
```

Client-side websocket reconnect settings.

#### `heartbeat`

default:

```json
{
  "enabled": true,
  "intervalMs": 30000
}
```

Server-side websocket heartbeat settings.

### `report`

default:

```json
{
  "enabled": true,
  "onStart": true,
  "format": "summary",
  "destination": "stdout",
  "useColors": true
}
```

Startup watch report options.

- `format`: `pretty`, `summary`, `json`
- `destination`: currently only `stdout`

Use `json` when the watch report needs to be parsed by scripts or tooling (for example CI checks or custom integrations).
`summary` is the default to keep startup output concise on larger projects.
`pretty` keeps richer sections, and full resolved source listing is shown only when `watch.debug.logResolvedSources=true`.

CLI overrides are available:

- `--watch-report` / `--no-watch-report`
- `--watch-report-format pretty|summary|json`
- `--watch-report-no-color`

Precedence is: `CLI > miyagi config > defaults`.

### `configFile`

default:

```json
{
  "enabled": true
}
```

When `enabled` is `true`, miyagi watches the config file and triggers a full reload when it changes. If not set, this is derived from `ui.watchConfigFile`.

### `debug`

default:

```json
{
  "logEvents": false,
  "logDecisions": false,
  "logResolvedSources": false
}
```

Enable verbose watcher diagnostics while debugging reload decisions.

Note: `watch.debug.logResolvedSources=true` enables full resolved watch source listing in startup report output.

## `schema`

### `ajv`

default: default import of "ajv"

For more information please refer to the [AJV documentation](https://ajv.js.org/guide/schema-language.html#draft-2019-09-and-draft-2020-12).

### `options`

default: `{}`<br>
type: `object`

This object gets passed to the instance of the [schema validator AJV](https://github.com/ajv-validator/ajv/). [See all available options](https://github.com/ajv-validator/ajv/#options).
You can use this to define custom formats e.g..

### `verbose`

default: `false`<br>
type: `boolean`

When `true`, schema validation errors include more detailed AJV output (e.g. full error paths). Useful for debugging schema issues.

## `schemaValidationMode`

default: `"collect-all"`<br>
type: `string`<br>
values: `collect-all|fail-fast`

Controls how schema validation runs during lint:

- `collect-all`: validate all schemas and mocks, then report all errors. Components with schema errors still get mock validation attempted.
- `fail-fast`: stop after schema validation errors; skip mock validation for components with invalid schemas.

Useful when you want CI to surface schema issues first without running mock validation for components that cannot be validated.
