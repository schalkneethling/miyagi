---
title: "Configuring the JSON Schema validator"
---

## Configuring the JSON Schema specification

If you do not configure anything, _miyagi_ uses the default AJV class, which validates against JSON Schema draft-07.

If you want to use a different draft — for example draft 2020-12 — import the matching AJV class and pass it in your config:

```js
// .miyagi.js

import { Ajv2020 } from "ajv/dist/2020.js";

/* … */

export default {
  /* … */
  schema: {
    ajv: Ajv2020,
  },
};
```

## Configuring options

_miyagi_ uses [Ajv](https://www.npmjs.com/package/ajv) for validating your mock data against JSON schema files.
If you want to configure _Ajv_, please refer to the the [Ajv options](https://ajv.js.org/options.html) on its website.
You can pass these options via `config.schema.options`.
