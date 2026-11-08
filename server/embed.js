let extractor;

async function getExtractor() {
  if (!extractor) {
    const { pipeline } = await import("@xenova/transformers");
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

// text -> 384 numbers
async function embed(text) {
  const ex = await getExtractor();
  const out = await ex(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

module.exports = { embed };