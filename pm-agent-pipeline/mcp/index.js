#!/usr/bin/env node
/**
 * PM Agent Pipeline — MCP Server
 *
 * One tool: generate_product_brief
 * Creates the project scaffold and returns agent instructions for Claude
 * to execute the full 11-stage pipeline.
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

// ─── Agent Prompts (embedded — single source alongside SKILL.md files) ───────

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

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "pm-pipeline-mcp",
    version: "0.1.0",
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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { idea, projectName, mode } = request.params.arguments;

  // Create project scaffold
  const projectDir = path.resolve(
    process.cwd(),
    projectName || idea.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
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

Generated by PM Agent Pipeline MCP — ${new Date().toISOString().split("T")[0]}
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
    `# Pipeline State\n\n## Project\n- **Name**: ${projectName || "Untitled"}\n- **Mode**: ${mode || "mvp"}\n- **Created**: ${new Date().toISOString().split("T")[0]}\n\n## Next Step\nRun the first agent: **problem-discoverer** — analyze feedback and write problem statements.\nSee gates.md for the full pipeline status.\n`
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

### Getting Started

1. **Run agent 1** (problem-discoverer): Read source materials, analyze the idea, write problem statements to \`01-discovery/problems.md\`
2. **Update gates.md** with your findings and set status to \`pending-review\`
3. Wait for human approval before proceeding to agent 2

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
});

// ─── Transport ────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
