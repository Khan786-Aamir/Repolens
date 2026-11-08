require("dotenv").config();
const neo4j = require("neo4j-driver");

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

(async () => {
  const session = driver.session();
  await session.run(
    "MERGE (a:Concept {name:'express'}) MERGE (b:Concept {name:'middleware'}) MERGE (a)-[:HAS]->(b)"
  );
  const res = await session.run("MATCH (a)-[r]->(b) RETURN a.name, type(r), b.name");
  res.records.forEach(r => console.log(r.get(0), r.get(1), r.get(2)));
  await session.close();
  await driver.close();
})();