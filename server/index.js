require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const { GNode, GEdge } = require("./models");
const { retrieve } = require("./retrieve");
const { askGemini } = require("./llm");
const { ingestRepo, status } = require("./ingest");

// Repo ki stats (files, functions, packages) jo har prompt me jaayengi
async function getOverview(repoId) {
  const nodes = await GNode.find({ repoId }).select("type name filePath -_id").lean();
  const files = nodes.filter((n) => n.type === "File").map((n) => n.filePath);
  const count = (t) => nodes.filter((n) => n.type === t).length;
  const pkgs = nodes.filter((n) => n.type === "Package").map((n) => n.name);
  return (
    `REPO OVERVIEW (only .js/.jsx/.mjs files are analyzed):\n` +
    `- Files: ${files.length}\n` +
    `- Functions: ${count("Function")}\n` +
    `- Classes: ${count("Class")}\n` +
    `- npm packages used: ${pkgs.join(", ") || "none"}\n` +
    `- File list:\n${files.join("\n")}`
  );
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Graph visualization ke liye
app.get("/api/graph", async (req, res) => {
  try {
    const repoId = req.query.repoId || "portfolio";
    const nodes = await GNode.find({ repoId, type: { $ne: "Package" } })
      .select("key name type filePath summary -_id")
      .lean();
    const ids = new Set(nodes.map((n) => n.key));
    const edges = await GEdge.find({ repoId, type: { $in: ["CALLS", "RENDERS", "IMPORTS"] } })
      .select("from to type -_id")
      .lean();
    res.json({
      nodes: nodes.map((n) => ({ id: n.key, name: n.name, type: n.type, summary: n.summary })),
      links: edges
        .filter((e) => ids.has(e.from) && ids.has(e.to))
        .map((e) => ({ source: e.from, target: e.to, type: e.type })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sawaal-jawab
app.post("/api/ask", async (req, res) => {
  try {
    const { question, repoId = "portfolio" } = req.body;
    if (!question) return res.status(400).json({ error: "question required" });

    const { hits, graphEdges } = await retrieve(repoId, question);
    const overview = await getOverview(repoId);

    const context = hits
      .map((h) => `[${h.key}] (lines ${h.startLine}-${h.endLine})\nSummary: ${h.summary}\nCode:\n${h.code}`)
      .join("\n\n---\n\n");

    const prompt =
      `You are a code assistant for a GitHub repository. Always answer in English.\n` +
      `Start directly with the answer, never with phrases like "Based on the provided context". ` +
      `Keep it concise, use short bullet points, and put file paths in backticks.\n` +
      `Use the REPO OVERVIEW for questions about counts, files, packages or project structure. ` +
      `Use RELEVANT CODE and the CALL/RENDER GRAPH for questions about how the code works. ` +
      `Cite file paths and function names when you use them. ` +
      `If the answer is not in the provided context, say so clearly in English.\n\n` +
      `QUESTION: ${question}\n\n${overview}\n\n` +
      `RELEVANT CODE:\n${context || "(no matching functions found)"}\n\n` +
      `CALL/RENDER GRAPH (who calls/renders whom):\n${graphEdges.join("\n") || "(none)"}`;

    const answer = await askGemini(prompt);
    res.json({
      answer,
      nodes: hits.map((h) => ({ key: h.key, score: Number(h.score.toFixed(3)), summary: h.summary })),
      edges: graphEdges,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Naya repo analyze karna (GitHub URL se)
app.post("/api/ingest", async (req, res) => {
  try {
    const repoId = await ingestRepo(req.body.url);
    res.json({ repoId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Ingest ka progress
app.get("/api/status/:repoId", (req, res) =>
  res.json(status[req.params.repoId] || { state: "unknown" })
);

// Jo repos analyze ho chuke hain unki list
app.get("/api/repos", async (req, res) => {
  try {
    const ids = await GNode.distinct("repoId");
    res.json(ids);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5000;
connectDB().then(() =>
  app.listen(PORT, () => {
    console.log(`API on http://localhost:${PORT}`);
    // Embedding model pehle se load kar lo, taaki pehle visitor ko wait na karna pade
    require("./embed")
      .embed("warmup")
      .then(() => console.log("Embedding model ready"))
      .catch(console.error);
  })
);