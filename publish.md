# Publishing `graph-propagate` to npm

`graph-propagate` is the graph-first fork of [Reversa](https://github.com/sandeco/reversa): Codex agents query a [graphify](https://pypi.org/project/graphifyy/) knowledge graph of the code before reading files. The CLI ships two equivalent commands, `graph-propagate` and `reversa`.

This file is not part of the published package (the `files` whitelist in `package.json` excludes it).

## 1. Prerequisites

- An npm account: https://www.npmjs.com/signup
- Two-factor authentication enabled on that account (npm requires it for publishing)
- Node.js 18.20.2 or newer (`node -v`)
- Run every command below from the repository root:

```bash
cd /Users/amanyadav/reaper/ai/lib/codex-legacy-migrate
```

## 2. Pre-flight checks

```bash
npm install            # make sure dependencies match package-lock.json
npm run verify         # skill invocation axis + installer transport smoke test
npm test               # node --test suite in tests/
npm pack --dry-run     # shows exactly what would be uploaded, without uploading
```

In the `npm pack --dry-run` output, check that:

- the header says `graph-propagate@<version>`
- only `agents/`, `bin/`, `lib/`, `src/`, `templates/`, `README.md`, `LICENSE` and `package.json` are listed
- there is no `node_modules/`, `.env`, `docs/`, `tests/`, `plan.md` or `publish.md`
- the package size is reasonable (a few MB at most)

Also confirm the name is still free (a 404 means it is):

```bash
npm view graph-propagate
```

## 3. Log in

```bash
npm login              # opens the browser; complete the 2FA step
npm whoami             # should print your npm username
```

## 4. Publish the first release

```bash
npm publish
```
