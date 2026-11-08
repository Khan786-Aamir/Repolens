const { GNode, GEdge } = require("./models");

async function saveGraph(repoId, nodes, edges) {
  await GNode.deleteMany({ repoId });
  await GEdge.deleteMany({ repoId });
  await GNode.insertMany(nodes.map((n) => ({ ...n, repoId })), { ordered: false });
  await GEdge.insertMany(edges.map((e) => ({ ...e, repoId })), { ordered: false });
}

// key ko kaun-kaun call/render karta hai (upar ki taraf)
// (maxDepth = extra hops)
async function findCallers(repoId, key, maxDepth = 2) {
  const res = await GNode.aggregate([
    { $match: { repoId, key } },
    {
      $graphLookup: {
        from: GEdge.collection.name,
        startWith: "$key",
        connectFromField: "from",
        connectToField: "to",
        as: "callers",
        maxDepth,
        depthField: "depth",
        restrictSearchWithMatch: { repoId, type: { $in: ["CALLS", "RENDERS"] } },
      },
    },
  ]);
  return res[0] ? res[0].callers : [];
}

// key kisko call/render karta hai (neeche ki taraf)
async function findCallees(repoId, key, maxDepth = 1) {
  const res = await GNode.aggregate([
    { $match: { repoId, key } },
    {
      $graphLookup: {
        from: GEdge.collection.name,
        startWith: "$key",
        connectFromField: "to",
        connectToField: "from",
        as: "callees",
        maxDepth,
        depthField: "depth",
        restrictSearchWithMatch: { repoId, type: { $in: ["CALLS", "RENDERS"] } },
      },
    },
  ]);
  return res[0] ? res[0].callees : [];
}

module.exports = { saveGraph, findCallers, findCallees };