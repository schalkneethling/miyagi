---
eleventyNavigation:
  order: -1
---

# Starting miyagi

Before starting miyagi, make sure you have:

- a `.miyagi.js` or `.miyagi.mjs`
- an `engine.render` function
- at least one of `components.folder` or `docs.folder`

## Quick start

Twig example:

```bash
pnpm add -D @schalkneethling/miyagi-core twing
```

Create `.miyagi.mjs`:

```js
import {
  createSynchronousEnvironment,
  createSynchronousFilesystemLoader,
} from "twing";
import fs from "node:fs";

const twing = createSynchronousEnvironment(
  createSynchronousFilesystemLoader(fs),
);

export default {
  components: {
    folder: "src/components",
  },
  docs: {
    folder: "docs",
  },
  engine: {
    async render({ name, context, cb }) {
      try {
        return cb(null, await twing.render(name, context));
      } catch (err) {
        return cb(err.toString());
      }
    },
  },
};
```

Then run:

```bash
pnpm exec miyagi start
```

or

```bash
yarn miyagi start
```

or

```bash
npx miyagi start
```

or, if installed globally:

```bash
miyagi start
```

This serves _miyagi_ at `http://localhost:5000`. If port `5000` is already in use, _miyagi_ automatically tries the next free port.

## Changing the port

```bash
PORT=<port> miyagi start
```

_**NOTE:** Setting the `NODE_ENV` is optional (default is `development`), but it allows you to serve different assets based on your [configuration](/configuration/options#assets)._

## Useful options

```bash
miyagi start --help
miyagi start --watch-report
miyagi start --watch-report-format json
miyagi start --watch-report-no-color
```

See [`watch.report`](/configuration/options/#watch) for config-backed watch report settings.

## Common first-run errors

- `miyagi start` still fails and you want a quick checklist.
  Run `miyagi doctor`.
- `No render function has beend defined.`
  Add `engine.render` to your miyagi config.
- `Please specify at least either components.folder or docs.folder in your configuration file.`
  Configure at least one source folder in `.miyagi.js` or `.miyagi.mjs`.
- `miyagi wasn't able to find or parse your config file.`
  Check that your config file exists and has valid syntax.
