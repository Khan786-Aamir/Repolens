const fs = require("fs");
const connectDB = require("./db");
const { GNode } = require("./models");

(async () => {
  await connectDB();
  const repoId = process.argv[2] || "khan786-aamir__krishimitra-ai";

  const nodes = await GNode.find({ repoId, type: { $ne: "Package" } })
    .select("key type summary embedding -_id")
    .lean();

  const lines = nodes
    .map((n) => {
      const indexed = n.embedding && n.embedding.length > 0;
      return `${indexed ? "[indexed]    " : "[not indexed]"} ${n.type.padEnd(8)} ${n.key}`;
    })
    .sort((a, b) => a.localeCompare(b));

  const indexedCount = nodes.filter((n) => n.embedding && n.embedding.length > 0).length;
  const out = `${repoId}: ${nodes.length} nodes, ${indexedCount} indexed\n\n` + lines.join("\n");

  const file = `keys-${repoId}.txt`;
  fs.writeFileSync(file, out, "utf8");
  console.log(`Saved ${file} (${nodes.length} nodes, ${indexedCount} indexed)`);
  process.exit(0);
})();