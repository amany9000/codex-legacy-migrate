# Front-end Team (Impeccable)

The **Front-end Team** is [Impeccable](https://github.com/pbakaus/impeccable), the design framework created by [Paul Bakaus](https://github.com/pbakaus), shipped with Reversa under the [Apache License 2.0](https://github.com/sandeco/reversa/blob/main/agents/impeccable/LICENSE). It is one skill with 24 design commands for websites, landing pages, dashboards, product UI, components, forms and native iOS or Android screens.

Pre-checked in the installer. Installed as the `impeccable` skill, side by side with the Reversa agents.

---

## Why it is here

Reversa extracts specs and drives code from them; the Design System agent records the tokens a legacy already has. None of that makes a new or rebuilt screen look good. Impeccable fills that gap: it works as an art director would, with a point of view, a quality floor and a check of the rendered result, and it avoids the tells every model repeats (the same fonts, gradients and nested cards).

---

## How to use

```
/impeccable init                 once per project: records durable product truth in PRODUCT.md
/impeccable critique landing     UX review with heuristic scoring
/impeccable audit checkout       a11y, performance and responsive checks
/impeccable polish settings      final pass before shipping
/impeccable bolder hero          amplify a bland design
/impeccable harden forms         errors, i18n, overflow, edge cases
/impeccable                      no argument: context-aware menu
```

Commands by category:

| Category | Commands |
|----------|----------|
| Build | `shape`, `init`, `document`, `extract` |
| Evaluate | `critique`, `audit` |
| Refine | `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard` |
| Enhance | `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive` |
| Fix | `clarify`, `adapt`, `optimize` |
| Iterate | `live`, `generate` |

For engines without slash commands (Codex, Hermes) type `impeccable <command> <target>`.

### The engine binary

The skill ships a small launcher (`scripts/impeccable`, plus `impeccable.cmd` for Windows). On the first run it downloads the Impeccable engine binary for your platform into `~/.impeccable/bin/`; no Node runtime is needed. Sandboxes without network can preinstall the binary and point `IMPECCABLE_BIN` to it.

### Optional design detector hook

Impeccable can run a deterministic detector after every UI edit. Reversa does not install that hook, because it never touches `.claude/settings.json`. Turn it on yourself with `/impeccable hooks on`.

---

## What Reversa does and does not change

Reversa carries the upstream skill verbatim: `SKILL.md`, the `reference/` playbooks, the launcher and data files, plus the Codex marker (`agents/openai.yaml`) and the `LICENSE` and `NOTICE.md` files. Nothing is rewritten. Provenance (version, tag, commit, date) is recorded in `agents/impeccable/reversa-bundle.json`.

The Claude Code subagents and the hook settings from the upstream repository are not carried; the skill has a degraded mode for the former and the hook is a user choice.

---

## Keeping it current

`scripts/sync-impeccable.mjs` resolves the latest upstream release tag (`skill-vX.Y.Z`), clones it and replaces `agents/impeccable/`. A GitHub Action runs it daily; when a new release exists it bumps the Reversa patch version and opens a pull request. After the merge is published, `npx graph-propagate update` reinstalls every agent, so your project receives the new Impeccable with no extra step.

```bash
node scripts/sync-impeccable.mjs            # latest release
node scripts/sync-impeccable.mjs --tag skill-v4.7.0
node scripts/sync-impeccable.mjs --check    # compare only
```

---

## Credits

Impeccable is created and maintained by **[Paul Bakaus](https://github.com/pbakaus)**. The skill, its 24 commands, the detector rules and the design guidance are his work; Reversa only packages and distributes an unmodified copy as its Front-end Team.

Reversa could have reverse-engineered Impeccable's documentation and rebuilt its guidance under its own name. That would be dishonest and unfair to its author, who did excellent work producing a frontend design library this good. So Reversa ships his work as it is, under his license, and gives him the recognition he deserves for it.

- Source code: [github.com/pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- Website and documentation: [impeccable.style](https://impeccable.style)
- Releases used by Reversa: [github.com/pbakaus/impeccable/releases](https://github.com/pbakaus/impeccable/releases)

---

## License

Impeccable is Copyright Paul Bakaus and licensed under the Apache License 2.0. The license text and the third-party notices travel with the skill in `agents/impeccable/LICENSE` and `agents/impeccable/NOTICE.md`, and are installed into your project with it. Reversa itself remains MIT.
