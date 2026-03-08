---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Ready a new commit for review
---

# Ready a new commit for review

Current git status: !'git status'

Recent commits: !'git log --oneline -5'

- Create a commit based on the staged changes.
- Commits must follow converntional commits

## Merge Request Descriptions

**Format merge request descriptions to be clear, approachable, and collaborative.**

### Structure

1. **Summary** - Brief description of what changed and why
2. **What changed** - Technical breakdown organized by category (architecture, files, tests)
3. **Testing** - Commands to verify the changes

### Language Style

- **Collaborative, not prescriptive** - "This enables..." not "You must..."
- **Clear and approachable** - Avoid jargon; explain technical decisions
- **Concise without being terse** - Enough detail to understand, not exhaustive
- **Highlight critical contracts** - When values/types must match across systems, make it prominent
- **Use tables for enumerated values** - Makes scanning easier than prose

### Example Structure

```markdown
## Summary

Brief description of the change and its purpose.

## What changed

**Category 1:**

- Bullet points of changes

**Category 2:**

- More changes

## Testing

- `yarn test:unit` - Unit tests
- `yarn playwright test <path>` - E2E tests
```

**Why this matters:** Good PR descriptions reduce review friction, serve as documentation, and help future developers understand decisions.
