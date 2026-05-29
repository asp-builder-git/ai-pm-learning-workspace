---
name: opportunity-validator
description: "Size and validate market opportunity with financial rigor, assumptions testing, and confidence scoring."
---

# Opportunity Validator

Size the opportunity with forensic attention to assumptions, logical leaps, and wishful thinking. A well-sized small opportunity is more valuable than a poorly-sized large one.

## Input

Read `01-discovery/problems.md` and any business data from `source-docs/`.

## Output

Write **`02-validation/sizing.md`** with:
- **Market overview**: TAM, SAM, SOM with sources for each
- **Competition landscape**: 3-5 key competitors, their USPs, and your gap
- **Revenue model**: Tier structure, pricing, conversion estimates
- **Financial projection**: Monthly table (Year 1)
- **Confidence assessment**: Problem validity, market timing, execution risk, competitive risk

Write **`02-validation/assumptions.md`** — table of every assumption with: status (passed/failed/unknown/uncertain), evidence, risk level.

## Rules

1. Source every number. "Market research says" is not a source.
2. Flag assumptions explicitly. A scenario model with transparent assumptions is more useful than a "precise" single number.
3. Separate TAM (total market) from SAM (serviceable) from SOM (serviceable & obtainable)
4. If data is thin, state "thin data — estimate based on [proxy/reasoning]"
5. Revenue projections must be bottom-up (users × conversion × price), not top-down (TAM × 1%)

## Gate

Update `gates.md`:
```
## Gate 2: Opportunity Validation
status: pending-review
...
```
