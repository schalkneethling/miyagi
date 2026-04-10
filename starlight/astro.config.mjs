import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import catppuccin from "starlight-theme-catppuccin";

export default defineConfig({
  integrations: [
    starlight({
      title: "miyagi",
      description:
        "A component development tool for JavaScript templating engines.",
      favicon: "/favicon.svg",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo.svg",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/miyagi-dev/miyagi",
        },
      ],
      customCss: ["./src/styles/custom.css"],
      plugins: [catppuccin({ dark: "mocha-mauve", light: "latte-mauve" })],
      sidebar: [
        { label: "Quick Start", slug: "quick-start" },
        { label: "Installation", slug: "installation" },
        {
          label: "The UI",
          items: [
            { label: "Overview", slug: "the-ui" },
            {
              label: "Presentation vs. dev mode",
              slug: "the-ui/presentation-vs-dev-mode",
            },
          ],
        },
        {
          label: "Component Files",
          items: [
            { label: "Overview", slug: "component-files" },
            { label: "Introduction", slug: "component-files/introduction" },
            { label: "Template", slug: "component-files/template" },
            { label: "Mocks", slug: "component-files/mocks" },
            { label: "Schema", slug: "component-files/schema" },
            { label: "Documentation", slug: "component-files/documentation" },
            { label: "Assets", slug: "component-files/assets" },
          ],
        },
        {
          label: "CLI Commands",
          items: [
            { label: "Overview", slug: "cli-commands" },
            {
              label: "Starting miyagi",
              slug: "cli-commands/starting-miyagi",
            },
            {
              label: "Creating a build",
              slug: "cli-commands/creating-a-build",
            },
            {
              label: "Creating a component",
              slug: "cli-commands/creating-a-component",
            },
            {
              label: "Creating mock data",
              slug: "cli-commands/creating-mock-data",
            },
            {
              label: "Linting mock data",
              slug: "cli-commands/linting-mock-data",
            },
            {
              label: "Resolving Drupal assets",
              slug: "cli-commands/resolving-drupal-assets",
            },
            {
              label: "Running doctor",
              slug: "cli-commands/running-doctor",
            },
            {
              label: "Using verbose mode",
              slug: "cli-commands/using-verbose-mode",
            },
            {
              label: "Validating HTML",
              slug: "cli-commands/validating-html",
            },
          ],
        },
        {
          label: "Configuration",
          items: [
            { label: "Overview", slug: "configuration" },
            { label: "Options", slug: "configuration/options" },
            {
              label: "Default configuration",
              slug: "configuration/default-configuration",
            },
          ],
        },
        { label: "JavaScript API", slug: "javascript-api" },
        {
          label: "How-To Guides",
          items: [
            { label: "Overview", slug: "how-to" },
            {
              label: "Adding custom CSS and JS per component",
              slug: "how-to/adding-custom-css-and-js-per-component",
            },
            {
              label: "Adding documentation",
              slug: "how-to/adding-documentation",
            },
            { label: "Adding JS files", slug: "how-to/adding-js-files" },
            {
              label: "Changing miyagi's port",
              slug: "how-to/changing-miyagis-port",
            },
            {
              label: "Changing the HTML language attribute",
              slug: "how-to/changing-the-html-language-attribute",
            },
            {
              label: "Changing the text direction",
              slug: "how-to/changing-the-text-direction",
            },
            {
              label: "Configuring the JSON Schema validator",
              slug: "how-to/configuring-the-json-schema-validator",
            },
            {
              label: "Creating a design token overview",
              slug: "how-to/creating-a-design-token-overview",
            },
            {
              label: "Linting mock data",
              slug: "how-to/linting-mock-data",
            },
            {
              label: "Navigating through miyagi",
              slug: "how-to/navigating-through-miyagi",
            },
            {
              label: "Organizing components",
              slug: "how-to/organizing-components",
            },
            { label: "Theming the UI", slug: "how-to/theming-the-ui" },
            {
              label: "Using a global JSON Schema",
              slug: "how-to/using-a-global-json-schema",
            },
            {
              label: "Using dark and light mode",
              slug: "how-to/using-dark-and-light-mode",
            },
            {
              label: "Writing mock data",
              slug: "how-to/writing-mock-data",
            },
          ],
        },
        {
          label: "Recipes",
          items: [
            { label: "Overview", slug: "recipes" },
            {
              label: "Drupal: Resolving component assets",
              slug: "recipes/drupal-component-assets",
            },
            {
              label: "Drupal: AI agent prompt for asset isolation",
              slug: "recipes/drupal-asset-isolation-prompt",
            },
            {
              label: "Mocking API endpoints",
              slug: "recipes/mocking-api-endpoints",
            },
          ],
        },
        { label: "VS Code Extension", slug: "vs-code-extension" },
        {
          label: "Demos",
          items: [
            {
              label: "Handlebars demo",
              link: "https://handlebars.demos.miyagi.dev",
            },
            {
              label: "Handlebars source",
              link: "https://github.com/miyagi-dev/demos/tree/main/handlebars",
            },
            {
              label: "Web Components demo",
              link: "https://web-components.demos.miyagi.dev",
            },
            {
              label: "Web Components source",
              link: "https://github.com/miyagi-dev/demos/tree/main/web-components",
            },
          ],
        },
        {
          label: "Contributing",
          items: [
            { label: "Contributing guide", slug: "contributing" },
            {
              label: "Code of Conduct",
              slug: "contributing/code-of-conduct",
            },
          ],
        },
        {
          label: "Release Notes",
          items: [
            {
              label: "v4 Migration Guide",
              slug: "release-notes/v4-migration",
            },
            { label: "Changelog", slug: "changelog" },
          ],
        },
      ],
    }),
  ],
});
