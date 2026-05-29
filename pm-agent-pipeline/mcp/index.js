#!/usr/bin/env node
/**
 * PM Agent Pipeline — MCP Server
 *
 * Two tools:
 * 1. generate_product_brief — creates project scaffold, runs 11-agent pipeline
 * 2. delve_stage — deep-dive into any stage for 2-3x more detailed analysis
 *
 * Install: claude mcp add pm-pipeline node /path/to/mcp/index.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Agent Prompts (standard) ─────────────────────────────────────────────────

const AGENTS = [
  {
    id: "problem-discoverer",
    name: "Problem Discovery",
    dir: "01-discovery",
    prompt: `You are a problem-discoverer. Find problems worth solving by analyzing feedback, docs, and metrics.
Write 3-5 ranked problem statements to 01-discovery/problems.md.
Rank by impact × breadth × solvability. Include evidence with sources.
Write supporting artifacts to 01-discovery/evidence/.`,
    inputs: ["source-docs/", "10-feedback/insights.md (if exists)"],
    outputs: ["01-discovery/problems.md", "01-discovery/evidence/"],
  },
  {
    id: "opportunity-validator",
    name: "Opportunity Validation",
    dir: "02-validation",
    prompt: `You are an opportunity-validator. Size the market opportunity with financial rigor.
Write 02-validation/sizing.md with TAM/SAM/SOM, competition landscape, revenue model, projections.
Write 02-validation/assumptions.md with every assumption flagged as passed/failed/unknown.
Source every number. Be skeptical of wishful thinking.`,
    inputs: ["01-discovery/problems.md", "source-docs/"],
    outputs: ["02-validation/sizing.md", "02-validation/assumptions.md"],
  },
  {
    id: "current-state-expert",
    name: "Current State Assessment",
    dir: "03-current-state",
    prompt: `You are a current-state-expert. Map what exists today and what constraints apply.
Write 03-current-state/landscape.md (feature matrix, trends, opportunities).
Write 03-current-state/constraints.md (technical, business, timeline constraints).
Label constraints: real vs perceived, fixed vs negotiable.`,
    inputs: ["01-discovery/problems.md", "source-docs/"],
    outputs: ["03-current-state/landscape.md", "03-current-state/constraints.md"],
  },
  {
    id: "solution-generator",
    name: "Solution Generation",
    dir: "04-solutions",
    prompt: `You are a solution-generator. Generate 3+ concrete solutions for validated problems.
Write 04-solutions/options.md — each with one-liner, effort, stack, core features, monetization.
Write prototypes to 04-solutions/prototypes/.
Prefer simple. Include a "do nothing" baseline. Rank by viability.`,
    inputs: ["01-discovery/problems.md", "03-current-state/landscape.md"],
    outputs: ["04-solutions/options.md", "04-solutions/prototypes/"],
  },
  {
    id: "solution-assessor",
    name: "Solution Assessment",
    dir: "05-assessment",
    prompt: `You are a solution-assessor. Score options against weighted criteria.
Read Idea.md for project mode (pilot/mvp/platform).
Write 05-assessment/recommendation.md with scoring table, weighted total, recommendation, risk register.
Write 05-assessment/risks.md. Include a fallback option.`,
    inputs: ["04-solutions/options.md", "Idea.md"],
    outputs: ["05-assessment/recommendation.md", "05-assessment/risks.md"],
  },
  {
    id: "ux-designer",
    name: "UX Design",
    dir: "06-design",
    prompt: `You are a ux-designer. Design flows directly solving validated problems.
Write 06-design/design-spec.md — core principles, key screens, user flow.
Every decision traces to a problem. Minimum viable screens. Specify interactions.`,
    inputs: ["01-discovery/problems.md", "04-solutions/options.md"],
    outputs: ["06-design/design-spec.md"],
  },
  {
    id: "ux-design-lead",
    name: "Design Review",
    dir: "07-design-review",
    prompt: `You are a ux-design-lead. Critique the design for consistency and problem alignment.
Write 07-design-review/review.md with verdict, what works, required revisions, blocking issues.
Required revisions are non-negotiable. Block if the design doesn't solve top problems.`,
    inputs: ["06-design/design-spec.md", "01-discovery/problems.md"],
    outputs: ["07-design-review/review.md"],
  },
  {
    id: "project-manager",
    name: "Project Planning",
    dir: "08-project-plan",
    prompt: `You are a project-manager. Break the solution into a phased plan.
Write 08-project-plan/plan.md with timeline, team, deliverables, dependencies.
Each milestone produces a demoable output. Include 20% buffer.
If timeline > 8 weeks, propose a 4-week v0.`,
    inputs: ["05-assessment/recommendation.md", "06-design/design-spec.md"],
    outputs: ["08-project-plan/plan.md"],
  },
  {
    id: "gtm-designer",
    name: "GTM Design",
    dir: "09-gtm",
    prompt: `You are a gtm-designer. Design the launch campaign.
Write 09-gtm/launch-plan.md with channels, phases, and messaging.
Pick 2-3 primary channels. Include pre-launch, launch, and post-launch phases.
Headline and tagline should connect to the top problem.`,
    inputs: ["01-discovery/problems.md", "08-project-plan/plan.md"],
    outputs: ["09-gtm/launch-plan.md"],
  },
  {
    id: "feedback-manager",
    name: "Feedback Setup",
    dir: "10-feedback",
    prompt: `You are a feedback-manager. Design how you'll learn if the product works.
Write 10-feedback/insights.md with collection channels, metrics, learning loops.
Define success before launch. Prefer behavioral metrics over attitudinal.`,
    inputs: ["01-discovery/problems.md", "06-design/design-spec.md"],
    outputs: ["10-feedback/insights.md"],
  },
  {
    id: "communications-specialist",
    name: "Communications Planning",
    dir: "11-communications",
    prompt: `You are a communications-specialist. Create the daily launch calendar.
Write 11-communications/calendar.md — day-by-day launch week, weekly post-launch, voice & tone.
Every post has a goal. No corporate jargon. Adapt per channel.`,
    inputs: ["09-gtm/launch-plan.md"],
    outputs: ["11-communications/calendar.md"],
  },
];

// ─── Deep-Dive Prompts (for the delve_stage tool) ────────────────────────────

const DEEP_PROMPTS = {
  "problem-discoverer": {
    description: "Deep-dive on problem discovery — validate root causes, build personas, run 5-whys",
    outputs: [
      "01-discovery/deep/problems-validated.md",
      "01-discovery/deep/5-whys-analysis.md",
      "01-discovery/deep/personas.md",
      "01-discovery/deep/evidence-triangulation.md",
    ],
    prompt: `You are doing a DEEP-DIVE on problem discovery. The initial pass identified top problems at a high level. Now dig deeper.

Read the existing outputs:
- Idea.md (if exists)
- 01-discovery/problems.md (initial problem statements)
- 01-discovery/evidence/ (any initial evidence gathered)

Your task — produce ALL of the following:

1. **01-discovery/deep/problems-validated.md** — For each existing problem statement, add:
   - Quantitative validation: Specific numbers from research, surveys, benchmarks
   - Contradicting views: What evidence would argue this ISN'T a real problem?
   - Severity calibration: On a 1-5 scale, how painful is this really? (not assumed, but justified)
   - Frequency estimate: How often does this pain occur? Daily? Weekly? Once?

2. **01-discovery/deep/5-whys-analysis.md** — Root cause deep-dive:
   - Pick the top 2 problems and run a 5-Whys analysis on each
   - Build a causal loop diagram (text-based) showing reinforcing feedback loops
   - Identify leverage points: Where could a small change break the loop?
   - Flag gating assumptions: What must be true for this root cause to be correct?

3. **01-discovery/deep/personas.md** — Persona deep-dive:
   - 3 detailed personas affected by the top problem(s)
   - Each persona: demographics, daily workflow, tools used today, workarounds attempted, emotional state, willingness to pay
   - Quote: "In their own words" — a realistic direct quote expressing their frustration
   - Priority: Which persona suffers most and why they'd be first adopters

4. **01-discovery/deep/evidence-triangulation.md** — Evidence quality assessment:
   - For each evidence source in problems.md: Is it direct (user research) or inferred (analyst report)?
   - Confidence rating per source: strong / moderate / weak / speculative
   - Missing evidence: What data would resolve the biggest open questions?
   - Quick-win research: The cheapest way to validate each assumption in <1 week

Rules:
- Do NOT re-summarize what the initial pass already said. Add NEW depth.
- Push past the obvious. If a root cause seems surface-level, ask "why?" again.
- Be skeptical. Good problem discovery disproves hypotheses, doesn't confirm them.
- If the initial pass had 4 problems and you find a 5th that was missed, add it.`,
  },

  "opportunity-validator": {
    description: "Deep-dive on market sizing — TAM/SAM/SOM with bottoms-up validation, competitive teardowns, unit economics",
    outputs: [
      "02-validation/deep/competitive-teardown.md",
      "02-validation/deep/bottoms-up-sizing.md",
      "02-validation/deep/unit-economics.md",
      "02-validation/deep/assumptions-validated.md",
    ],
    prompt: `You are doing a DEEP-DIVE on opportunity validation. The initial pass sized the market at a high level. Now build a defensible, bottoms-up model.

Read the existing outputs:
- 02-validation/sizing.md (initial TAM/SAM/SOM)
- 02-validation/assumptions.md (assumptions log)
- 01-discovery/problems.md
- Idea.md (for mode)

Your task:

1. **02-validation/deep/competitive-teardown.md** — Full competitive analysis:
   - Identify 5-8 direct and indirect competitors (not just the obvious 3)
   - For each: pricing, MAU/usage estimate, key features, UX quality, funding/revenue
   - Feature comparison matrix (rows = features, cols = competitors, cells = ✓/✗/partial)
   - Competitive positioning map: on two axes (e.g., simplicity vs power, price vs privacy)
   - Winner/Loser analysis: Who's winning today and why? Whose position is vulnerable?
   - Blue ocean angles: What competitors are NOT doing that you could own

2. **02-validation/deep/bottoms-up-sizing.md** — Defensible market model:
   - TAM: Total addressable market with source and calculation (not just a cited number)
   - SAM: Filtered by segment criteria (geo, demographic, behavior) with % attrition at each filter
   - SOM: Year 1-3 bottoms-up projection from channel capacity
   - Example: "We can reach 50K users via Product Hunt (10% conversion → 5K) + organic SEO (500/mo) → 11K Year 1"
   - Growth scenarios: conservative (70% of base), moderate (base), aggressive (130%)

3. **02-validation/deep/unit-economics.md** — Financial model:
   - Customer acquisition cost by channel (estimate with justification)
   - Lifetime value projection (retention curve assumptions, expansion revenue)
   - LTV/CAC ratio for each scenario
   - Break-even analysis: Months to recover CAC, months to overall profitability
   - Sensitivity analysis: Which variable (price, retention, CAC) most changes outcomes?

4. **02-validation/deep/assumptions-validated.md** — Revisit the initial assumptions log:
   - For each assumption in assumptions.md: upgrade/downgrade confidence based on new analysis
   - New assumptions discovered during deep-dive
   - The "bet the company" assumption: What single assumption, if wrong, kills the business?
   - Validation plan: How to test the top 3 highest-impact assumptions in 2 weeks for under $500

Rules:
- Source every number. "Industry average" is not a source.
- Bottoms-up beats top-down. A $4.2B TAM from Grand View Research is a starting point, not an answer.
- Be specific about competitor weaknesses: "Streaks has no Android version" > "competition is weak".
- If assumptions are too numerous to validate, prioritize by impact × uncertainty.`,
  },

  "current-state-expert": {
    description: "Deep-dive on competitive landscape — feature matrices, trend analysis, constraint validation",
    outputs: [
      "03-current-state/deep/feature-matrix.md",
      "03-current-state/deep/trend-analysis.md",
      "03-current-state/deep/constraint-validated.md",
      "03-current-state/deep/white-space-map.md",
    ],
    prompt: `You are doing a DEEP-DIVE on current state assessment. Move beyond high-level SWOT to granular competitive analysis and constraint validation.

Read existing outputs: 03-current-state/landscape.md, 03-current-state/constraints.md, 01-discovery/problems.md, Idea.md

Your task:

1. **03-current-state/deep/feature-matrix.md** — Granular feature comparison:
   - 20+ feature rows across categories: core functionality, UX, platform, privacy, pricing, integrations
   - Columns: 8-10 competitors (direct + indirect + adjacent)
   - Each cell: ✓ (native), ~ (partial/limited), ✗ (absent), ? (unknown)
   - Scoring summary: who leads on feature coverage, who on UX polish, who on simplicity

2. **03-current-state/deep/trend-analysis.md** — Market trends:
   - 5-8 trends affecting this space (tech, consumer behavior, regulation, platform shifts)
   - For each: signal strength, time horizon (0-6mo, 6-18mo, 18mo+), your positioning advantage
   - Adjacent trends: What's happening in neighboring markets that could spill over?
   - "Trend surf" assessment: Is the wind at your back or in your face?

3. **03-current-state/deep/constraint-validated.md** — Reality-check constraints:
   - For each constraint in constraints.md: Is it REAL (immovable), NEGOTIABLE (can be changed with effort), or PERCEIVED (assumed but not verified)?
   - Technical deep-dive: What specific technical constraints exist? (API rate limits, platform policies, platform-specific behavior like iOS notification limits)
   - Timeline constraints: What's the actual critical path? Not the optimistic one.
   - Resource constraints: What would you NEED vs what would you LIKE?

4. **03-current-state/deep/white-space-map.md** — Where competitors AREN'T:
   - Map competitors on 2-3 axes relevant to your product's differentiation
   - Highlight empty quadrants — these are your potential white spaces
   - For each white space: Is it unoccupied because no one thought of it, or because it's not viable?
   - Positioning recommendation: Which white space to claim and the one sentence that owns it

Rules:
- Don't just describe competitors — analyze their MOVES and TRAJECTORY
- A constraint you can work around isn't a real constraint
- White spaces that are empty for good reason (no demand, no business model) aren't opportunities`,
  },

  "solution-generator": {
    description: "Deep-dive on solution options — architectural deep-dives, trade-off analysis, prototype specs",
    outputs: [
      "04-solutions/deep/architecture-comparison.md",
      "04-solutions/deep/tradeoff-matrix.md",
      "04-solutions/deep/prototype-spec.md",
      "04-solutions/deep/phasing-strategy.md",
    ],
    prompt: `You are doing a DEEP-DIVE on solution generation. Move beyond 3 options at headline level to architectural trade-offs and detailed prototype specs.

Read existing outputs: 04-solutions/options.md, 04-solutions/prototypes/, 01-discovery/problems.md, Idea.md, 05-assessment/recommendation.md (if exists)

Your task:

1. **04-solutions/deep/architecture-comparison.md** — Technical deep-dive:
   - For the recommended option: Full architecture (components, data flow, external services, deployment)
   - For the runner-up option: Same, showing where trade-offs differ
   - Decision tree: What would make you switch from Option A to Option B? (e.g., "If pilot shows <20% retention, switch to Option C's approach")
   - Stack evaluation: Why each library/framework was chosen over alternatives

2. **04-solutions/deep/tradeoff-matrix.md** — Build vs buy vs partner analysis:
   - For each major component: Build from scratch, Use OSS + customize, Buy SaaS, Partner/white-label
   - Cost estimate: Dev time per option, ongoing maintenance, vendor lock-in risk
   - Recommendation per component with rationale

3. **04-solutions/deep/prototype-spec.md** — Detailed prototype specification:
   - For Option A: Wireframe descriptions (not visual, but structural — every screen, every state)
   - Empty states, error states, loading states, edge cases
   - Data model: Key entities, relationships, fields
   - API surface: Key endpoints or function signatures
   - Success criteria: How will you know the prototype validated/invalidated the thesis?

4. **04-solutions/deep/phasing-strategy.md** — Build sequencing:
   - Phase 0 (Days 1-3): What's the absolute minimum to test the core risk?
   - Phase 1 (Week 1-2): What gets you to "usable by 5 friends"?
   - Phase 2 (Week 3-4): What makes it "worth sharing on HN"?
   - Phase 3 (Month 2+): What turns it into a real product?
   - Kill criteria: At what point do you stop and pivot?

Rules:
- Architecture matters. Don't hand-wave "React Native + Firebase" — justify the choices.
- Every trade-off has a cost. Acknowledge what you're giving up, not just what you gain.
- The prototype spec should be detailed enough that a developer could estimate hours from it.`,
  },

  "solution-assessor": {
    description: "Deep-dive on assessment — risk quantification, sensitivity analysis, decision trees",
    outputs: [
      "05-assessment/deep/risk-quantified.md",
      "05-assessment/deep/sensitivity-analysis.md",
      "05-assessment/deep/decision-tree.md",
      "05-assessment/deep/retrospective-scenarios.md",
    ],
    prompt: `You are doing a DEEP-DIVE on solution assessment. Move beyond a single scoring matrix to full risk quantification and decision modeling.

Read existing outputs: 05-assessment/recommendation.md, 05-assessment/risks.md, 04-solutions/options.md, Idea.md

Your task:

1. **05-assessment/deep/risk-quantified.md** — Quantified risk register:
   - For each risk in the initial register: Estimate specific dollar/time impact range
   - Probability distribution: Low/medium/high → percentage ranges (e.g., 10-30%, 40-60%, 70-90%)
   - Risk heat map: Plot risks on impact × probability grid, highlight top 3 to actively manage
   - Mitigation cost: What's the cost (time/money/scope) to mitigate each top risk?
   - Risk owner assignment: Who (by role) is responsible for monitoring each risk?

2. **05-assessment/deep/sensitivity-analysis.md** — What moves the needle:
   - Single-variable sensitivity: If ONLY [variable] changes, at what point does the recommendation flip?
   - Multi-variable scenarios: Best case, worst case, most likely case for the recommended option
   - The "one thing" that matters most: For each option, identify the single assumption that determines success or failure
   - Threshold analysis: What would need to be true for Option B to beat Option A? And is that realistic?

3. **05-assessment/deep/decision-tree.md** — Sequential decision model:
   - Build a decision tree: "If we do X and Y happens, then Z. But if Y' happens instead, then Z'."
   - Include option nodes (choices you control) and chance nodes (things outside your control)
   - Expected value calculation for each path (simplified)
   - Recommend the path with highest expected value, not just the highest upside
   - Path dependency: What decisions TODAY limit your options TOMORROW?

4. **05-assessment/deep/retrospective-scenarios.md** — What would future-you say?:
   - "6 months from now, this failed because..." — 3 concrete failure narratives
   - "6 months from now, this succeeded wildly because..." — 1 success narrative
   - Pre-mortem insights: What actions TODAY prevent the failure scenarios?
   - Kill criteria refinement: Based on the above, what specific metric would trigger a pivot?

Rules:
- Quantify everything you can. "High impact" is not a number.
- Decision trees expose assumptions. If a branch depends on an assumption you can't verify, flag it.
- Pre-mortems are more honest than success scenarios. Spend more time on failure modes.`,
  },

  "ux-designer": {
    description: "Deep-dive on UX — screen-by-screen specs, interaction design, accessibility, microcopy",
    outputs: [
      "06-design/deep/screen-specs.md",
      "06-design/deep/interaction-flows.md",
      "06-design/deep/accessibility-audit.md",
      "06-design/deep/microcopy-guide.md",
    ],
    prompt: `You are doing a DEEP-DIVE on UX design. Move beyond core screens and principles to full interaction specs and accessibility.

Read existing outputs: 06-design/design-spec.md, 01-discovery/problems.md, Idea.md

Your task:

1. **06-design/deep/screen-specs.md** — Complete screen specifications:
   - Every screen from the initial design-spec.md, plus any missing screens
   - For each screen: purpose, elements (type, label, behavior), states (default, active, error, empty, loading)
   - Input validation rules, error messages, confirmation dialogs
   - Empty states: What does each screen look like with no data?
   - Edge cases: What happens at 1 item? 100 items? Midnight on New Year's?

2. **06-design/deep/interaction-flows.md** — Detailed interaction design:
   - Every tap/swipe/gesture mapped to its outcome
   - Error recovery: What happens when an action fails? (network error, validation error, permission denied)
   - Micro-interactions: Haptic feedback, animations, transitions (describe in words)
   - Task completion times: Estimated seconds per key task (baseline vs target)
   - Offline behavior: What works without internet? What degrades? What breaks?
   - Cross-device: Mobile → tablet → desktop flow continuity

3. **06-design/deep/accessibility-audit.md** — Accessibility specification:
   - Screen reader behavior for every interactive element
   - Color contrast ratios for all text/background combinations
   - Touch target sizes (minimum 44×44pt) and spacing
   - Keyboard navigation order and shortcuts
   - Motion sensitivity: Respecting reduced-motion preferences
   - Text scaling: How UI adapts to larger text sizes
   - WCAG 2.1 level AA compliance checklist

4. **06-design/deep/microcopy-guide.md** — Voice and microcopy:
   - Brand voice: 3-5 adjectives describing the tone, with examples
   - Button labels: Every CTA with rationale ("Why 'Start today' instead of 'Sign up'")
   - Error messages: Tone, structure, recovery action (no "Something went wrong" without guidance)
   - Empty states: Friendly, helpful, not patronizing
   - Notifications: What we push, what we email, what we never say
   - Confirmation flow: "Are you sure?" patterns, undo options, destructive action warnings

Rules:
- Every screen needs every state. Default-only design isn't design.
- Accessibility is not a checklist. It's how real people use your product.
- Microcopy is UX. "Delete" vs "Archive" vs "Remove" changes user behavior.`,
  },

  "ux-design-lead": {
    description: "Deep-dive design review — heuristic evaluation, competitive UX benchmark, user testing plan",
    outputs: [
      "07-design-review/deep/heuristic-evaluation.md",
      "07-design-review/deep/ux-benchmark.md",
      "07-design-review/deep/user-testing-plan.md",
      "07-design-review/deep/design-debt-log.md",
    ],
    prompt: `You are doing a DEEP-DIVE design review. Go beyond blocking issues to a full heuristic evaluation and competitive UX benchmark.

Read existing outputs: 07-design-review/review.md, 06-design/design-spec.md, 01-discovery/problems.md

Your task:

1. **07-design-review/deep/heuristic-evaluation.md** — Nielsen 10 heuristic evaluation:
   - Score the current design against Jakob Nielsen's 10 usability heuristics
   - For each heuristic: rating (1-5), specific violation examples, severity, fix suggestion
   - Top 3 most damaging violations and why they'll cause real user pain
   - What the design does WELL (don't just criticize — identify what to protect)

2. **07-design-review/deep/ux-benchmark.md** — Competitive UX comparison:
   - Benchmark your design against 3-5 competitors on key UX dimensions
   - Task completion comparison: How many taps/clicks for the core task in each competitor?
   - UX quality scoring: Onboarding, core task, error recovery, settings, export
   - Areas where your design LEADS and areas where it LAGS

3. **07-design-review/deep/user-testing-plan.md** — How to validate the design:
   - 5-question usability test script (tasks, success criteria, time expectations)
   - Participant recruiting criteria (who to test with, where to find them)
   - Test format: Moderated remote? Unmoderated? In-person?
   - Success thresholds: What completion rate and satisfaction score indicate "good enough"?
   - Top 3 things to test FIRST (highest risk areas)
   - Analysis method: How to turn observations into design changes

4. **07-design-review/deep/design-debt-log.md** — Track what to fix later:
   - Design decisions made for speed that need revisiting
   - Each entry: what it is, why it was done, when to revisit, what revisiting would require
   - Priority: P0 (ship-blocking), P1 (fix before v1.1), P2 (nice to have), P3 (vision backlog)

Rules:
- Heuristic evaluations without specific examples are useless. Point to the exact screen and element.
- A good UX benchmark reveals WHY competitors made their choices, not just what they chose.
- Testing with 3 users finds 80% of issues. Plan for 5. Don't wait for perfection.`,
  },

  "project-manager": {
    description: "Deep-dive on project planning — sprint-by-sprint breakdown, dependency mapping, resource loading",
    outputs: [
      "08-project-plan/deep/sprint-breakdown.md",
      "08-project-plan/deep/dependency-graph.md",
      "08-project-plan/deep/resource-plan.md",
      "08-project-plan/deep/milestone-gates.md",
    ],
    prompt: `You are doing a DEEP-DIVE on project planning. Move from a 5-week timeline to sprint-by-sprint task breakdowns with resource loading.

Read existing outputs: 08-project-plan/plan.md, 05-assessment/recommendation.md, 06-design/design-spec.md

Your task:

1. **08-project-plan/deep/sprint-breakdown.md** — Detailed sprint plans:
   - For each week in the plan: Break into individual tasks (3-7 per week)
   - Each task: description, estimated hours, dependencies, owner, deliverables
   - Task dependencies visual (text-based graph): which tasks block which
   - Critical path: The sequence of tasks that determines the overall timeline
   - Slack/buffer: Where is there flexibility? Where is there zero room?

2. **08-project-plan/deep/dependency-graph.md** — Full dependency map:
   - External dependencies: APIs, libraries, design assets, legal/contract, third-party approvals
   - Internal dependencies: Team member handoffs, technical milestones
   - "Lead time" hazards: What takes 2 weeks to get but 2 minutes to ask for? (e.g., app store review, SSL cert, legal review)
   - Dependency risk: For each dependency, what's the backup plan if it fails or is delayed?

3. **08-project-plan/deep/resource-plan.md** — Resource allocation:
   - Who does what, when, for how long (hourly/daily breakdown)
   - Skill gaps: What does the team NOT know that they'll need to learn?
   - Risk of single points of failure: What if the only person who knows X is sick?
   - Tooling/infra needs: CI/CD, hosting, monitoring, analytics, error tracking
   - Budget estimate (if applicable): Hosting, SaaS tools, contractor costs per month

4. **08-project-plan/deep/milestone-gates.md** — Gated milestones with exit criteria:
   - For each milestone: exact exit criteria (not "mostly done" but "demoable, testable, shippable")
   - Go/no-go decision points: What data determines whether to proceed or pivot?
   - Quality gates: Code review, test coverage, performance benchmarks, UX sign-off
   - Celebration points: Small wins worth marking to maintain momentum

Rules:
- A task without an hour estimate is a wish, not a plan. Be honest about uncertainty (+/- 50% is fine).
- The critical path is the only thing that matters for timeline. Everything else has buffer.
- Single points of failure are real risks. Mitigate them or accept the consequences.`,
  },

  "gtm-designer": {
    description: "Deep-dive on GTM — channel strategy, messaging matrix, launch playbook, influencer map",
    outputs: [
      "09-gtm/deep/channel-strategy.md",
      "09-gtm/deep/messaging-matrix.md",
      "09-gtm/deep/launch-playbook.md",
      "09-gtm/deep/influencer-map.md",
    ],
    prompt: `You are doing a DEEP-DIVE on GTM strategy. Move beyond channel priority to a full launch playbook with messaging variants for every audience.

Read existing outputs: 09-gtm/launch-plan.md, 01-discovery/problems.md, Idea.md

Your task:

1. **09-gtm/deep/channel-strategy.md** — Channel deep-dive:
   - For each of the top 3 channels: Content strategy, posting cadence, engagement playbook
   - Channel-specific: What works on HN doesn't work on Product Hunt
   - Launch day timeline: Hour-by-hour plan for launch day (what to post, when, where)
   - Secondary channels: 3-5 additional channels with lower expected impact but near-zero marginal effort
   - Community strategy: Where does your target audience already hang out, and how do you add value before asking for attention?

2. **09-gtm/deep/messaging-matrix.md** — Messaging by audience:
   - For each audience segment: Headline, tagline, pain point hook, value prop, proof point, CTA
   - Segments: Indie hackers, PMs, startup CTOs, VC-backed founders, side project builders
   - A/B test pairs: 2-3 message pairs worth testing in the first week
   - Anti-messaging: What to AVOID saying to each audience (jargon they hate, claims they'll see through)

3. **09-gtm/deep/launch-playbook.md** — Step-by-step launch playbook:
   - Pre-launch (D-14 to D-1): Teaser content, influencer outreach, landing page, waitlist, community seeding
   - Launch day (D-Day): Hour-by-hour posting schedule across all channels with exact copy for each post
   - Post-launch (D+1 to D+14): Follow-up content, engagement replies, feedback collection, iteration
   - Crisis mode: What if the launch flops? Emergency pivot plan
   - Measuring success: Exact metrics for each channel (upvotes, stars, signups, comments, shares)

4. **09-gtm/deep/influencer-map.md** — Who can amplify:
   - Tier 1: 3-5 influencers/accounts with direct audience overlap (reach out personally)
   - Tier 2: 10-15 accounts to tag/engage with (no direct ask, build relationship)
   - Tier 3: Communities to post in (Reddit, Discord, Slack groups, newsletters)
   - For each tier 1: why they'd care, what you can offer them, outreach template

Rules:
- Launch day is chaos. An hour-by-hour plan keeps you focused when things get noisy.
- Different audiences need different messages. Using the same hook for HN and PH is leaving traction on the table.
- Influencer outreach without a personalized "why this matters to YOU" is spam.`,
  },

  "feedback-manager": {
    description: "Deep-dive on feedback — metric tree, survey design, analytics schema, learning cadence",
    outputs: [
      "10-feedback/deep/metrics-tree.md",
      "10-feedback/deep/survey-instrument.md",
      "10-feedback/deep/analytics-plan.md",
      "10-feedback/deep/learning-cadence.md",
    ],
    prompt: `You are doing a DEEP-DIVE on feedback setup. Move from collection channels to a full metrics tree with survey instruments and analytics schema.

Read existing outputs: 10-feedback/insights.md, 01-discovery/problems.md, Idea.md, 06-design/design-spec.md

Your task:

1. **10-feedback/deep/metrics-tree.md** — Full metrics framework:
   - North star metric: One number that captures whether you're delivering real value (justify your choice)
   - Input metrics: 3-5 leading indicators that predict the north star
   - Output metrics: 3-5 lagging indicators that confirm progress
   - Counter-metrics: What could look good but actually be bad? (e.g., high time-in-app = confusing UX)
   - Segment breakdown: Metrics by user cohort (power users vs casual, new vs returning, channel source)

2. **10-feedback/deep/survey-instrument.md** — Surveys ready to deploy:
   - Onboarding survey: 3 questions maximum, placed at the right moment
   - Weekly pulse survey: 1 question, every Friday, automated
   - Churn survey: Show at cancellation with conditional follow-ups
   - NPS survey: Standardized at day 14 with open-ended follow up
   - Customer development interview guide: 10 open-ended questions for 30-min user interviews
   - For each: exact question text, response options, trigger, channel, expected completion rate

3. **10-feedback/deep/analytics-plan.md** — Events and analytics:
   - Key events to track: Every meaningful user action with properties
   - Event taxonomy: Standardized naming convention (object_action_context)
   - Dashboard layout: 3 dashboards (executive, product, engineering) with specific charts
   - Funnel analysis: Key conversion funnels with expected vs concerning drop-off rates
   - Cohort analysis: How retention changes by acquisition channel and signup month
   - Tool recommendation: What analytics stack to use (and why not the alternatives)

4. **10-feedback/deep/learning-cadence.md** — How you'll learn over time:
   - Weekly: Metrics review (30 min), user interview (1 hour), support ticket review (15 min)
   - Monthly: Full metrics deep-dive, survey results review, cohort analysis
   - Quarterly: Strategic review, competitive re-assessment, north star check-in
   - Learning loop: How insights become experiments, experiments become features, features get measured again
   - "Close the loop": How to tell users "you asked for this, here it is"

Rules:
- A north star without supporting metrics is a wish. Build the tree.
- Surveys need a trigger context. A popup on page 1 gets different answers than one after key action.
- Events without a dashboard are noise. Define the view before you define the event.`,
  },

  "communications-specialist": {
    description: "Deep-dive on communications — asset templates, channel-specific copy, engagement playbook, metrics",
    outputs: [
      "11-communications/deep/asset-templates.md",
      "11-communications/deep/channel-copy.md",
      "11-communications/deep/engagement-playbook.md",
      "11-communications/deep/comms-metrics.md",
    ],
    prompt: `You are doing a DEEP-DIVE on communications. Move from a launch-week calendar to full asset templates and channel-specific copy.

Read existing outputs: 11-communications/calendar.md, 09-gtm/launch-plan.md, Idea.md, 01-discovery/problems.md

Your task:

1. **11-communications/deep/asset-templates.md** — Templates ready to fill:
   - Product Hunt listing template: Title, tagline, description sections, GIF caption, first comment
   - HN Show HN template: Title, body, top comment (you answer your own post)
   - Launch tweet thread template: 5-8 tweets, each with hook, body, CTA
   - Reddit post templates: r/ClaudeAI, r/SideProject, r/SaaS — each with unique angle
   - Newsletter announcement: Subject line, preview text, body, PS
   - For each: [bracketed placeholders] for the parts they need to customize

2. **11-communications/deep/channel-copy.md** — Full copy for each channel:
   - Product Hunt: Full description, first comment, maker comment, tags
   - HN: Show HN title (different from PH), body, first responder comment
   - Twitter: 10-tweet thread, plus 5 standalone posts, plus reply templates
   - Reddit: Full post body for each target subreddit
   - Blog/dev.to: Full draft of the "How I built this" post
   - LinkedIn (optional): Professional version, shorter, more business-forward

3. **11-communications/deep/engagement-playbook.md** — How to respond:
   - Positive comment reply: Template and examples
   - Constructive criticism reply: Template and examples
   - Negative/ dismissive reply: Template and examples
   - "Can you build X?" reply: Template and examples
   - Question reply: How to answer thoroughly without sounding defensive
   - Timing guidelines: Reply within 1 hour on launch day, within 24 hours otherwise
   - Escalation: What to do if a thread goes viral (positive) or toxic (negative)

4. **11-communications/deep/comms-metrics.md** — How to measure comms impact:
   - Per-channel metrics: Impressions, engagement rate, sentiment, conversion to repo star/signup
   - Target ranges: What's good, great, and disappointing for each channel
   - Tracking setup: UTM parameters, referrer tracking, star-to-signup funnel
   - Iteration loop: Review metrics → identify what's working → double down → repeat weekly

Rules:
- Templates save time. Fill them in BEFORE launch day, not during.
- Every comment is a chance to build or burn goodwill. Reply like a human, not a brand.
- A launch is not a one-day event. The most valuable engagement happens in the 48 hours after.`,
  },
};

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "pm-pipeline-mcp",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_product_brief",
      description:
        "Create a complete product brief for any idea. Runs an 11-agent pipeline: problem discovery → opportunity validation → solution generation → design → project plan → GTM launch plan. Output is a set of markdown files in the current directory.",
      inputSchema: {
        type: "object",
        properties: {
          idea: {
            type: "string",
            description:
              "Describe your product idea. Include target users, core problem, and key differentiators.",
          },
          projectName: {
            type: "string",
            description:
              "Project directory name (defaults to sanitized idea slug)",
          },
          mode: {
            type: "string",
            enum: ["pilot", "mvp", "platform"],
            description:
              "pilot = fastest validation, mvp = balanced, platform = full build",
            default: "mvp",
          },
        },
        required: ["idea"],
      },
    },
    {
      name: "delve_stage",
      description:
        "Deep-dive into a specific pipeline stage. After an initial pipeline run, use this to produce 2-3x more detailed analysis on any single stage. Creates a 'deep/' subfolder inside the stage directory with validated problems, competitive teardowns, full competitive analysis, quantified risks, screen-by-screen specs, sprint breakdowns, or channel-specific copy — depending on the stage.",
      inputSchema: {
        type: "object",
        properties: {
          projectDir: {
            type: "string",
            description:
              "Path to the existing pipeline project directory (must have stages like 01-discovery/, 02-validation/, etc.)",
          },
          stage: {
            type: "string",
            description:
              "Stage to deep-dive. Use agent id (e.g. 'problem-discoverer', 'opportunity-validator') or stage number (1-11).",
          },
          focus: {
            type: "string",
            description:
              "Optional specific area within the stage to explore deeper. If omitted, the agent produces all deep-dive outputs for that stage.",
          },
          approach: {
            type: "string",
            enum: ["depth", "breadth"],
            description:
              "depth = go deeper on what exists (e.g., full teardown of top competitor), breadth = explore adjacent areas (e.g., add 3 more competitors to the analysis)",
            default: "depth",
          },
        },
        required: ["projectDir", "stage"],
      },
    },
  ],
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeProjectName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getAgentByInput(stage) {
  // By agent id
  const byId = AGENTS.find((a) => a.id === stage);
  if (byId) return byId;

  // By number
  const num = parseInt(stage, 10);
  if (!isNaN(num) && num >= 1 && num <= AGENTS.length) {
    return AGENTS[num - 1];
  }

  return null;
}

function fmtDate() {
  return new Date().toISOString().split("T")[0];
}

// ─── Tool Handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments;

  if (toolName === "generate_product_brief") {
    return handleGenerateBrief(args);
  }

  if (toolName === "delve_stage") {
    return handleDelveStage(args);
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
    isError: true,
  };
});

// ─── Tool: generate_product_brief ─────────────────────────────────────────────

async function handleGenerateBrief(args) {
  const { idea, projectName, mode } = args;

  const projectDir = path.resolve(
    process.cwd(),
    projectName || sanitizeProjectName(idea)
  );

  if (fs.existsSync(projectDir)) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Directory "${projectDir}" already exists. Choose a different project name or location.`,
        },
      ],
      isError: true,
    };
  }

  fs.mkdirSync(projectDir, { recursive: true });

  // Write Idea.md
  const ideaDoc = `# Idea: ${projectName || "Untitled"}

${idea}

**Mode**: ${mode || "mvp"}

Generated by PM Agent Pipeline MCP — ${fmtDate()}
`;

  fs.writeFileSync(path.join(projectDir, "Idea.md"), ideaDoc);

  // Create agent output directories
  for (const agent of AGENTS) {
    fs.mkdirSync(path.join(projectDir, agent.dir), { recursive: true });
  }

  // Write gates.md
  const gates = AGENTS.map((a, i) => {
    const status = i === 0 ? "pending" : "awaiting-previous";
    return `## Gate ${i + 1}: ${a.name}
- **status**: ${status}
- **agent**: ${a.id}
- **artifacts**: ${a.dir}/
- **summary**: Awaiting ${a.id}`;
  }).join("\n\n");

  fs.writeFileSync(
    path.join(projectDir, "gates.md"),
    `# Gates — Decision Log\n\n${gates}\n`
  );

  // Write pipeline.md
  fs.writeFileSync(
    path.join(projectDir, "pipeline.md"),
    `# Pipeline State\n\n## Project\n- **Name**: ${projectName || "Untitled"}\n- **Mode**: ${mode || "mvp"}\n- **Created**: ${fmtDate()}\n\n## Next Step\nRun the first agent: **problem-discoverer** — analyze feedback and write problem statements.\nSee gates.md for the full pipeline status.\n`
  );

  // Build agent instruction block
  const agentInstructions = AGENTS.map(
    (a, i) => `### Agent ${i + 1}: ${a.name} (${a.id})

When it's your turn:

1. Read: ${a.inputs.join(", ")}
2. Generate: ${a.outputs.join(", ")}
3. Write output to \`${a.dir}/\`
4. Update \`gates.md\` — set your gate to \`pending-review\`

Your prompt:
${a.prompt}
`
  ).join("\n---\n\n");

  // Build deep-dive hint
  const deepDiveHint = AGENTS.map(
    (a, i) => `- \`${a.id}\` (Stage ${i + 1}): ${DEEP_PROMPTS[a.id]?.description || "Standard depth available"}`
  ).join("\n");

  return {
    content: [
      {
        type: "text",
        text: `✅ Project scaffold created at **${projectDir}**

## How to Run

The pipeline has 11 agents that run sequentially. Each agent writes output and updates \`gates.md\`. The human reviews and approves each gate before the next agent proceeds.

### Current State

Gate 1 (Problem Discovery) is ready to run. All files are in \`${projectDir}/\`.

### Agent Instructions

${agentInstructions}

---

### 🌊 Deep-Dive Mode Available

After the initial pipeline run, you can dive deeper into any stage:

\`delve_stage(projectDir="${projectDir}", stage="<agent-id>")\`

Available deep-dives:
${deepDiveHint}

Each produces 4 files of 2-3x depth per stage.

### Directory Structure

\`\`\`
${projectDir}/
├── Idea.md           ← Your idea (written)
├── gates.md          ← Pipeline control plane (update after each agent)
├── pipeline.md       ← Status overview
${AGENTS.map((a) => `├── ${a.dir}/          ← Agent ${a.id} output`).join("\n")}
\`\`\`
`,
      },
    ],
  };
}

// ─── Tool: delve_stage ────────────────────────────────────────────────────────

async function handleDelveStage(args) {
  const { projectDir: rawDir, stage, focus, approach } = args;
  const projectDir = path.resolve(rawDir);

  // Validate project exists
  if (!fs.existsSync(projectDir)) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Directory "${projectDir}" does not exist. Run \`generate_product_brief\` first to create a project.`,
        },
      ],
      isError: true,
    };
  }

  // Find the agent
  const agent = getAgentByInput(stage);
  if (!agent) {
    const valid = AGENTS.map((a) => `  "${a.id}" (Stage ${AGENTS.indexOf(a) + 1})`).join("\n");
    return {
      content: [
        {
          type: "text",
          text: `❌ Unknown stage: "${stage}". Valid options:\n${valid}`,
        },
      ],
      isError: true,
    };
  }

  // Check if deep prompts exist
  const deep = DEEP_PROMPTS[agent.id];
  if (!deep) {
    return {
      content: [
        {
          type: "text",
          text: `❌ No deep-dive prompts defined for "${agent.id}" yet.`,
        },
      ],
      isError: true,
    };
  }

  // Check initial pass output exists
  const initialOutputs = agent.outputs
    .map((o) => path.join(projectDir, o))
    .filter((p) => fs.existsSync(p));

  // Create deep directory
  const deepDir = path.join(projectDir, agent.dir, "deep");
  fs.mkdirSync(deepDir, { recursive: true });

  // Write a manifest for the deep-dive
  const manifestPath = path.join(deepDir, "MANIFEST.md");
  const manifest = `# Deep-Dive: ${agent.name}

**Approach**: ${approach || "depth"}
**Focus**: ${focus || "All areas"}
**Date**: ${fmtDate()}

This deep-dive was triggered by \`delve_stage\` after the initial pipeline pass.
Use these outputs alongside the initial \`${agent.dir}/\` files.

## Expected Outputs

${deep.outputs.map((o) => `- \`${path.basename(o)}\``).join("\n")}

## Instructions for the LLM

Read the initial outputs from \`${agent.dir}/\`, then execute the deep-dive.
Output files go to \`${agent.dir}/deep/\`.
`;

  fs.writeFileSync(manifestPath, manifest);

  // Build the output list
  const outputList = deep.outputs.map((o) => `  - \`${o}\``).join("\n");

  // Check existing initial outputs
  const initialStatus = initialOutputs.length > 0
    ? `Found ${initialOutputs.length} existing output(s) in \`${agent.dir}/\`. Deep-dive will build on these.`
    : `⚠️ No initial outputs found in \`${agent.dir}/\`. Deep-dive will generate standalone content.`;

  // Build stage-specific section
  const stageMap = {};
  AGENTS.forEach((a, i) => { stageMap[a.id] = `Stage ${i + 1}: ${a.name}`; });

  let focusSection = "";
  if (focus) {
    focusSection = `

### Focus Area

Concentrate on: **${focus}**. The deep-dive should prioritize depth in this area over breadth across all outputs.`;
  }

  const approachLabel = approach === "breadth"
    ? "broaden the analysis to cover adjacent areas the initial pass missed"
    : "go deeper on what was already produced, adding specificity, quantification, and actionable detail";

  return {
    content: [
      {
        type: "text",
        text: `## 🌊 Deep-Dive: ${agent.name}

**Stage**: ${stageMap[agent.id]}
**Project**: ${projectDir}
**Approach**: ${approach || "depth"} (${approachLabel})
${focusSection ? `**Focus**: ${focus}` : ""}

### Status

${initialStatus}

Deep-dive directory created: \`${deepDir}/\`

### Outputs to Generate

${outputList}

### LLM Prompt

\`\`\`
${deep.prompt}
\`\`\`

### How to Run

Execute the deep-dive by asking the LLM to:

1. Read the initial outputs in \`${projectDir}/${agent.dir}/\`
2. Read the deep-dive manifest at \`${manifestPath}\`
3. Execute the prompt above
4. Write all outputs to \`${projectDir}/${agent.dir}/deep/\`
5. Optionally update \`gates.md\` to reflect the new depth

---

**Pro tip:** After the deep-dive, you can run \`delve_stage\` on another stage, or ask the LLM to cross-reference insights across stages (e.g., "take the competitive teardown from the market sizing deep-dive and incorporate it into the GTM plan").`,
      },
    ],
  };
}

// ─── Transport ────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
