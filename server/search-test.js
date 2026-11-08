const connectDB = require("./db");
const { GNode } = require("./models");
const { embed } = require("./embed");

(async () => {
  await connectDB();
  const query = process.argv[2] || "how does dark mode work";
  const vec = await embed(query);

  const results = await GNode.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: vec,
        numCandidates: 50,
        limit: 5,
        filter: { repoId: "portfolio" },
      },
    },
    { $project: { key: 1, summary: 1, score: { $meta: "vectorSearchScore" } } },
  ]);

  results.forEach((r) => console.log(r.score.toFixed(3), r.key, "\n   ", r.summary));
  process.exit(0);
})();