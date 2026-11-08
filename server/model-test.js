require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
];

(async () => {
  for (const m of MODELS) {
    const t = Date.now();
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Say hello in one short sentence." }] }],
          }),
          signal: AbortSignal.timeout(20000),
        }
      );
      const j = await r.json();
      const out = j.error
        ? "ERROR " + j.error.code + ": " + j.error.message.slice(0, 120)
        : "OK -> " + j.candidates[0].content.parts[0].text.trim();
      console.log(`${m} (${Date.now() - t}ms): ${out}`);
    } catch (e) {
      console.log(`${m} (${Date.now() - t}ms): FAIL ${e.name}`);
    }
  }
  process.exit(0);
})();