const connectDB = require("./db");
const { GNode } = require("./models");
const { embed } = require("./embed");

(async () => {
  await connectDB();
  const repoId = process.argv[2] || "portfolio";
  const nodes = await GNode.find({ repoId, summary: { $nin: [null, ""] } });
  console.log(`${nodes.length} nodes to embed`);

  for (const n of nodes) {
    const text = `${n.type} ${n.name} in ${n.filePath}: ${n.summary}`;
    n.embedding = await embed(text);
    await n.save();
  }
  console.log("Done. Embedding size:", nodes[0].embedding.length);
  process.exit(0);
})();