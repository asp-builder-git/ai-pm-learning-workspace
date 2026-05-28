# PM Agent Pipeline

Multi-agent pipeline for product evaluation. Each agent inspects an idea from one angle and passes findings to the next stage.

## Structure

| Directory | Contents |
|-----------|----------|
| `agents/` | Individual agent briefs (definitions, personas, evaluation criteria) |
| `agent-evaluations/` | Stored outputs from completed pipeline runs |
| `templates/` | Pipeline stage definitions and go/no-go gate criteria |

## Pipeline Stages

| Agent | Role |
|-------|------|
| Problem Discoverer | What's the actual problem? |
| Current State Expert | What exists today? |
| Opportunity Validator | Is it worth solving? |
| Solution Generator | What are the options? |
| Solution Assessor | Which option wins? |
| UX Design Lead | How does it feel? |
| Communications Specialist | How do we pitch it? |
| GTM Designer | How do we launch it? |
| Feedback Manager | What did we learn? |

## How It Works

1. Drop an idea into the pipeline
2. Each agent inspects from its angle
3. Output: a formatted brief with verdict, risks, and next steps
