const connectDB = require("./db");

connectDB()
  .then(() => process.exit(0))
  .catch((e) => { console.error("Mongo error:", e.message); process.exit(1); });