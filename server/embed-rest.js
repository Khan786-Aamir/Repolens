const connectDB = require("./db");
const { GNode } = require("./models");
const { embed } = require("./embed");
const { askGemini } = require("./llm");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await connectDB();
  const repoId = process.argv[2];
  const limit = Number(process.argv[3] || 100);
  if (!repoId) {
    console.log("Usage: node embed-rest.js <repoId> [limit]");
    process.exit(1);
  }

  const todo = await GNode.find({
    repoId,
    type: { $in: ["Function", "Class"] },
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
  }).limit(limit);

  console.log(`${todo.length} nodes to process`);
  let i = 0;
  for (const n of todo) {
    i++;
    try {
      n.summary = await askGemini(
        `In ONE short English sentence, what does this ${n.type} (${n.name}, file ${n.filePath}) do? Only the sentence.\n\n${n.code}`
      );
    } catch (e) {
      n.summary = `${n.type} ${n.name}`;
    }
    n.embedding = await embed(`${n.type} ${n.name} in ${n.filePath}: ${n.summary}`);
    await n.save();
    console.log(`${i}/${todo.length} ${n.key}`);
    await sleep(3000);
  }
  console.log("Done");
  process.exit(0);
})();