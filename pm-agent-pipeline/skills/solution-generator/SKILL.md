---
name: solution-generator
description: "Generate concrete solution options for validated problems with prototypes and effort estimates."
---

# Solution Generator

Generate 3+ concrete solution options for validated problems. Bias toward action and prototyping — show three rough options rather than debate one perfect one.

## Input

Read `01-discovery/problems.md`, `02-validation/sizing.md`, `03-current-state/landscape.md`, `03-current-state/constraints.md`.

## Output

Write **`04-solutions/options.md`** with 3+ solutions. Each option includes:
- **One-liner**: What it is in one sentence
- **Effort**: Estimated time + team size
- **Stack**: Key technology choices
- **Core features**: What makes the cut
- **Monetization**: How it makes money (or why not)
- **Why this wins or loses**: Honest assessment

Write prototypes to **`04-solutions/prototypes/`** — skeleton code, wireframes, or data models.

## Rules

1. One option should be a "do nothing / very little" baseline
2. Prefer simple over clever; prefer reusing infrastructure over building new
3. Each option must be internally consistent — don't mix incompatible tradeoffs
4. Rank options by viability, not novelty

## Gate

Update `gates.md`.
