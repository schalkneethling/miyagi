---
title: "Performance"
---

_miyagi_ ships an **opt-in** performance feature that reports CSS, JS, and (for pages) HTML bundle sizes. It is enabled by dropping a single JSON file at the root of your component library.

When the file is absent, nothing happens: no menu entry, no overlay, no API endpoints, no CLI side effects. When present, you explicitly enumerate which components to measure and which pages to track. Page configs declare their component dependencies explicitly — there is no auto-discovery in v1.

## Enabling the feature

Create `miyagi.performance.json` next to your `.miyagi.js`:

```json
{
  "components": {
    "components/atoms/button": {
      "css": { "budget": "5 kB" },
      "js": { "budget": "10 kB" }
    },
    "components/molecules/card": {
      "css": {},
      "js": {}
    }
  },
  "pages": {
    "templates/default": {
      "variations": {
        "living room window": {
          "components": [
            "components/atoms/button",
            "components/molecules/card"
          ],
          "budget": {
            "css": "30 kB",
            "js": "100 kB",
            "html": "30 kB",
            "total": "150 kB"
          }
        }
      }
    }
  }
}
```

Top-level `components` and `pages` are both optional — keep only the section you need.

### Top-level keys

- `compression` (`raw` | `gzip` | `brotli`, default `gzip`) — which compressed size to compare against budgets.
- `warnRatio` (number in `(0, 1)`, default `0.8`) — when an asset crosses this fraction of its budget, the status flips from `ok` to `warn`.

### Components

Each entry is keyed by the library-relative folder path (the same path you'd pass to `/show?file=...`). Inside the entry:

- `css`, `js` — both optional. Each is an object that may set `budget` (a size string like `"5 kB"`).
- An empty `{}` means "measure and report this asset, but don't enforce a budget" — the result shows up as `unbudgeted`.

Component asset files are read by name: `<component-name>.css` and `<component-name>.js` at the component folder root, where `<component-name>` matches the terminal folder segment.

The measurement walks static imports — `import "./util.js"` in JS, `@import "./typography.css"` in CSS — and sums every reachable file. A 2 kB entry that imports a 50 kB util reports the full reachable size. `node_modules` is skipped (Drupal/your downstream pipeline owns those dependencies). Dynamic imports and runtime branching aren't followed, and there's no tree-shaking, so the number is an **upper-bound proxy** for what your bundler will actually emit. If the import graph can't be resolved (parse error, exotic loader), the entry file alone is measured rather than throwing.

#### Import patterns the walker supports

JS — every static `import` and `export … from` form is followed:

```js
import x from "./default.js";
import { a, b } from "./named.js";
import x, { a } from "./mixed.js";
import * as ns from "./star.js";
import "./side-effect.js";
export * from "./reexport.js";
export { a } from "./reexport.js";
```

CSS — `@import` is followed when the path is **quoted** and **prefixed with `./`** for siblings:

```css
@import "./typography.css";
@import './typography.css';
@import url("./typography.css");
@import url('./typography.css');
```

**Not followed:**

- `@import url(./x.css)` — unquoted url() arguments. Always quote.
- `@import "x.css"` — bare paths (no `./`). The walker treats them like package specifiers and skips. Use `./x.css` for siblings, `../x.css` for parent traversal.
- Dynamic imports (`import("./x.js")`).
- CSS `composes:` from CSS Modules.

If your component uses an unsupported pattern, the affected import is silently excluded from the total — which makes the reported number lower than reality, not higher. Stick to the supported forms above and you'll get a faithful upper-bound.

### Pages

Each entry is keyed by the template's library-relative path. Under `variations`, each named variation declares:

- `components` — required array of declared component dependencies. The page totals are summed across these components.
- `budget` — optional object with any subset of `css`, `js`, `html`, `total`. Each key is evaluated independently.

## Status semantics

- **ok** — bytes < `warnRatio` × budget
- **warn** — bytes ≥ `warnRatio` × budget, ≤ budget
- **exceed** — bytes > budget
- **unbudgeted** — no budget set for this slot
- **missing** — asset file not present at the expected path (component-only)

## CLI: `miyagi perf`

```bash
miyagi perf
```

Prints a per-asset table for every configured component and page. Exits 0 when the feature is disabled.

| Option          | Purpose                                                            |
| --------------- | ------------------------------------------------------------------ |
| `--compression` | `raw`, `gzip`, or `brotli` — overrides the configured compression  |
| `--warn-ratio`  | Override `warnRatio` for this run (must be in `(0, 1)`)            |
| `--fail`        | Exit non-zero if any component or page has status `exceed`         |
| `--json`        | Emit the full result as JSON on stdout (CI-friendly)               |

## Dev server

When `miyagi.performance.json` exists, the dev server surfaces results in two places:

- **Component overview**: visiting `/show?file=<configured-component>` adds a **Performance** section between Information and Files showing CSS and JS rows with bytes, budget, and status.
- **Page banner**: visiting `/show?file=<configured-page>&variation=<configured-variation>` prepends a banner above the iframe with CSS / JS / HTML / Total chips.

Edits to `miyagi.performance.json` and to component asset files are picked up on the next request — no server restart needed. The underlying byte-size cache is keyed by mtime so unchanged files are reused.

## API endpoints

The dev server exposes JSON endpoints when the config file is present (404 otherwise):

- `GET /api/performance/components` — array of component measurements
- `GET /api/performance/pages` — array of page measurements with totals
- `GET /api/performance/pages/:templatePath/:variation` — single page (URL-encode the path)

## Exit codes

- `0` — no `exceed` rows, or `--fail` not set
- `2` — CLI usage error
- `1` — `exceed` detected with `--fail`

## What changed from previous versions

Earlier _miyagi_ versions tallied global CSS and JS asset folders against a single configured budget. That model isn't useful for Drupal-backed projects whose real bundles are produced downstream — Miyagi's own dev-server bundle isn't tree-shaken or split per page. The opt-in per-component / per-page model replaces it entirely.

A follow-up issue tracks adding **drift validation** — flagging when a page mock references a component not in `pages[…].components`, or vice versa.
