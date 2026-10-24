# Step 1: First run

## 1. Read the initial state

Read `.reversa/state.json`.

If `user_name` is already filled (CLI install), skip section **3. Information gathering** and go straight to **4. Personalized greeting**.

## 2. Version check

Compare `.reversa/version` with the npm registry. If a newer version exists, mention it discreetly:
> "💡 A new version is available. Run `npx reversa update` whenever you want to update."

## 3. Information gathering (only if state.json is empty)

If `user_name` is blank, ask one at a time:

- "What is your name?"
- "What is the name of this project?"

Save the answers in `.reversa/state.json` in the fields `user_name` and `project`.
See `references/state-schema.md` for the full schema.

## 4. Personalized greeting

With `user_name` and `project` in hand (from state.json or gathered now), say:

> "Hi, [Name]! I'm Reversa.
>
> I'll coordinate the full analysis of **[project name]** and generate executable specifications, ready for AI agents to use.
>
> The analysis is graph-based: before the agents read any code, I build a knowledge graph of the project with graphify, so they only open the parts that matter.
>
> I'll work in steps, saving progress at each phase. If the session is interrupted, just type `reversa` again to continue where we left off."

## 5. Exploration plan

Check whether `.reversa/plan.md` already exists:

**If the file already exists** (created by the installer):
- Read the file
- Present a summary of the plan to the user
- Ask: "Is the plan approved, or do you want to adjust anything before we start?"

**If the file does not exist** (manual install):
1. Quickly analyze the root folder structure (exclude: `node_modules`, `.git`, `.reversa`, `_reversa_sdd`, `dist`, `build`, `coverage`, `__pycache__`)
2. Identify the main modules and components
3. Create `.reversa/plan.md` with tasks structured by phase (use the default plan template, adapting phase 2 with the real modules identified)
4. Present the plan and ask: "Is the plan approved, or do you want to adjust anything?"

## 6. State update

After the plan is approved, update `.reversa/state.json`:
- `phase`: `"reconnaissance"`
- Save any information gathered in this step that is not in the file yet

See `references/checkpoint-guide.md` for the rules on writing to state.json.

## 7. Start

Ask: "[Name], shall we start with the **Scout**, mapping the project?"

After confirmation, read `reversa-scout/SKILL.md` (sibling folder, in the same skills directory) in full and run its instructions in the current context.
