const fs = require("fs");
const connectDB = require("./db");
const { GNode, GEdge } = require("./models");

(async () => {
  await connectDB();
  const repo = process.argv[2];
  const file = process.argv[3];
  const qs = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const item of qs) {
    const keys = item.expected;
    const found = await GNode.find({ repoId: repo, key: { $in: keys } }).distinct("key");
    const missing = keys.filter((k) => !found.includes(k));
    console.log(`\n[${item.type}] ${item.q}`);
    if (missing.length) console.log("  MISSING KEYS:", missing);
    if (item.type === "multi") {
      const edges = await GEdge.find({
        repoId: repo,
        type: { $in: ["CALLS", "RENDERS"] },
        from: { $in: keys },
        to: { $in: keys },
      }).lean();
      if (edges.length === 0) console.log("  NO CALLS/RENDERS EDGE between expected nodes (label likely wrong)");
      edges.forEach((e) => console.log(`  ${e.from} -[${e.type}]-> ${e.to}`));
    }
  }
  process.exit(0);
})();