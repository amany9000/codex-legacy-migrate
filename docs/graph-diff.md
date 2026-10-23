# Graphify Graph Diff

`src/graphify/graph-diff.js` compares two Graphify graph snapshots and returns a versioned, JSON-serializable structural diff. It reuses `GraphContext`/`loadGraph` from the Context Adapter, accepts both native clustered `links` and raw extraction `edges`, and does not edit either input.

## API

```js
import { diffGraphFiles } from './src/graphify/graph-diff.js';

const diff = await diffGraphFiles(
  '../baseline/graphify-out/graph.json',
  '../after-migration/graphify-out/graph.json'
);
console.log(JSON.stringify(diff, null, 2));
```

The general `diffGraphs(baseline, after)` accepts file paths, native JSON graph objects, or `GraphContext` instances. File loading uses the adapter's validation and error types. Invalid JSON raises `GraphContextError` with `code: "GRAPH_READ_ERROR"`; missing graph structures raise `GraphContextError` or `GraphDiffError` with `code: "INVALID_GRAPH"`.

## Result contract

The result has `schema_version: 1`, `baseline` and `after` snapshot metadata, `summary`, `nodes`, `edges`, `warnings`, and `limitations`.

- `summary` reports added, removed, and metadata-changed node/edge counts, ambiguous node-match count, and `complete`.
- `nodes.added` and `nodes.removed` contain native node records. `nodes.changed` contains matched before/after records and field-level `metadata_changes`; an ID fallback match also includes `identity_changed`.
- `nodes.ambiguous` lists label-based candidates that cannot safely be paired.
- `edges.added` and `edges.removed` contain the native relationship and its identity. `edges.changed` contains before/after native relationships and field-level metadata changes.
- `warnings` are objects with a `side` (`baseline`, `after`, or `both`), `code`, and `message`, with candidate or endpoint details when relevant.
- `limitations` describes interpretation constraints that apply to every result.

Node metadata comparison ignores `id`. Relationship structure is the directed `(source, relation, target)` identity, after resolving matched node identities. Direction and relation are significant. Parallel links preserve multiplicity and are paired deterministically by their metadata. Relationship metadata comparison ignores `source`, `target`, and `relation`, so source locations, context, confidence, weight, and other present fields appear as metadata changes rather than edge removals/additions.

## Identity matching

1. Unique, non-empty Graphify node IDs are matched exactly first.
2. Still-unmatched nodes can be paired by a unique `norm_label`, then a unique `label`, only when exactly one candidate exists on each side. Such a pair is listed as `nodes.changed` with `identity_changed` and a `NODE_IDENTITY_FALLBACK` warning.
3. If a label-based match is not unique, all candidates are listed under `nodes.ambiguous`; the adapter does not guess and does not count those candidates as additions or removals. Relationships involving those nodes are omitted and warned about.
4. Nodes with missing or duplicate IDs cannot participate in safe identity matching. They are omitted from node additions/removals, and the comparison is marked incomplete.

This fallback makes ID churn easier to inspect, but it is weaker evidence than a stable ID. A label match is not proof that two symbols are semantically identical.

## Completeness and limitations

`summary.complete` is false when required graph evidence is incomplete, such as missing or duplicate IDs, invalid/unresolved edge endpoints, ambiguous fallback candidates, or any use of the weaker label fallback. Context Adapter warnings are carried into the result with their snapshot side. Unknown relation names are still compared as literal relation types; no semantic interpretation is inferred from them.

The module compares native node/link structures only. It does not compare report or HTML artifacts, infer behavior, or establish that a migration succeeded. A removed node or edge is not evidence of correctness. Tests, review, and other behavior checks remain necessary. Hyperedges are not part of the current validated comparison path. Graphify's report edge count is not consulted; counts come from each graph JSON array.
