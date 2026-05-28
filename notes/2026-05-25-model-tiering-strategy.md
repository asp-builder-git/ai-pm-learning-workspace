# Thinking Through Model Tiering Strategy

Today I explored how to structure a tiered model strategy for my AI PM workflows. The goal was to balance cost, speed, and depth without over‑engineering the routing logic.

## My Goal
- Setup model in my environment that gives me maximum flexibility
- Identify the fast/cheap models vs. deep/expensive ones
- How to design routing system across tools I use (openclaw, cursor)
- How to keep costs predictable while still allowing high‑quality reasoning

## Learnings
- I started with setting up an Anthropic account, should have started with a more cost-efficient DeepSeek or Gemini model
- Daily operations don’t need Opus‑level reasoning. A fast model like DeepSeek V4 Flash is more than enough for routine tasks.
- A three‑tier system (`[fast]`, `[deep]`, `[opus]`) gives me flexibility without complexity.
- Prefix‑based routing works across tools and keeps the mental model simple.
- Cost differences are massive: ~$15/M tokens vs. ~$0.15/M tokens. This matters for iterative workflows

## What I Want to Try Next
- Test how different agents behave under different tiers
- Document failure modes when using cheaper models
- Explore automated routing based on task type
