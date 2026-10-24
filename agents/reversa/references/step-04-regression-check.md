# Step 4, semantic regression check

> This step only runs on **re-extractions**, that is, when a reverse pipeline runs on a project that has already been through at least one `/reversa-coding` cycle. In projects without `_reversa_forward/` or without `regression-watch.md`, the regression check is silently skipped (the "Addenda reconciliation" at the end is still checked).

## Why it exists

Reversa is not just a one-shot extraction. Each `/reversa-coding` leaves in `_reversa_forward/<feature>/regression-watch.md` a list of rules that must stay true in the next extraction. When the reverse pipeline runs again, it must check those rules against the current code and report regressions. This is Reversa's competitive edge over pure forward frameworks.

## When to run

After the **last agent of the plan** finishes, before the final "extraction complete" message. The trigger is position (last item of `.reversa/plan.md`), not agent name, because the last agent varies with the optional agents selected at install (the Reviewer may be absent, for example). Run the checks in order:

1. Check whether `_reversa_forward/` exists at the project root. If not, go straight to the "Addenda reconciliation" section.
2. List every subfolder of `_reversa_forward/` that contains `regression-watch.md`.
3. If the list is empty, go straight to the "Addenda reconciliation" section.
4. Otherwise, follow the procedure below, one feature at a time.

## Procedure per feature

For each `_reversa_forward/<feature>/regression-watch.md`:

1. Load the file. Identify the main watch items table (columns `ID | Source | Expected rule after change | Check type | Violation signal`).
2. For each watch item in the main table (not the archived ones):
   2.1. Identify the `Check type`; possible values: `presence`, `absence`, `wording`, `confidence`.
   2.2. Apply the matching check against the freshly generated artifacts in `_reversa_sdd/`:
        - `presence`: the rule must be present in `_reversa_sdd/domain.md` (or in the file pointed to by the Source column) with the same semantic essence.
        - `absence`: the original rule must NO longer appear in the SDD.
        - `wording`: the text was changed deliberately; check whether the new version matches the expectation.
        - `confidence`: the rule is still present, but its confidence (🟢, 🟡, 🔴) must be equal to or higher than expected.
   2.3. Assign a verdict:
        - 🟢 **green**: the expectation matched completely.
        - 🟡 **yellow**: there is semantic equivalence but the text differs, or the evidence is partial. Default verdict when in doubt. Waits for human judgment.
        - 🔴 **red**: the expectation did NOT match. A rule confirmed before became a broken rule.
3. After evaluating every watch item, update the `## Re-extraction history` section of the same `regression-watch.md` by adding a dated block:

```
### Re-extraction YYYY-MM-DD HH:MM

| ID | Verdict | Note |
|----|---------|------|
| W001 | 🟢 green | rule preserved in _reversa_sdd/domain.md#rule-X |
| W005 | 🔴 red | rule removed from the current code; unintended change |
| W010 | 🟡 yellow | equivalent text but literally different; waiting for judgment |
```

4. Do NOT change the main watch items table. Do NOT recycle IDs. Do NOT move watch items to "Archived" automatically.

5. For each watch item with three consecutive green verdicts in the history, and as long as `setup.json#watch.archive-after` allows it, move the item from the main table to the `## Archived` section at the end of the file. Keep the original ID.

## Writing policy

- Atomic write (tempfile plus rename) to `regression-watch.md`.
- Never rewrite or delete entries of the re-extraction history.
- The new re-extraction block always goes at the top of the `## Re-extraction history` section (descending order).

## Report to the user

After going through every feature, present:

1. Total features checked
2. Total watch items checked
3. Breakdown by verdict: green, yellow, red
4. Detailed list of the reds (ID, feature, rule, reason for the divergence)
5. Detailed list of the yellows that asked for human judgment

If there is at least one red, show a highlighted warning:

> 🔴 **Attention**: **N semantic regressions** were detected in previously coded features. Review them before moving on.

If `setup.json#watch.block-on-red` is `true`, suggest that the user does **not** proceed with new `/reversa-requirements` until each red is triaged. Reversa only alerts; it never blocks the user's flow automatically.

## Addenda reconciliation

After going through the features (or even if none has a `regression-watch.md`), check whether `_reversa_sdd/addenda/` exists with `.md` files created by `/reversa-sync`. If it does:

1. For each addendum whose `## Validity` section does NOT contain a line `Superseded by the re-extraction of ...`, append this line at the end of that section:

   ```
   Superseded by the re-extraction of YYYY-MM-DD.
   ```

2. Never delete the addendum, never rewrite the previous lines of the Validity section, never touch the other sections. Append-only, atomic write.
3. Addenda already superseded in previous re-extractions stay as they are (they are history).
4. Include in the report to the user how many addenda were marked as superseded in this re-extraction.

The reason: addenda are bridges between a forward delivery and the re-extraction. With the extraction regenerated from the current code, the deltas described in the addenda are already absorbed into the main artifacts, and consumers (for example `/reversa-requirements` and `/reversa-plan`) must only consider valid addenda.

## Special case, no `_reversa_sdd/`

If during the procedure `_reversa_sdd/` does not have the expected files (because the re-extraction was partial or the documentation level was reduced), record a 🟡 yellow verdict with the note `evidence missing, _reversa_sdd/<file> was not generated in this extraction` and move on.

## Known gap

Semantic equivalence between the expected rule and the extracted rule is a subjective assessment. When in doubt, prefer a yellow verdict. A red verdict must be reserved for cases where the rule simply disappeared or was explicitly contradicted.
