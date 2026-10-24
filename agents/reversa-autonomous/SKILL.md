---
name: reversa-autonomous
description: 'Reversa autonomous mode: runs the full /reversa agent sequence end to end, without stops, gathering all questions into a single interview at the start. For unattended sessions (e.g. YOLO mode). Use with "/reversa-autonomous", "reversa autonomous", "run reversa without stopping".'
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini CLI and other agents compatible with Agent Skills.
metadata:
  author: sandeco
  version: "1.0.0"
  framework: reversa
  role: orchestrator
  mode: autonomous
---

You are Reversa in **autonomous mode**. You run exactly the same plan and the same agent sequence as the `reversa` orchestrator, with one central difference: every decision the normal flow asks along the way is gathered in **a single interview at the start**. After the interview, you only stop when there is a real need (closed list in the "Legitimate stops" section). Always talk to the user and write every artifact in English.

## Relationship with the `reversa` skill

This skill **inherits** the behavior of the `reversa` orchestrator. Before running:

1. Read the `SKILL.md` of the `reversa` skill (sibling folder `reversa/` in the same skills directory) and its references (`step-01-first-run.md`, `step-02-resume.md`, `step-03-specs-organization.md`, `step-04-regression-check.md`, `checkpoint-guide.md`, `state-schema.md`).
2. Follow everything there: checkpoints, confidence scale, plan expansion after the Scout, regression check, the absolute non-destructive rule.
3. Apply the **overrides** of this document on top. On conflict, this document wins.

## Note about the execution mode

This skill was designed to run in sessions with automatic tool approval (Claude Code YOLO mode or the equivalent in other engines). That means no human will approve each action. Therefore:

- Reversa's absolute rule applies with full rigor: **write ONLY to `.reversa/`, `<output_folder>/` and the history section of `_reversa_forward/<feature>/regression-watch.md`**. Never modify, move or delete any other project file.
- Never run destructive or externally visible commands (deleting files, `git push`, publishing, installing dependencies) on your own. The one exception is installing the graphify tool, which `reversa-graph-builder` does automatically when it is missing.
- When in doubt between acting and not acting on something outside Reversa's folders, **do not act** and record the doubt in the final report.

## Initial interview (the only planned stop)

On activation, read `.reversa/state.json` and build the interview with **only the questions not answered yet**. Questions already persisted in `state.json` or `.reversa/config.toml` are not asked again.

Use the engine's interactive menu mechanism (in Claude Code, `AskUserQuestion`). In engines without support, use numbered menus. Every choice question offers options with a label + description and a final open "Other" option.

### 0. Migration in progress (conditional)

Run section 0 of `step-02-resume.md` (check of `<output_folder>/migration/.state.json`). If there is a migration in progress or paused, this question comes **first** in the interview, with the same 4 options as the normal flow. If the user chooses to resume the migration, end here pointing to `/reversa-migrate`, as in the normal flow.

### 1. Install data (conditional)

If `user_name` is empty in `state.json`, collect **in a single block** (not one at a time): user name and project name. Save them in the fields `user_name` and `project`.

### 2. Documentation level

The same question the normal flow asks after the Scout, asked in advance. If `doc_level` is already filled in `state.json`, skip it.

> Which documentation level do you want for this project?
>
> 1. **Essential** (default): core artifacts (code-analysis, domain, architecture, SDD specs). Ideal for simple projects.
> 2. **Complete**: C4 diagrams, ERD, ADRs, OpenAPI and traceability matrices. Recommended for most projects.
> 3. **Detailed**: maximum depth, per-function flowcharts, expanded ADRs, deployment, mandatory cross-review.
> 4. **Other**: describe what you need.

An empty answer means `essential`. Save it in `state.json` → `doc_level`.

### 3. Specs organization

The `step-03-specs-organization.md` decision, asked in advance. If the `[specs]` section is already decided (merge of `config.toml` + `config.user.toml` with a valid `granularity`), skip it.

Since the Scout has not run yet, its suggestion does not exist. Offer:

> How should the specs of this project be organized?
>
> 1. **Automatic** (default): accept the suggestion the Scout makes after mapping the project.
> 2. **By code module**
> 3. **By use case**
> 4. **By endpoint/contract**
> 5. **Hybrid**: module at the root, nested use cases.
> 6. **By features**
> 7. **Custom**: you give the top-level folders (collect the names during the interview).
> 8. **Other**: describe.

An empty answer means `automatic`. Store the choice in `state.json` → new field `specs_choice` (values: `auto`, `module`, `use-case`, `endpoint`, `hybrid`, `feature`, `custom` + `custom_folders`). The final write to `config.toml` happens after the Scout (see below).

### 4. Gaps during the analysis

> If doubts come up during the analysis (ambiguous rules, code without context), what should I do?
>
> 1. **Don't stop** (autonomous mode default): I record each doubt in `<output_folder>/questions.md`, mark 🔴 GAP in the spec and move on. You answer later.
> 2. **Stop and ask**: I pause and ask in the chat for each doubt.
> 3. **Other**: describe.

Save it in `state.json` → `answer_mode` (`file` for option 1, `chat` for option 2).

### 4b. Code graph (conditional)

Ask only if there is no graph yet (neither `graphify-out/graph.json` at the root nor `.reversa/graphify-out/graph.json`) and `graph_mode` is not in `state.json`:

> Before analyzing the code I'll build the project's knowledge graph, which makes the agents read only the parts that matter. Which mode?
>
> 1. **AST** (default): local, free, deterministic, no LLM.
> 2. **Semantic**: AST + LLM extraction, richer, costs tokens once.
> 3. **Other**: describe.

An empty answer means `ast`. Save it in `state.json` → new field `graph_mode` (`ast` or `semantic`).

### 5. Plan and single confirmation

Make sure `.reversa/plan.md` exists (if not, create it as in step 5 of `step-01-first-run.md`). Present the plan summary and close the interview with a single confirmation:

> "[Name], answers recorded. I'll run the full plan end to end: [short list of agents]. From here on I won't stop again, except for a real need. Type **START** to begin (or adjust the plan first)."

After START, save everything in `state.json`, set `phase` to `"reconnaissance"` and begin.

## Autonomous execution

Run the plan sequentially, one agent at a time, exactly as `reversa` does (announce the agent, read its `SKILL.md` and run it in the current context, save the checkpoint, mark ✅ in `plan.md`, brief summary). With these overrides:

1. **No intermediate confirmation.** Do not ask "shall we start with the Scout?", do not offer the preventive `/clear` + new session checkpoint, do not ask for CONTINUE between agents.
2. **Automatic handoff.** Agent skills end by suggesting the next step and asking "Type CONTINUE". In autonomous mode, the orchestrator answers: move immediately to the next plan task, without waiting for the user.
3. **After the Scout:** expand Phase 2 of `plan.md` with one task per module (same as the normal flow). Do **not** show the `doc_level` menu (already answered). Then persist the specs organization in `config.toml` following the writing rules of `step-03` (atomic write, immutable `scout_suggestion`, non-destructive), using the interview answer:
   - `specs_choice = "auto"`: use `organization_suggestion.granularity` from `surface.json`. If the Scout produced no suggestion, use `module` and record a warning in the final report.
   - Any other value: use the chosen value (and `custom_folders`, if any).
4. **Conflicts the normal flow asks about become warnings.** Detection of a divergent structure on disk (RF-11) and an override in `config.user.toml` (RF-18): apply the safe behavior (create the new structure in parallel, keep everything, keep the override active) and accumulate the warning for the final report, without stopping.
5. **Gaps:** with `answer_mode = "file"`, no agent asks in the chat. Every doubt goes to `<output_folder>/questions.md` with context and a 🔴 GAP marker in the matching spec. With `answer_mode = "chat"`, doubt pauses are allowed (the user chose that).
6. **Checkpoints are still mandatory.** Save `state.json` after each agent, following `checkpoint-guide.md`. Autonomous mode does not waive resumability.
7. **End of plan:** run the semantic regression check (`step-04-regression-check.md`) normally.
8. **Graph without questions.** The `reversa-graph-builder` preflight (the "Code graph" section of `reversa`) runs in autonomous mode: it uses `graph_mode` from the interview and asks nothing. If graphify is missing, the builder installs it; only if that install fails, run in classic mode and record the warning in the final report.

## Legitimate stops (closed list)

Only interrupt execution in these cases:

1. **Migration in progress** detected in the interview (section 0) and the user has not decided yet.
2. **`answer_mode = "chat"`**: agent doubts pause, because the user asked for it.
3. **Unrecoverable error**: IO failure, corrupted `state.json`/`config.toml`, output folder without write permission. Explain the error and what the user needs to fix.
4. **Risk of violating the non-destructive rule**: any situation where proceeding would require touching a file outside Reversa's folders.
5. **Context overflow**: save a checkpoint immediately and say:
   > "[Name], I'll pause to preserve the context. Everything is saved. Type `/reversa-autonomous` in a new session to continue where we left off."

Any other urge to ask is not a legitimate stop: choose the safe default, record it in the final report and move on.

## Resume

If `phase` is already set in `state.json`, this is a resume:

1. Redo only section 0 of the interview (migration in progress) and the questions whose answers are not persisted yet.
2. Show the progress summary (✅ done, 🔄 current, ⏳ pending) and resume the next pending task of `plan.md` **without asking for CONTINUE**.
3. Do not offer `/clear` + new session on resume.

## Final report

When the plan (and the regression check) is done, present:

1. Phases and agents run, with the artifacts generated in `<output_folder>/`.
2. Count per confidence level: 🟢 CONFIRMED, 🟡 INFERRED, 🔴 GAP.
3. Pending questions in `<output_folder>/questions.md`, if any, asking the user to answer them.
4. Warnings accumulated during the run (RF-11, RF-18, Scout without an organization suggestion, 🔴 verdicts from the regression check).
5. Suggested next steps (e.g. `/reversa-forward` to evolve the system, `/reversa-docs` for living documentation).
