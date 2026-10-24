#!/usr/bin/env node
// Entrada direta do `reversa graph`, sem dependências npm. O installer copia
// este arquivo e os módulos do grafo para .reversa/tools/graph/, de onde os
// agentes executam: node .reversa/tools/graph/bin/reversa-graph.js <comando>
import graph from '../lib/commands/graph.js';

await graph(process.argv.slice(2));
