const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { analyzeRepo } = require("./parser");
const { saveGraph } = require("./graph");
const { GNode } = require("./models");
const { embed } = require("./embed");
const { askGemini } = require("./llm");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function repoIdFromUrl(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/.\s]+)/i);
  if (!m) return null;
  return `${m[1]}__${m[2]}`.toLowerCase();
}

function clone(url, dest) {
  return new Promise((resolve, reject) => {
    execFile("git", ["clone", "--depth", "1", url, dest], { timeout: 120000 }, (err) =>
      err ? reject(new Error("git clone failed: " + err.message)) : resolve()
    );
  });
}

const status = {}; // repoId -> { state, message }

async function ingestRepo(url, maxSummaries = 60) {
  const repoId = repoIdFromUrl(url);
  if (!repoId) throw new Error("Invalid GitHub URL");
  status[repoId] = { state: "running", message: "Cloning..." };

  (async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
    try {
      await clone(url, tmp);
      status[repoId].message = "Parsing code...";
      const { nodes, edges } = analyzeRepo(tmp);
      await saveGraph(repoId, nodes, edges);

      const fns = await GNode.find({ repoId, type: { $in: ["Function", "Class"] } }).limit(maxSummaries);
      let i = 0;
      for (const n of fns) {
        i++;
        status[repoId].message = `Summarizing ${i}/${fns.length}...`;
        try {
          const s = await askGemini(
            `In ONE short English sentence, what does this ${n.type} (${n.name}, file ${n.filePath}) do? ` +
              `Only the sentence.\n\n${n.code}`
          );
          n.summary = s;
        } catch (e) {
          n.summary = `${n.type} ${n.name}`; // fallback
        }
        n.embedding = await embed(`${n.type} ${n.name} in ${n.filePath}: ${n.summary}`);
        await n.save();
        await sleep(3000);
      }
      status[repoId] = { state: "done", message: `Done: ${nodes.length} nodes, ${edges.length} edges` };
    } catch (e) {
      status[repoId] = { state: "error", message: e.message };
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  })();

  return repoId;
}

module.exports = { ingestRepo, status };