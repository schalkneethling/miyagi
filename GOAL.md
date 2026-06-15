# Project Goal

## North Star

Miyagi helps frontend teams build, inspect, validate, document, and publish components independently from an application backend as a lightweight, web-platform-first alternative to heavier component workshop tools.

## Who This Is For

Miyagi is for frontend developers and design-system maintainers who work with component libraries, static markup, mock data, project-specific component folders, and JavaScript template engines or Web Components. It is especially useful when components need to be developed in isolation, documented, validated, and exported as static artifacts without adopting a full application framework or a large Storybook-style toolchain.

## Core Goals

1. Provide a lightweight component workbench.
   Miyagi should start from a small project configuration, discover components from ordinary folders, render each component and variant in an iframe, and support live reload during local development.

2. Stay web-platform-first and template-engine agnostic.
   Miyagi's core should favor browser-native component isolation, static HTML output, CSS, JavaScript, mock data, and explicit configuration. Projects should bring their own render function so Miyagi can support Twig, Handlebars, Web Components, or other engines without making one ecosystem the center of gravity.

3. Make mock data useful and trustworthy.
   Components should be developable without a backend through static or dynamic mocks, variants, references, generated mock data, JSON Schema validation, and linting through both CLI and JavaScript API.

4. Support real component workflows end to end.
   Miyagi should scaffold component files, render HTML, create static builds, expose selected JSON data, validate rendered HTML, measure performance budgets, and generate documentation and design-token overviews from component assets.

5. Fit into existing projects and automation.
   The CLI, JavaScript API, docs, tests, and build output should be stable enough for use in local development, CI, static publishing, and project-specific tooling.

6. Keep specialized integrations pluggable.
   Twig, Drupal, framework-specific asset resolution, and other ecosystem-specific behavior should live behind explicit extension points where possible, so the core remains useful for Web Components and other non-Twig projects.

## Success Looks Like

- A new project can add Miyagi with one configuration file and start a local component development server.
- Components render consistently from project-owned templates, mocks, schemas, docs, CSS, and JavaScript.
- Developers can validate mock data, rendered HTML, and performance budgets before changes ship.
- Static builds produce predictable HTML and manifest output that can be published or consumed by downstream tooling.
- Documentation stays aligned with default configuration and public behavior.
- The CLI and JavaScript API remain covered by focused tests for core rendering, config, validation, build, watcher, Drupal, and performance behavior.
- Ecosystem-specific capabilities can be installed, configured, tested, and documented without making the default core experience feel tied to that ecosystem.
- A flagship Web Components example demonstrates Miyagi's core workflow without Twig, Drupal, or backend assumptions, and acts as a regression signal for the web-platform-first direction.

## Non-Goals

- Miyagi is not a full application framework, router, CMS, or backend runtime.
- Miyagi should not require projects to use one prescribed template engine, directory structure, design system, bundler, or frontend framework.
- Miyagi should not replace project-owned rendering logic; projects are expected to provide the render function for their engine.
- Miyagi should not become a general-purpose asset bundler. It may resolve, copy, isolate, and report on assets needed for component workflows, but application bundling remains outside its core scope.
- Miyagi should deliberately not compete with Storybook by matching every addon, test runner, visual review, hosting, or framework integration feature. Its advantage should be a smaller, clearer component workbench built around ordinary web output.
- Miyagi should avoid broad, engine-specific integrations in core. When integrations are valuable, they should be optional utilities or plugins with clear boundaries.

## Principles and Constraints

- Keep setup lightweight: a configuration file plus ordinary component folders should be enough to start.
- Preserve component isolation by defaulting component previews to iframe rendering and supporting explicit asset isolation when needed.
- Treat the iframe preview, static build output, and ordinary browser APIs as strategic foundations, not incidental implementation details.
- Design new extension points before adding more Twig-, Drupal-, or framework-specific behavior to core.
- Prefer explicit validation and actionable reports over hidden magic.
- Keep public behavior available through both CLI commands and JavaScript API where that makes automation easier.
- Treat docs as part of the product; changes to defaults or API response shapes should update documentation in the same work.
- Maintain the v4 ES module architecture and current runtime baseline of Node.js 24 or newer.
- Respect existing global-state architecture unless a change is intentionally scoped to reduce risk or clarify ownership.

## Current Focus

The current v4 line is consolidating Miyagi as a modern ES module package with a custom-render-function model, stronger validation, more reliable watch and reload behavior, component asset isolation, HTML validation, and performance budget reporting. Near-term architectural focus areas are deciding how to move Twig-, Drupal-, and other ecosystem-specific behavior behind a pluggable API without weakening the simple default setup, and adding a flagship Web Components example that exercises Miyagi end to end.

## Open Questions

None at this time. This goal is based on the current repository documentation, package metadata, CLI/API surface, test coverage, and recent changelog entries.
