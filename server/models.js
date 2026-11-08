const mongoose = require("mongoose");

const NodeSchema = new mongoose.Schema({
  repoId: { type: String, index: true },
  key: String,
  type: { type: String, enum: ["File", "Function", "Class", "Package"] },
  name: String,
  filePath: String,
  startLine: Number,
  endLine: Number,
  code: String,
  summary: String,
  embedding: [Number],
});
NodeSchema.index({ repoId: 1, key: 1 }, { unique: true });

const EdgeSchema = new mongoose.Schema({
  repoId: { type: String, index: true },
  from: String,
  to: String,
  type: { type: String, enum: ["IMPORTS", "CALLS", "DEFINES", "RENDERS"] },
});
EdgeSchema.index({ repoId: 1, from: 1, to: 1, type: 1 }, { unique: true });

module.exports = {
  GNode: mongoose.model("GNode", NodeSchema),
  GEdge: mongoose.model("GEdge", EdgeSchema),
};