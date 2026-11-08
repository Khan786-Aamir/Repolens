const { analyzeRepo } = require("./parser");

const repoPath = process.argv[2];
if (!repoPath) { console.log("Usage: node analyze-test.js <repo-path>"); process.exit(1); }

const { nodes, edges } = analyzeRepo(repoPath);
const count = (arr, t) => arr.filter((x) => x.type === t).length;

console.log("Nodes:", nodes.length,
  `(File ${count(nodes, "File")}, Function ${count(nodes, "Function")}, Class ${count(nodes, "Class")}, Package ${count(nodes, "Package")})`);
console.log("Edges:", edges.length,
  `(IMPORTS ${count(edges, "IMPORTS")}, DEFINES ${count(edges, "DEFINES")}, CALLS ${count(edges, "CALLS")})`);
console.log("\nSample CALLS edges:");
edges.filter((e) => e.type === "CALLS").slice(0, 10).forEach((e) => console.log(" ", e.from, "->", e.to));