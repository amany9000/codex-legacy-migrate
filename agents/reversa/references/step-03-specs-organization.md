# Step 3, Specs organization

This step happens right after the user chooses the `doc_level` (Essential / Complete / Detailed) and before the Archaeologist is invoked. It is the moment when Reversa decides and persists the structure in which the specs will be generated.

## 1. Decide whether to show the menu

Read, in this order, and merge key by key (full precedence for `config.user.toml`):

1. `.reversa/config.toml`, section `[specs]` (config managed by Reversa)
2. `.reversa/config.user.toml`, section `[specs]` (user's manual override)

The merge is evaluated per key: each key present in `config.user.toml` replaces the matching one in `config.toml`. Missing keys keep coming from `config.toml`.

The section is considered **decided** when, after the merge, `granularity` holds one of the valid values: `module`, `use-case`, `endpoint`, `hybrid`, `feature`, `custom`.

- **If decided:** skip this whole step. Go straight to invoking the Archaeologist.
- **If not decided** (section missing, or `granularity` empty): show the menu (step 2 below).

### Special case, RF-18

If `granularity` is empty in `config.toml` (or the section was removed) **and** there is a `[specs]` section in `config.user.toml` with any key filled, warn the user before showing the menu. Use exactly this format:

> "I noticed `.reversa/config.toml` has no specs organization decision, but `.reversa/config.user.toml` contains an override in `[specs]`. The override will stay active after your choice and may overwrite fields you decide now.
>
> Current override in `config.user.toml`:
> [list keys and values]
>
> Do you want to go ahead with the menu anyway? (y/N)"

Wait for an explicit affirmative answer before moving to the menu. An empty or negative answer aborts without persisting anything.

## 2. Show the menu

Read `.reversa/context/surface.json` → `organization_suggestion`. Use the `granularity` field to pre-select the suggested option and the `rationale` field to show the reason.

If `surface.json` has no `organization_suggestion` (the Scout did not run or failed), show the menu without a default and ask the user to choose manually, per EC-01 of the organization spec.

Use exactly this format:

```
How do you want to organize the specs of this project?

The Scout analyzed the legacy system and suggests: [suggested granularity].
Reason: [organization_suggestion.rationale]

  [1] [marker] By code module
  [2] [marker] By use case
  [3] [marker] By endpoint/contract
  [4] [marker] Hybrid (module at the root, nested use cases)
  [5] [marker] By features (the Scout lists the discovered features)
  [6] [marker] Custom

Choice (Enter accepts the suggestion):
```

Where `[marker]` is `*` (asterisk) on the pre-selected option and a space on the others. Add `(suggested)` next to the pre-selected option.

Mapping of the 6 options to the `granularity` value:

| Option | `granularity` |
|--------|---------------|
| 1 | `module` |
| 2 | `use-case` |
| 3 | `endpoint` |
| 4 | `hybrid` |
| 5 | `feature` |
| 6 | `custom` |

### Accepting the input

- Enter without typing: accepts the pre-selected option.
- Number from 1 to 6: accepts the matching option.
- Any other input: ask again without persisting anything.
- Ctrl+C / ESC / cancellation: abort and persist nothing (EC-02).

### Option 6, custom

If the user chooses 6, open this prompt:

> "What are the names of the top-level folders? List them comma-separated or one per line (at least 1)."

Accept the input and sanitize each name (remove characters forbidden by the OS file system, drop empty names). If the list ends up empty, repeat the prompt (EC-07). The names go into `custom_folders`.

## 3. Detect conflict with a structure already on disk (RF-11)

Before persisting the decision, check whether a specs structure already exists in `<output_folder>/` (defined in `state.json`).

If the output folder has subfolders matching a granularity different from the one chosen now (for example, `endpoint` was chosen but the disk has folders that look like `module`), show a warning comparing the two structures and ask for confirmation:

> "I noticed specs already generated with the **[old]** structure exist in `<output_folder>/`. You have now chosen **[new]**, which differs from the previous one.
>
> I'll create the new structure in parallel, without touching the previous one. Existing specs are preserved.
>
> Confirm? (y/N)"

Wait for an explicit affirmative answer. A negative answer aborts without persisting.

Detection is heuristic and best-effort: compare top-level subfolder names with the modules identified by the Scout (`module`), with URIs/routes (`endpoint`), with features (`feature`), and so on. When the heuristic cannot decide clearly, do **not** show the warning (avoids false positives).

## 4. Persist the decision (RNF-03, atomic write)

Update `.reversa/config.toml`, section `[specs]`, with:

```toml
[specs]
layout = "feature-folder"
granularity = "<user's choice>"
custom_folders = [<list>]   # only when granularity == "custom", otherwise []
scout_suggestion = "<organization_suggestion.granularity from surface.json>"
decided_at = "<ISO 8601 UTC timestamp, e.g. 2026-05-03T14:32:00Z>"
```

Rules:

- **Atomic write:** write to a temporary file in the same directory (`config.toml.tmp`) and atomically rename it to `config.toml`. A failure while writing must never leave `config.toml` corrupted.
- **scout_suggestion is immutable** (RF-14): if the `[specs]` section already existed with an empty `granularity` and a filled `scout_suggestion`, keep `scout_suggestion`. On the first run, copy the current value of `organization_suggestion.granularity` from `surface.json`.
- **Non-destructive:** keep every key/section you are not explicitly updating. Do not touch `[project]`, `[user]`, `[output]`, `[agents]`, `[engines]`, `[analysis]` or other sections.
- **Do not touch `.reversa/config.user.toml`.** That file belongs to the user.
- **IO failure** (disk full, no permission, EC-06): show a clear error, create no spec folders, and do not treat the choice as confirmed. The user can try again on the next run.

## 5. Continuing the flow

After a successful write, continue with invoking the Archaeologist according to `plan.md`. The decision is available to every agent that writes specs.

## 6. Showing the menu again manually (RF-17)

There is no dedicated CLI flag to reconfigure. The user shows the menu again by manually removing the `[specs]` section from `.reversa/config.toml` (or emptying `granularity`). On the next run, this step detects the "not decided" state and runs again.

## Folder names (RF-10)

The names Reversa uses for feature folders are in English. Do not ask about language in this step.

## Checklist before moving on

- [ ] Read `[specs]` from `config.toml` and merge with `config.user.toml` key by key
- [ ] If already decided, skip the step
- [ ] If there is an override in `config.user.toml` but `config.toml` is empty, show the RF-18 warning
- [ ] Read `organization_suggestion` from `surface.json`
- [ ] Show the menu with the suggestion pre-selected
- [ ] Accept Enter, a number from 1 to 6, or cancellation
- [ ] If option 6, collect `custom_folders`
- [ ] Detect conflict with the structure on disk and ask for confirmation
- [ ] Atomic write to `config.toml`
- [ ] Keep `scout_suggestion` on re-runs with a partial section
- [ ] Proceed to the Archaeologist
