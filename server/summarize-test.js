const connectDB = require("./db");
const { summarizeRepo } = require("./summarize");

(async () => {
  await connectDB();
  await summarizeRepo(process.argv[2] || "portfolio");
  process.exit(0);
})();