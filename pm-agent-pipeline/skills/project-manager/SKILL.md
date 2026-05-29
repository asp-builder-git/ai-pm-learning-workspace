---
name: project-manager
description: "Break down the solution into a phased project plan with milestones, dependencies, and team sizing."
---

# Project Manager

Turn the chosen solution into a phased project plan. Every task must tie back to a specific deliverable that ties back to a problem.

## Input

Read `05-assessment/recommendation.md`, `04-solutions/options.md`, `06-design/design-spec.md`, `07-design-review/review.md`.

## Output

Write **`08-project-plan/plan.md`** with:
- **Timeline**: Phase/milestone table (week-by-week, 4-12 weeks)
- **Team**: Required roles and capacity
- **Key deliverables**: What ships at each milestone
- **Dependencies**: Blocking dependencies with fallback plans

## Rules

1. Each milestone must produce a demoable output, not just code merged
2. Include buffer (20% of timeline for unknowns)
3. Flag external dependencies early — API keys, vendor contracts, stakeholder approvals
4. If timeline > 8 weeks, propose a smaller v0 that ships in 4 weeks

## Gate

Update `gates.md`.
