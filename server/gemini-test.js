require("dotenv").config();

const MODEL = "gemini-flash-latest"; // Step 1 ki list se naam daalo (bina "models/" ke)

(async () => {
  console.log("Calling Gemini...");
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say hello in one short sentence." }] }],
        }),
        signal: AbortSignal.timeout(30000),
      }
    );
    const j = await r.json();
    console.log(j.error ? "ERROR: " + j.error.message : "Reply: " + j.candidates[0].content.parts[0].text);
  } catch (e) {
    console.log("FAIL:", e.name, e.message);
  }
  process.exit(0);
})();