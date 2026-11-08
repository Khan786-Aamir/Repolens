const connectDB = require("./db");
const { analyzeRepo } = require("./parser");
const { saveGraph, findCallers } = require("./graph");

(async () => {
  const [repoPath, repoId, key] = process.argv.slice(2);
  if (!repoPath || !repoId) {
    console.log('Usage: node ingest-test.js "<repo-path>" <repoId> ["<node key>"]');
    process.exit(1);
  }
  await connectDB();
  const { nodes, edges } = analyzeRepo(repoPath);
  await saveGraph(repoId, nodes, edges);
  console.log(`Saved ${nodes.length} nodes, ${edges.length} edges for repo "${repoId}"`);

  if (key) {
    const callers = await findCallers(repoId, key);
    console.log(`\nWho reaches ${key}:`);
    callers
      .sort((a, b) => a.depth - b.depth)
      .forEach((c) => console.log(`  depth ${c.depth}: ${c.from} -[${c.type}]-> ${c.to}`));
  }
  process.exit(0);
})();