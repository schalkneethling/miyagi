---
title: Quick Start
description: Get miyagi running in minutes with a Twig example.
---

## Requirements

- Node.js `24` or higher

## Installation

Install miyagi alongside a template engine. This example uses [twing](https://github.com/NightlyCommit/twing) (a Node.js port of Twig):

```bash
pnpm add -D @schalkneethling/miyagi-core twing
```

## Configuration

Create `.miyagi.mjs` in your project root:

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

## Start miyagi

```bash
pnpm exec miyagi start
```

Open `http://localhost:5000`.

If you use a different template engine, swap the `engine.render` implementation. See [Installation](/installation/) for all package manager options and a full first-run checklist.
