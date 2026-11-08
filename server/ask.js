require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();
const connectDB = require("./db");
const { retrieve } = require("./retrieve");

const MODEL = "gemini-flash-lite-latest";

async function askGemini(prompt) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(30000),
    }
  );
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.candidates[0].content.parts[0].text.trim();
}

(async () => {
  await connectDB();
  const question = process.argv[2] || "how does dark mode work";
  const { hits, graphEdges } = await retrieve("portfolio", question);

  const context = hits
    .map((h) => `[${h.key}] (lines ${h.startLine}-${h.endLine})\nSummary: ${h.summary}\nCode:\n${h.code}`)
    .join("\n\n---\n\n");

  const prompt =
    `You are a code assistant. Answer the question using ONLY the context below. ` +
    `Cite the file path and function names you used. Answer in English.\n\n` +
    `QUESTION: ${question}\n\n` +
    `RELEVANT CODE:\n${context}\n\n` +
    `CALL/RENDER GRAPH (who calls/renders whom):\n${graphEdges.join("\n")}`;

  console.log("\n=== Retrieved nodes ===");
  hits.forEach((h) => console.log(" -", h.key));
  console.log("\n=== Graph edges ===");
  graphEdges.forEach((e) => console.log(" ", e));
  console.log("\n=== Answer ===\n" + (await askGemini(prompt)));
  process.exit(0);
})();