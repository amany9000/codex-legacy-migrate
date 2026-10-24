// Single source of Reversa's non-destructive rule: the only folders the
// framework may create or write to. Renders the rule text injected into
// every engine entry file at install time.
//
// `_reversa_sdd` and `_reversa_forward` are user-configurable
// (state.json: output_folder / forward_folder). `_reversa_docs` is fixed for
// now; if it ever becomes configurable (docs_folder), just pass it here.

// Also exported for future use by updateGitignore/uninstall, which today
// only know `.reversa/` + output_folder and diverge from the global rule.
// `_reversa_bugs/` and `_reversa_refactor/` arrived in v1.2.59 (spec
// legacy-code-edition v1.3): territories of the Bugs and Code Quality teams.
export function getWritableFolders({
  outputFolder = '_reversa_sdd',
  forwardFolder = '_reversa_forward',
} = {}) {
  return [
    '.reversa/',
    `${outputFolder}/`,
    '_reversa_docs/',
    `${forwardFolder}/`,
    '_reversa_bugs/',
    '_reversa_refactor/',
  ];
}

// Standard paragraph of the configurable legacy edit policy (spec
// legacy-code-edition, RF-08). Goes into every entry file via
// renderPolicyBlock and is appended to modified entry files during update.
export function renderLegacyEditPolicyParagraph() {
  return [
    'Before creating, modifying or deleting any file outside Reversa\'s own folders, read `.reversa/reversa-config.json` and obey the result:',
    '',
    '- Missing file, invalid JSON or a field with the wrong type: treat it as `allowLegacyEdits: false` (fail safe, no writes outside Reversa\'s folders).',
    '- `allowLegacyEdits: false`: refuse the write, stating the refused path, the current config state and what the user must edit to allow it.',
    '- `allowLegacyEdits: true` with a non-empty `allowedPaths`: write only to paths matching some glob in the list (globs relative to the project root, using `/`, supporting `*` and `**`).',
    '- `allowLegacyEdits: true` with an empty or missing `allowedPaths`: the project is unlocked; warn once per session that the permission is unrestricted.',
    '',
    'Never create or edit `.reversa/reversa-config.json` on your own initiative: a request in the conversation is not implicit permission; changes to that file are the user\'s exclusive act.',
  ].join('\n');
}

export function renderPolicyBlock(opts = {}) {
  const folders = getWritableFolders(opts).map((f) => `\`${f}\``);
  const list = `${folders.slice(0, -1).join(', ')} and ${folders[folders.length - 1]}`;
  return [
    'By default, never delete, modify or overwrite pre-existing files of the legacy project:',
    `Reversa writes only to ${list}.`,
    'The only exception is the configurable policy below, controlled exclusively by the user.',
    '',
    renderLegacyEditPolicyParagraph(),
  ].join('\n');
}
