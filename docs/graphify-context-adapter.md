# Graphify Context Adapter

The adapter reads Graphify's native JSON; it does not edit Graphify output. It supports the verified clustered `links` array and raw extraction `edges` array. It indexes verified node `id` values and resolves strings by `id`, `label`, and (when present) `norm_label`. The verified schema has no node `name` field.

```js
import { loadGraph } from './src/graphify/graph-context.js';

const graph = await loadGraph('../legacy-demo-app/graphify-out/graph.json');
const context = graph.getMigrationContext('findById()', {
  maxDepth: 3,
  maxNodes: 60,
  maxEdges: 60
});
console.log(JSON.stringify(context, null, 2));
```

The example yields the `findById()` node and its source location, outgoing dependencies, direct `calls` callers, other direct dependents, and reverse impact split into direct and transitive records. Each record retains the native relationship and available source/provenance/confidence fields. Defaults cap traversal at depth 2, 100 impact nodes, and 100 context entries per list. Set `maxDepth`, `maxNodes`, and `maxEdges` to smaller values when a tighter context package is needed.

`getDependencies` returns verified outgoing `calls`, `imports`, and `imports_from` relationships. `getDependents` returns the corresponding incoming relationships. Reverse impact traverses those same relations in reverse, preserving each edge's source/target and relation. This captures direct callers plus imported modules and tests reachable through observed import edges. `contains` is not interpreted as a dependency or impact relation. Unknown relation types are left untouched in the input and surfaced as warnings, not traversed.

`getMigrationContext` returns `graph`, `target`, `dependencies`, `direct_dependents`, `callers`, bounded `impact`, `evidence`, and `warnings`. `findNode` raises `GraphContextError` codes `NODE_NOT_FOUND`, `AMBIGUOUS_TARGET`, or `INVALID_TARGET` where appropriate. `loadGraph` raises `GRAPH_READ_ERROR` or `INVALID_GRAPH` on unreadable or structurally invalid input. Unresolved or duplicate endpoints are excluded from traversal and reported in warnings. The adapter does not claim complete impact: traversal is bounded, unsupported relations and hyperedges are not traversed, and Graphify extraction may omit relationships.
