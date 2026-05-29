# PM Agent Pipeline

**From idea to product plan in one command.**
*11 AI agents produce your spec, strategy, and launch plan — so you can skip the busywork and build.*

<p align="left">
  <a href="https://github.com/asp-builder-git/ai-pm-learning-workspace/stargazers"><img src="https://img.shields.io/github/stars/asp-builder-git/ai-pm-learning-workspace?style=flat-square" alt="GitHub Stars"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"></a>
  <a href="#"><img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version"></a>
  <a href="#"><img src="https://img.shields.io/badge/Claude%20Code-ready-brightgreen?style=flat-square" alt="Claude Code"></a>
  <a href="#mcp-install"><img src="https://img.shields.io/badge/MCP-ready-blue?style=flat-square" alt="MCP"></a>
  <a href="#skills-install"><img src="https://img.shields.io/badge/Skills-ready-orange?style=flat-square" alt="Skills"></a>
</p>

Every product starts as a hunch. The PM Agent Pipeline turns that hunch into a structured product brief — problem statements, opportunity sizing, solution options, risk register, and a launch plan — in one automated run.

No meetings. No templates to fill. No product manager on retainer.

## 🎬 See It In Action

Run the demo to see what the pipeline produces — no AI calls, no setup:

```bash
node scripts/demo.js
# Creates ./__demo__/ — 20+ files, 11 stages, pre-built for you
```

Browse the output:

```bash
cd __demo__
cat gates.md          # check which gates are approved/pending
cat 09-gtm/launch-plan.md  # see a sample output
cat 01-discovery/problems.md  # see ranked problem statements
```

The demo uses **"Build a habit tracking app"** as the sample idea — something every PM
and indie hacker has thought about. You'll see real-looking outputs for all 11 stages:
from problem discovery through to a launch plan and communications calendar.

![Demo in action](https://img.shields.io/badge/demo-ready-brightgreen)

## 🚀 Install

### Option 1: MCP Server (Claude Desktop, Claude Code, Cursor) {#mcp-install}

Run the pipeline directly from your chat — no terminal work:

**Using npx** (recommended — no clone needed):

```json
{
  "mcpServers": {
    "pm-pipeline": {
      "command": "npx",
      "args": ["-y", "pm-pipeline-mcp"]
    }
  }
}
```

**Using local path** (no npm needed):

```json
{
  "mcpServers": {
    "pm-pipeline": {
      "command": "node",
      "args": ["/path/to/pm-agent-pipeline/mcp/index.js"]
    }
  }
}
```

Then in Claude:
> "Plan my product" → *Claude calls your PM Agent Pipeline tool*

### Option 2: Skills (Claude Code, Cursor, OpenClaw) {#skills-install}

Each pipeline stage is a standalone skill — install just what you need:

```bash
# Clone the repo
mkdir -p .claude/skills
cp -r pm-agent-pipeline/skills/* .claude/skills/
```

Skills auto-load when Claude detects relevant tasks. Lightweight (~50 tokens each),
zero infrastructure.

### Option 3: Quick Demo

```bash
node scripts/demo.js
# See a complete 11-stage product brief in 6 seconds
```

## Quick Start

```bash
# Drop your idea into Idea.md, then run:
pm-pipeline init "Reduce user onboarding time for new signups"

# Run agents in sequence:
pm-pipeline next    # runs the next agent
pm-pipeline next    # keeps going until hitting a gate

# Review and approve:
pm-pipeline approve 1    # marks Gate 1 as approved
pm-pipeline next         # next agent proceeds
```

*(CLI in development — currently the pipeline runs manually via agent prompts. See [How to Run](docs/usage.md) for current instructions.)*

## Pipeline Stages

| # | Agent | Question it answers |
|---|-------|---------------------|
| 01 | Problem Discoverer | What's the actual problem? |
| 02 | Opportunity Validator | Is it worth solving? |
| 03 | Current State Expert | What exists today? |
| 04 | Solution Generator | What are the options? |
| 05 | Solution Assessor | Which option wins? |
| 06 | UX Designer | How does it feel? |
| 07 | UX Design Lead | Is it good enough? |
| 08 | Project Manager | How do we build it? |
| 09 | GTM Designer | How do we launch it? |
| 10 | Feedback Manager | What did we learn? |
| 11 | Communications Specialist | How do we pitch it? |

## How It Works

**The pipeline runs on a gate system.** Each agent produces artifacts, then stops. You review. If it passes the gate, the next agent picks up where the last one left off.

```
Idea → [Agent 1] → artifacts → [Gate 1: You review]
                                    ↓ approved
                              [Agent 2] → artifacts → [Gate 2: You review]
                                                          ↓ approved
                                                    ...continues
```

**Key behaviors:**

- **Gates are human checkpoints** — agents never proceed without your approval
- **Agents read upstream** — each agent sees the outputs of previous stages
- **Critique loops** — the Solution Assessor rejects weak options, the Design Lead sends work back for revisions
- **One agent per concern** — focused personas produce sharper output than a single mega-agent

## Project Modes

| Mode | When | Horizon | Quality bar |
|------|------|---------|-------------|
| `pilot` | Testing an idea | Days | Speed over polish |
| `mvp` | Shipping to real users | 2-6 weeks | Balanced |
| `platform` | Long-lived investment | Months | High bar |

Agents calibrate their judgment to the mode — a pilot's assessment won't demand production-grade architecture.

## Project Structure

```
your-project/
├── agents/                  ← Agent definitions (personas + evaluation criteria)
├── templates/               ← Pipeline stage templates and gate criteria
├── agent-evaluations/       ← Completed pipeline run outputs
└── README.md                ← This file
```

## Design Philosophy

- **File-based handoff** — every AI tool reads/writes files. No infrastructure needed.
- **Gated autonomy** — agents act, you decide. No handoffs without human review.
- **Mode-aware** — same pipeline, different rigor. Pilot vs platform get different treatment.
- **Harness-agnostic** — works in Claude Code, Kiro, Cursor, OpenClaw, any AI that reads files.
