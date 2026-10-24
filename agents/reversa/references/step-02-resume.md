# Step 2: Session resume

## 0. Migration-in-progress check

First of all, read `.reversa/state.json` only to resolve `output_folder` (default `_reversa_sdd`).

Check whether `<output_folder>/migration/.state.json` exists. If it does not, skip this section and go to section 1.

If it exists, read the file and classify the migration state:

| Condition | State |
|-----------|-------|
| `pendingAgents.length > 0` or `currentAgent.agent` other than `null` | in progress |
| `currentAgent.status == "awaiting_user_approval"` | pending intra-agent pause |
| `pendingAgents.length == 0`, `currentAgent.agent == null` and `<output_folder>/migration/handoff.md` exists | finished |

If the state is **finished**, skip this section (the migration is over, nothing to ask) and go to section 1.

If the state is **in progress** or **pending intra-agent pause**, ask the user before anything else:

> "[Name], I found a **migration in progress** in `<output_folder>/migration/`.
>
> - Done: <N> of 6 agents (<completedAgents list>)
> - Pending: <pendingAgents list>
> - Current state: <currentAgent.agent or \"waiting for human approval\">
>
> How do you prefer to continue:
>
> 1. **Resume the migration**: go back to the Migration Team where it stopped
> 2. **Resume the Reversa flow**: continue discovery/forward, ignore the migration for now
> 3. **Cancel**: end this session without changing anything
> 4. **Other**: describe what you prefer to do
>
> Use the engine's interactive menu mechanism (in Claude Code, `AskUserQuestion`); in engines without menu support, ask the user to type the number 1–4 or free text."

Wait for the answer. Do NOT choose on your own.

- If **1**: end `/reversa` here with the final instruction:
  > "To resume the migration, type `/reversa-migrate`. It detects the saved state and offers the resume options."
  
  Do NOT activate `reversa-migrate` automatically; let the user type it (Reversa's explicit handoff pattern).
- If **2**: proceed with section 1 of this step normally.
- If **3**: end without doing anything.
- If **4** (free text): interpret the user's intent and offer the best possible route, without inventing new flows. If the intent is ambiguous, ask once more before deciding.

## 1. Read the state

Read `.reversa/state.json` and `.reversa/plan.md`.

## 2. Version check

Compare `.reversa/version` with the npm registry. If a newer version exists, mention it discreetly:
> "💡 A new version is available. Run `npx reversa update` whenever you want to update."

## 3. Greeting

Say: "[Name], welcome back to Reversa! 🎼"

## 4. Progress summary

Show:
- ✅ Completed phases (`completed` field of state.json)
- 🔄 Current phase (`phase` field) with the last task recorded in `checkpoints`
- ⏳ Next phases (`pending` field)

Example:
> "Current progress:
> ✅ Reconnaissance done
> 🔄 Excavation in progress: modules `auth` and `orders` analyzed, `payments` and `users` pending
> ⏳ Interpretation, Generation, Review"

## 5. Gap answer mode

If `answer_mode` is `"file"`:
> "Remember: your answers to the questions go in `_reversa_sdd/questions.md`. Let me know when you're done."

If `answer_mode` is `"chat"` (default):
> Continue normally; I'll ask the questions here in the chat.

## 6. Confirmation

Just ask: "Shall we continue where we left off? (CONTINUE to proceed)"

After confirmation, resume the next pending task in the plan (`.reversa/plan.md`).

**🚫 Do not offer `/clear` + `/reversa` at this point.** The user just resumed the session; asking them to clear and reopen now is redundant. The between-steps pause prompt (described in `SKILL.md`, section "Preventive checkpoint between steps") only applies **after** an agent finishes work within this session, never in the resume greeting itself.

See `references/checkpoint-guide.md` for the rules on writing to state.json.
