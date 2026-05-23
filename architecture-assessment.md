# PM Agent Pipeline — Architecture Assessment

> Date: 2026-05-15
> Status: Approved for Phase 0 build
> Sample project: [CORE-Estimator-Pilot](/Users/chiragg/Documents/kiro-projects/2026-projects/CORE-Estimator-Pilot)

## The Core Problem

Compress the product development cycle by replacing back-and-forth conversations with agents that produce structured artifacts, hand them off, and only pull the human in at decision gates.

Pattern observed in CORE-Estimator-Pilot: problem identification → opportunity sizing → design → build → launch → feedback loop.

## Recommended Architecture: File-Artifact Pipeline

### Why files, not APIs or a custom framework

- Every tool in the stack (Claude Code, Kiro, MeshClaw) can read and write files
- Artifacts are inspectable, version-controlled, and debuggable
- No infrastructure to build or maintain — can start immediately
- Handoff = "the file exists at this path with this schema"

## Three Layers

### Layer 1 — Artifact Schema (the contract between agents)

Each project gets a standardized directory structure. Agents read from upstream folders and write to their own.

```
project/
├── 01-discovery/          # Problem Discoverer output
│   ├── problems.md        # Ranked problem statements
│   └── evidence/          # Source docs, screenshots, data
├── 02-validation/         # Opportunity Validator output
│   ├── sizing.md          # Opportunity analysis + confidence score
│   └── assumptions.md     # Key assumptions + validation status
├── 03-current-state/      # Current State Expert output
│   ├── landscape.md       # Architecture, ecosystem, what others build
│   └── constraints.md     # Technical/org constraints
├── 04-solutions/          # Solution Generator output
│   ├── options.md         # 2-3 solution options with tradeoffs
│   └── prototypes/        # Quick mockups or code sketches
├── 05-assessment/         # Solution Assessor output
│   ├── recommendation.md  # Scored assessment, recommended option
│   └── risks.md           # Risk register
├── 06-design/             # UX Designer output
│   ├── design-spec.md     # Design specification
│   ├── wireframes/        # Visual artifacts
│   └── components.md      # Component inventory
├── 07-design-review/      # UX Design Lead output
│   ├── review.md          # Design critique + sign-off
│   └── revisions.md       # Required changes
├── 08-project-plan/       # Project Manager output
│   ├── plan.md            # Timeline, milestones, dependencies
│   └── stakeholder-map.md # Who needs what, when
├── 09-gtm/                # Go-to-Market output
│   ├── launch-plan.md     # Channel strategy, UAT plan
│   └── feedback-setup.md  # Collection mechanisms
├── 10-feedback/           # Feedback Manager output
│   ├── insights.md        # Synthesized feedback themes
│   └── backlog-updates.md # New items for discovery
├── 11-communications/     # Comms Specialist output
│   ├── copy/              # Channel-specific copy
│   └── calendar.md        # Communication timeline
├── gates.md               # Human decision points + status
└── pipeline.md            # Current state, what's done, what's next
```

### Layer 2 — Agent Definitions (the personas)

Each agent is a Claude Code agent definition (markdown with frontmatter). Each defines:

| Field | Purpose |
|---|---|
| Persona | System prompt with expertise, tone, judgment style |
| Input contract | Which upstream artifacts it reads |
| Output contract | What it produces and where |
| Gate behavior | When to stop and ask the human vs. proceed |
| Tool permissions | Which MCP tools, file paths, and commands it can use |

### Layer 3 — Orchestration

**Mode 1 — Manual pipeline (start here):** A Claude Code skill (`/pm-pipeline`) reads `pipeline.md` to determine current state, invokes the next agent, updates state.

**Mode 2 — Autonomous pipeline (grow into):** MeshClaw monitors trigger channels (feedback Slack channels, Quip docs, SIM tickets) and spawns the right agent on new signal.

## Why This Over Alternatives

| Alternative | Why not (yet) |
|---|---|
| Custom orchestration framework (LangGraph, CrewAI) | Extra infrastructure, new stack to learn, fragile — time on plumbing instead of product work |
| Single mega-agent with all personas | Context window fills fast, loses sharp judgment from focused personas, can't run in parallel |
| MeshClaw-only | Good for autonomy layer, too heavy for interactive design/assessment loop |
| API-based handoff | Over-engineered for single-user pipeline — files are simpler, inspectable, free |

## Phased Rollout

| Phase | Timeline | Agents | Goal |
|---|---|---|---|
| 0 — Foundation | Day 1 | Solution Generator (#4), Solution Assessor (#5) | Validate handoff pattern, test on CORE-Estimator-Pilot |
| 1 — Discovery Loop | Week 1 | Problem Discoverer (#1), Feedback Manager (#10) | Close the feedback loop via channels |
| 2 — Design Pipeline | Week 2 | UX Designer (#6), UX Design Lead (#7) | End-to-end design with review gate |
| 3 — Execution & GTM | Week 3-4 | Project Manager (#8), GTM (#9), Comms (#11), Current State (#3), Opportunity Validator (#2) | Full pipeline + MeshClaw autonomy |

## Critical Design Decisions

1. **`gates.md` is the control plane.** Every agent checks it before proceeding. Human marks gates as `approved`, `blocked`, or `needs-input`.

2. **Agents critique, not just produce.** The Solution Assessor rejects. The UX Design Lead sends work back. Rejection is built into the artifact schema (`revisions/` subfolder, `status: revision-needed` field).

3. **Start with Claude Code agents, migrate to MeshClaw workers for autonomy.** Agent definition format is nearly identical. When an agent's judgment is trusted, promote it to a MeshClaw worker.

4. **One artifact schema template, reused per project.** Copy the folder structure into each new project. The `/pm-pipeline` skill reads whatever project directory it's in.

## Usage Pattern

### Manual mode
```
/pm-pipeline init "Reduce VM onboarding time for CORE tools"
→ Creates structure, populates gates.md
→ Runs Problem Discoverer → writes 01-discovery/problems.md
→ Stops at Gate 1: "Review problem statements before sizing"

[Human reviews, approves in gates.md]
/pm-pipeline next
→ Runs Opportunity Validator → writes 02-validation/sizing.md
→ Flags unvalidated assumption, asks in gates.md
```

### Autonomous mode (MeshClaw)
```
[Detects new feedback in Slack #core-estimator-feedback]
→ Spawns Feedback Manager → writes 10-feedback/insights.md
→ Spawns Problem Discoverer → updates 01-discovery/problems.md
→ Pings Slack: "2 new insights. 1 new problem. Review when ready."
```
