# AI PM Learning Workspace — A Public Notebook

This repo is my public notebook as I explore what it means to be an AI‑builder PM.  
I’m not trying to publish a polished framework or a finished tool.  
I’m documenting the messy middle — the experiments, the failures, the unexpected insights, and the things I’m still figuring out.

My first focus is an 11‑agent PM pipeline: a chain of specialized agents that each produce a structured artifact, hand off to the next, and pause at gates for review.  
It’s part workflow experiment, part systems‑thinking exercise, and part exploration of how AI can support real product work.

Nothing here is final.  
Everything is a work in progress.  
This repo will evolve as I learn, break things, and refine my thinking.

If you’re curious about how PM craft, AI agents, and builder‑style iteration intersect — welcome.



-----


# PM Agent Pipeline

A file-artifact pipeline where 11 specialized PM agents produce structured outputs, hand off to each other, and pause at gates for your review.

## Quick Start

```
/pm-pipeline init "Reduce VM onboarding time for CORE tools"
```

This creates the folder structure, `pipeline.md`, and `gates.md` in your current directory. Then:

```
/pm-pipeline next
```

Runs the next agent in sequence. Repeat until you hit a gate that needs your review.

## Commands

| Command                                                     | What it does                               |
| ----------------------------------------------------------- | ------------------------------------------ |
| `/pm-pipeline init "Problem" [--mode pilot\|mvp\|platform]` | Create pipeline structure in current dir   |
| `/pm-pipeline next [--path /path]`                          | Run the next agent based on pipeline state |
| `/pm-pipeline status [--path /path]`                        | Show current state and blockers            |
| `/pm-pipeline run <agent-name> [--path /path]`              | Run a specific agent (skips gate check)    |
| `/pm-pipeline approve <gate-number> [--path /path]`         | Mark a gate as approved                    |

## How It Works

1. **You run an agent** (via `next` or `run`)
2. **Agent reads upstream artifacts** (previous agents' outputs)
3. **Agent writes its outputs** to its numbered folder
4. **Agent updates `gates.md`** with a summary and any questions
5. **Pipeline stops** — you review the artifacts
6. **You approve the gate** — next agent can proceed

`gates.md` is the control plane. Agents check it before proceeding. You mark gates as `approved`, `blocked`, `needs-input`, or `revision-needed`.

## Pipeline Stages

| Stage | Agent | What it produces |
|---|---|---|
| 01 Discovery | `problem-discoverer` | Ranked problem statements + evidence |
| 02 Validation | `opportunity-validator` | Opportunity sizing + confidence scores + assumptions |
| 03 Current State | `current-state-expert` | Landscape map + constraints |
| 04 Solutions | `solution-generator` | 2-3 solution options + prototype sketch |
| 05 Assessment | `solution-assessor` | Scored recommendation + risk register |
| 06 Design | `ux-designer` | Design spec + components + wireframes |
| 07 Design Review | `ux-design-lead` | Design critique + required revisions |
| 08 Project Plan | `project-manager` | Work breakdown + stakeholder map |
| 09 GTM | `gtm-designer` | Launch plan + feedback setup |
| 10 Feedback | `feedback-manager` | Synthesized insights + backlog updates |
| 11 Communications | `communications-specialist` | Channel copy + comms calendar |

## Folder Structure (per project)

```
your-project/
├── 01-discovery/
│   ├── problems.md
│   └── evidence/
├── 02-validation/
│   ├── sizing.md
│   └── assumptions.md
├── 03-current-state/
│   ├── landscape.md
│   └── constraints.md
├── 04-solutions/
│   ├── options.md
│   └── prototypes/
├── 05-assessment/
│   ├── recommendation.md
│   └── risks.md
├── 06-design/
│   ├── design-spec.md
│   ├── components.md
│   └── wireframes/
├── 07-design-review/
│   ├── review.md
│   └── revisions.md
├── 08-project-plan/
│   ├── plan.md
│   └── stakeholder-map.md
├── 09-gtm/
│   ├── launch-plan.md
│   └── feedback-setup.md
├── 10-feedback/
│   ├── insights.md
│   └── backlog-updates.md
├── 11-communications/
│   ├── copy/
│   └── calendar.md
├── gates.md          ← control plane
└── pipeline.md       ← current state
```

## Using with Existing Projects

The pipeline has an adapter mode. If you point it at a project that wasn't initialized with `init`, it maps existing docs to pipeline inputs:

```
/pm-pipeline run solution-generator --path /path/to/existing-project
```

The skill looks for existing files (READMEs, design docs, backlogs) and maps them as inputs. Outputs still go to the numbered folders.

## Typical Workflow

```
/pm-pipeline init "Problem statement" --mode pilot
  → Creates structure
  → Runs Problem Discoverer → writes 01-discovery/problems.md
  → Stops at Gate 1

[You review problems.md]
/pm-pipeline approve 1
/pm-pipeline next
  → Runs Opportunity Validator → writes 02-validation/
  → Stops at Gate 2

[You review sizing and assumptions]
/pm-pipeline approve 2
/pm-pipeline next
  → ...continues through the pipeline
```

## Project Modes

| Mode | Use when | Planning horizon | Quality bar |
|---|---|---|---|
| `pilot` | Testing an idea, 1-2 weeks | Days | Speed over polish |
| `mvp` | Shipping to real users, 2-6 weeks | Weeks | Balance speed and sustainability |
| `platform` | Long-lived investment, months | Sprints | High bar on all criteria |

Agents calibrate their judgment to the mode — a pilot's Solution Assessor won't demand production-grade architecture.

## Key Design Decisions

- **File-based handoff**: Every tool (Claude Code, Kiro, MeshClaw) can read/write files. No infrastructure needed.
- **Gates are human checkpoints**: Agents never proceed past a gate without your approval.
- **Agents critique, not just produce**: The Assessor rejects bad solutions. The Design Lead sends work back.
- **One agent per concern**: Focused personas produce sharper output than a single mega-agent.
