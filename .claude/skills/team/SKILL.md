---
name: team
description: Run a task through the project team (producer, tech-lead, designer, developers, QA, reviewer) instead of doing it alone. Use for any feature, weapon batch, UI rework or roadmap step: plan, decide, build, test, independently verify, then report to the owner.
---

# /team <goal>

You are the **orchestrator**; the owner talks only to you. Subagents cannot spawn subagents, so you
launch every role yourself with the Agent tool (`subagent_type`: `producer`, `tech-lead`, `designer`,
`developer`, `qa`, `reviewer`). Give each agent a self-contained prompt (they start cold): the goal,
the relevant files/docs, acceptance criteria, and what to return.

## Flow

1. **Plan** (`producer`): audit docs/ROADMAP.md vs the repo for this goal, produce 3–8 tasks with owners
   and checkable acceptance criteria. If the plan needs a decision only the owner can make (art source,
   unknown original numbers), stop and ask the owner before building.
2. **Decide** (`tech-lead`, and `designer` for anything visible) in parallel. Resolve conflicts yourself
   and write the final spec. Skip a role only if it truly has nothing to say.
3. **Build** (`developer` agents). Independent tasks in parallel, each with `isolation: "worktree"`
   when they touch overlapping files; merge the results yourself and run `npm run check`.
4. **Verify** (`qa` and `reviewer` in parallel, both told NOT to trust the developer's summary).
   `designer` reviews screenshots of anything visual. Send real defects back to a developer and
   re-verify; at most 3 loops, then report what is still broken.
5. **Close** (`producer`): update docs/ROADMAP.md truthfully (done / simplified / unverified),
   record decisions, propose the next 3 steps ranked by player value.
6. **Report to the owner** in Russian: what is done and verified, what is simplified or unverified,
   what needs their decision (first), risks, recommended next step. Commit locally in small
   Conventional Commits; never push.

## Rules

- Never present an agent's claim as verified unless a command output or screenshot shows it.
- Original-game numbers need a cited source (docs/lore); otherwise mark them as guesses in code, docs
  and the report.
- Be specific and critical; reject generic or template solutions. Consistency with the existing HUD
  style and the project principles in docs/ROADMAP.md beats novelty.
- Keep the owner's time cheap: one report, decisions at the top, no play-by-play.

## Cost discipline (owner asked to save tokens)

- Default to ONE developer per milestone chunk; spawn QA/reviewer only at milestone ends, not per commit.
- Use `model: "sonnet"` for developer/qa/designer/producer and only use opus for a rare architecture decision.
- Prefer scripted checks (`npm run check`, `node tools/e2e-scale.mjs`, determinism) over exploratory browser QA;
  run exploratory QA only for new player-facing flows, with a narrow checklist.
- Never run several agents on the same files; do not re-run audits that exist in /tmp or docs/plans.
- Tell agents to keep reports short (under 40 lines) and to skip screenshots unless the change is visual.
- Small fixes (one file, obvious) are done by the orchestrator directly, without an agent.

