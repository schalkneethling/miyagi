---
title: "Plugin API"
---

Miyagi's plugin API is experimental in v4. It exists to keep the default core lightweight and web-platform-first while allowing project or ecosystem packages to add behavior for Twig, Drupal, Web Components, or other integrations.

Plugins are plain JavaScript objects provided through the [`extensions` configuration option](/configuration/options/#extensions). They can be local modules or npm packages imported by the project's `.miyagi.js` or `.miyagi.mjs` file.

## Goals

- Keep the no-plugin path simple: a config file, component folders, mock data, assets, and a project-owned `engine.render` function.
- Move ecosystem-specific behavior behind explicit extension points before adding more engine-specific code to core.
- Preserve existing v4 extension tuples while introducing a clearer object shape for new plugins.
- Start with an experimental contract, then version the API after the Drupal and Twig migration paths are proven.

## Plugin Shape

```js
export default {
  name: "miyagi-example-plugin",

  configure({ config, options }) {
    return {
      watch: {
        sources: [
          {
            id: "example-plugin",
            type: "dir",
            path: options.folder,
            optional: true,
          },
        ],
      },
    };
  },

  async extendTemplateData(templatePath, templateOptions, data) {
    return {
      ...data,
      plugin: {
        templatePath,
      },
    };
  },

  callbacks: {
    async fileChanged(options) {
      options.cache?.clear?.();
    },
  },
};
```

Projects can register a plugin directly or with the object syntax when options are needed:

```js
import examplePlugin from "miyagi-example-plugin";

export default {
  extensions: [
    examplePlugin,
    {
      plugin: examplePlugin,
      options: {
        folder: "fixtures",
      },
    },
  ],
};
```

## Extension Points

### `configure({ config, options })`

Runs while Miyagi processes config. Return a partial Miyagi config object. The returned object is merged into the project config and then normalized by the ordinary config pipeline, so paths, asset arrays, watch sources, and legacy compatibility rules still behave the same way.

Use this for:

- adding `watch.sources`
- adding shared or global assets
- setting file names or extensions
- contributing config defaults for a plugin

Do not use this to start servers, read component state, or mutate global state. Those surfaces are not available yet.

### `extendTemplateData(templatePath, templateOptions, data)`

Runs before component data is passed to the project render function. Return the data object to render. This is the right place for engine helpers that need to be visible in templates.

### `extendWatcher(options)`

Deprecated legacy watcher extension point. It returns a folder and language pair that Miyagi watches as an optional directory.

Existing v4 extensions can keep using it during the compatibility window, but new plugins should use `configure()` with `watch.sources` because it uses the same explicit watch source model as core.

### `callbacks.fileChanged(options)`

Runs after watched files change and before Miyagi updates state and reloads previews. Use it for small cache invalidation work. Long-running rebuilds should stay outside this callback until the lifecycle API is expanded.

## What Stays In Core

- Component discovery from ordinary folders
- Mock data loading, variants, references, and schema validation
- Iframe rendering and the project-owned `engine.render` contract
- Static build generation
- HTML validation and performance reporting
- Asset isolation through `$assets`, `assets.shared`, and `assets.isolateComponents`
- Core CLI/API commands for generic component workflows

## What Should Move To Plugins

- Drupal `*.libraries.yml` resolution and dependency mapping
- Twig/Twing-specific helpers that are not required by Miyagi's internal UI
- Framework-specific asset discovery
- Engine-specific validator rules
- Documentation, examples, or commands for a single ecosystem

## Drupal Example

The Drupal asset resolver is the first planned migration case and is tracked in [#134](https://github.com/schalkneethling/miyagi/issues/134). The eventual plugin shape should look like this from a user's config:

```js
import drupalAssetsPlugin from "@miyagi/drupal-assets";

export default {
  extensions: [
    {
      plugin: drupalAssetsPlugin,
      options: {
        libraries: "mytheme.libraries.yml",
        ignorePrefixes: ["core", "drupal"],
      },
    },
  ],
};
```

Implementation details for extracting the current core resolver belong in the follow-up issue rather than this API reference. Twig/Twing boundary work is tracked separately in [#135](https://github.com/schalkneethling/miyagi/issues/135), and the broader migration documentation is tracked in [#138](https://github.com/schalkneethling/miyagi/issues/138).

## Backwards Compatibility

Existing v4 projects can continue to use:

```js
extensions: [[plugin, options]]
```

This tuple form is deprecated. It remains supported for existing v4 projects, but new code should use the object form below.

New projects should prefer:

```js
extensions: [{ plugin, options }]
```

The API is experimental. Plugin authors should avoid depending on internal `global.*` state unless a documented hook passes the needed value.

## Stabilization Criteria

The plugin API should become versioned only after:

- Drupal asset resolution has moved behind the plugin boundary.
- Twig-specific user-component helpers are separated from Miyagi's internal UI rendering.
- A Web Components example works without Twig or Drupal plugins.
- At least one plugin contributes config, watcher sources, and template data in tests.
