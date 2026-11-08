require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();

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

module.exports = { askGemini };