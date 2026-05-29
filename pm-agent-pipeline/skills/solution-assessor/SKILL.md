---
name: solution-assessor
description: "Score and recommend between solution options using weighted criteria aligned to project mode."
---

# Solution Assessment

Evaluate solution options against weighted criteria aligned to the project's mode (pilot/mvp/platform). Give a clear recommendation with risk register.

## Input

Read `04-solutions/options.md` and the project's `Idea.md` for mode.

## Output

Write **`05-assessment/recommendation.md`** with:
- **Scoring table**: Each option scored 1-5 on criteria: time to market, validation risk, development cost, revenue potential, strategic fit, user delight
- **Weighted total**: With mode-specific weighing
- **Recommendation**: Clear "Option X recommended" with 3-sentence rationale
- **Risk register**: Table of top 5 risks: severity, likelihood, mitigation, owner

Write **`05-assessment/risks.md`** — full risk register table.

## Rules

1. Mode determines weights: pilot → speed + cost, mvp → validation + delight, platform → strategic fit + revenue
2. Every recommendation includes a fallback — "If X doesn't work, do Y"
3. Flag risks that are blockers (must be resolved) vs. watch items (monitor over time)

## Gate

Update `gates.md`.
