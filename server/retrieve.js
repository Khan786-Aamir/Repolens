const { GNode } = require("./models");
const { embed } = require("./embed");
const { findCallers, findCallees } = require("./graph");
const { askGemini } = require("./llm");

// Sawaal ko technical keywords ke saath expand karna
// (jaise "hanging forever" -> "timeout, abort, promise, race")
async function expandQuery(q) {
  try {
    const kw = await askGemini(
      `List 6 short technical keywords/function-name hints (comma separated, no explanation) ` +
        `that a developer would look for in code to answer: "${q}"`
    );
    return `${q}. ${kw}`;
  } catch {
    return q; // Gemini fail ho to original query chalegi
  }
}

async function retrieve(repoId, question, topK = 5, minScore = 0.6) {
  const vec = await embed(await expandQuery(question));

  const raw = await GNode.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: vec,
        numCandidates: 100,
        limit: topK,
        filter: { repoId },
      },
    },
    {
      $project: {
        key: 1, name: 1, type: 1, filePath: 1, summary: 1, code: 1,
        startLine: 1, endLine: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  const hits = raw.filter((h) => h.score >= minScore);

  const graphEdges = [];
  for (const h of hits) {
    const callers = await findCallers(repoId, h.key, 1);
    const callees = await findCallees(repoId, h.key, 0);
    [...callers, ...callees].forEach((e) =>
      graphEdges.push(`${e.from} -[${e.type}]-> ${e.to}`)
    );
  }

  return { hits, graphEdges: [...new Set(graphEdges)] };
}

module.exports = { retrieve };