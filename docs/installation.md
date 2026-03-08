---
eleventyNavigation:
  order: -3
---

# Installation

**_miyagi_ can be installed from [npm](https://www.npmjs.com/package/@schalkneethling/miyagi-core):**

```bash
pnpm add -D @schalkneethling/miyagi-core
```

or

```bash
yarn add --dev @schalkneethling/miyagi-core
```

or

```bash
npm i --save-dev @schalkneethling/miyagi-core
```

**You can also install it globally:**

```bash
pnpm add -g @schalkneethling/miyagi-core
```

or

```bash
yarn global add @schalkneethling/miyagi-core
```

or

```bash
npm i -g @schalkneethling/miyagi-core
```

_**NOTE:** miyagi does not install any template engines for you, so you still need to install them manually._

## First run

After installing:

1. Create `.miyagi.js` or `.miyagi.mjs`.
2. Add an `engine.render` function.
3. Configure at least one of `components.folder` or `docs.folder`.
4. Start miyagi with `pnpm exec miyagi start`, `yarn miyagi start`, `npx miyagi start`, or `miyagi start` if installed globally.

For a full example, see [Starting miyagi](/cli-commands/starting-miyagi/).
