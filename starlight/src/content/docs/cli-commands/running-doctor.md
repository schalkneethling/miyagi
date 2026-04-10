---
title: "Running doctor"
---

```bash
miyagi doctor
```

This command checks common first-run issues:

- Node.js version
- miyagi config file presence
- config parseability
- `engine.render`
- `components.folder` / `docs.folder`
- existence of configured source folders

Use it when `miyagi start` fails and you want a quick environment check before debugging further.
