# Resolving Drupal assets

```bash
miyagi drupal-assets
```

This command resolves Drupal `*.libraries.yml` dependencies and writes the flattened result to `$assets` in each component's mock file.

## Options

```bash
miyagi drupal-assets [options]
  --engine, -e       Engine to use (default: "drupal")
  --config           Path to config file (default: .miyagi-assets.js)
  --libraries, -l    Path to *.libraries.yml
  --components, -c   Library names to process (space-separated)
  --ignore-prefixes  Dependency prefixes to skip
  --dry-run          Print resolved $assets without writing files
```

## Examples

Preview changes first:

```bash
miyagi drupal-assets --dry-run
```

Process only specific libraries:

```bash
miyagi drupal-assets --components element-info-message element-button
```

Use a different libraries file:

```bash
miyagi drupal-assets --libraries subtheme.libraries.yml
```

For full setup, config, and examples, see [Drupal: Resolving component assets from libraries.yml](/recipes/drupal-component-assets/).
