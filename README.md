<div align="center">
  <img src="logo.svg" width="300" height="60" alt="miyagi">
</div>

# miyagi

_miyagi_ is a component development tool for JavaScript templating engines.

## Benefits

- No overhead in your project: _miyagi_ only needs one configuration file.
- Works with any directory structure (as long as you have one folder per component).
- Helps you developing your components encapsulated.
- Mock data (static or dynamic) allows developing independently from a backend.
- Validates your mock data against your JSON schema files.
- Documentation of your components using markdown.
- You can customize the layout, so it fits the design of your project.
- Use any kind of templating engine by providing your own render function.
- Allows creating a static build.
- Lots of functionality invokable via CLI or JavaScript API.
- Automatically created design tokens overview based on CSS custom properties.

## Requirements

- NodeJS `24` or higher

## Quick start

Twig example:

```bash
pnpm add -D @schalkneethling/miyagi-core twing
```

Create `.miyagi.mjs`:

```js
import { createSynchronousEnvironment, createSynchronousFilesystemLoader } from "twing";
import fs from "node:fs";

const twing = createSynchronousEnvironment(createSynchronousFilesystemLoader(fs));

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

Then start miyagi:

```bash
pnpm exec miyagi start
```

Open `http://localhost:5000`.

If you use a different template engine, swap the `engine.render` implementation for that engine.

## Demos

### Handlebars

[handlebars.demos.miyagi.dev](https://handlebars.demos.miyagi.dev) (Code: [https://github.com/miyagi-dev/demos/tree/main/handlebars](https://github.com/miyagi-dev/demos/tree/main/handlebars))

### Web Components

[web-components.demos.miyagi.dev](https://web-components.demos.miyagi.dev) (Code: [https://github.com/miyagi-dev/demos/tree/main/web-components](https://github.com/miyagi-dev/demos/tree/main/web-components))

## Documentation

[https://docs.miyagi.dev](https://docs.miyagi.dev)

CLI quickstart: [https://docs.miyagi.dev/cli-commands/starting-miyagi/](https://docs.miyagi.dev/cli-commands/starting-miyagi/)

## Sponsor

<a href="https://factorial.io"><img src="https://logo.factorial.io/color.png" width="40" height="56" alt="Factorial"></a>
