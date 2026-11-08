const connectDB = require("./db");
const { retrieve } = require("./retrieve");
(async () => {
  await connectDB();
  const { hits } = await retrieve(process.argv[2], process.argv[3], 10, 0);
  hits.forEach((h) => console.log(h.score.toFixed(3), h.key, "\n   ", h.summary));
  process.exit(0);
})();