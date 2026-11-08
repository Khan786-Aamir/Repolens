const fs = require("fs");
const connectDB = require("./db");
const { retrieve } = require("./retrieve");

const REPO = process.argv[2] || "portfolio";
const FILE = process.argv[3] || "./eval-questions.json";

// "A -[CALLS]-> B" jaisi lines se node keys nikalna
function nodesFromEdges(edges) {
  const out = new Set();
  for (const e of edges) {
    const m = e.match(/^(.*) -\[\w+\]-> (.*)$/);
    if (m) {
      out.add(m[1]);
      out.add(m[2]);
    }
  }
  return out;
}

// expected nodes mein se kitne mile
const recall = (expected, got) =>
  expected.filter((k) => got.has(k)).length / expected.length;

(async () => {
  await connectDB();
  const qs = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const rows = [];

  for (const item of qs) {
    const t0 = Date.now();
    const { hits, graphEdges } = await retrieve(REPO, item.q);
    const ms = Date.now() - t0;

    const vecSet = new Set(hits.map((h) => h.key));
    const graphSet = new Set([...vecSet, ...nodesFromEdges(graphEdges)]);

    const row = {
      type: item.type,
      vec: recall(item.expected, vecSet),
      graph: recall(item.expected, graphSet),
      ms,
    };
    rows.push(row);
    console.log(
      `[${item.type}] vec=${row.vec.toFixed(2)} graph=${row.graph.toFixed(2)}  ${item.q}`
    );
  }

  const avg = (arr, f) => arr.reduce((s, r) => s + f(r), 0) / (arr.length || 1);
  for (const t of ["single", "multi", "all"]) {
    const sub = t === "all" ? rows : rows.filter((r) => r.type === t);
    console.log(
      `\n${t.toUpperCase()} (${sub.length} Qs): vector-only recall=${(avg(sub, (r) => r.vec) * 100).toFixed(0)}%  ` +
        `GraphRAG recall=${(avg(sub, (r) => r.graph) * 100).toFixed(0)}%  avg latency=${avg(sub, (r) => r.ms).toFixed(0)}ms`
    );
  }
  process.exit(0);
})();