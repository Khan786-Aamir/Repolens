require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const { GNode } = require("./models");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-flash-lite-latest"; 

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function summarizeOne(n) {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents:
      `Is ${n.type} (file: ${n.filePath}, naam: ${n.name}) ka kaam 1 chhote English sentence mein batao. ` +
      `Sirf sentence likho.\n\n${n.code}`,
  });
  return res.text.trim();
}

async function summarizeRepo(repoId) {
  const todo = await GNode.find({
    repoId,
    type: { $in: ["Function", "Class"] },
    summary: { $in: [null, ""] },
  });
  console.log(`${todo.length} nodes to summarize`);

  for (const n of todo) {
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        n.summary = await summarizeOne(n);
        await n.save();
        console.log(`✓ ${n.key}: ${n.summary}`);
        done = true;
      } catch (e) {
        console.warn(`✗ ${n.key} (try ${attempt}): ${e.message}`);
        await sleep(attempt * 10000);
      }
    }
    await sleep(4000);
  }
}

module.exports = { summarizeRepo };