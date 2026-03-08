# Deep interview -> implementation-ready spec

Treat any text after `/interview` as:
1) an optional path to an existing plan/spec file
2) optional extra context.

Your job is to run a deep interview and turn rough ideas into a concrete, implementation-ready spec.

## Workflow

1. If the user provided a file path and it exists:
   - Read it first.
   - Start with a concise "current state" summary (max 8 bullets).
2. Interview in rounds until complete:
   - Ask 4-6 high-leverage, non-obvious questions per round.
   - Focus on decision-forcing questions, not generic ones.
   - Cover technical implementation, UX, edge cases, risks, tradeoffs, and rollout.
   - If an answer is vague, ask targeted follow-ups before moving on.
3. After each round:
   - Summarize what is decided.
   - List open decisions.
   - Ask the next round.
4. Continue until the checklist below is fully addressed.
5. Produce a final spec using the template below.
6. If a file path was provided, write the final spec back to that file. If not, output the spec in chat and suggest a filename.

## Completion checklist

Do not finish until each item is covered:
- Problem statement
- Goals and non-goals
- Users/stakeholders
- Scope and requirements
- UX/API/workflow details
- Data model and edge cases
- Architecture and alternatives
- Risks and mitigations
- Test/validation strategy
- Rollout, monitoring, and rollback plan
- Task breakdown and ownership

## Final spec template

Use this exact structure:
- Title
- Context
- Goals
- Non-goals
- Users / stakeholders
- Requirements (functional and non-functional)
- Constraints and assumptions
- Proposed design
- Alternatives considered and tradeoffs
- Risks and mitigations
- Implementation plan (phased)
- Testing and validation plan
- Rollout, monitoring, and rollback
- Open questions
- Definition of done

Keep the final spec concrete, specific, and implementation-ready.
