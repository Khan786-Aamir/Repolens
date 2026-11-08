# RepoLens: GraphRAG for code

Ask questions about any public JavaScript/React GitHub repo. RepoLens parses the code into a call/render graph, then answers using **vector search + graph traversal**, with citations to real files and functions.

**Live demo:** https://repolens-wyhu.onrender.com
**API:** https://repolens-api-p26e.onrender.com/api/health

> Hosted on Render's free tier. The API sleeps after 15 minutes of inactivity, so the first question can take 30-60 seconds.

## Why a graph?

Plain vector RAG finds code that *looks similar* to the question. It struggles with questions like:

- "If I change `applyTheme`, what is affected?"
- "What renders this component, and what is above it?"

The answers are spread across several functions and are not written in any single summary. A code graph (who calls / renders whom) makes them answerable.

## Features

- Paste a public GitHub URL and get a queryable knowledge graph of the repo
- Hybrid retrieval: vector search first, then graph expansion (callers and callees)
- Answers cite file paths and function names so they can be verified
- Interactive graph: retrieved nodes are highlighted, click any node to read its summary
- Analyze any public JS/JSX repo on demand (when running the API with enough Gemini quota)

## How it works

```
GitHub URL
   │  git clone
   ▼
Babel AST parser ──► nodes: File, Function, Class, Package
                     edges: IMPORTS, DEFINES, CALLS, RENDERS
   │
   ▼
MongoDB Atlas  ◄── Gemini one-line summary per function
   │              ◄── local embeddings (all-MiniLM-L6-v2, 384 dims)
   │
Question ─► query expansion (Gemini) ─► Atlas Vector Search (top-K)
                                          │
                                          ▼
                              graph expansion ($graphLookup: callers + callees)
                                          │
                                          ▼
                          Gemini answer with file/function citations
```

## Tech stack

React (Vite), Node.js, Express, MongoDB Atlas (Vector Search, `$graphLookup`), `@babel/parser`, Transformers.js (local embeddings), Gemini API, `react-force-graph-2d`. Deployed on Render (Static Site + Web Service).

## Evaluation

Retrieval recall on manually labeled questions: does the retrieved set contain the nodes needed to answer? Vector-only RAG vs. vector + graph expansion.

| Repo | Questions | Single-hop (vector / graph) | Multi-hop (vector / graph) |
|---|---|---|---|
| Portfolio (React) | 26 (16 single, 10 multi) | 97% / 97% | 52% / 100% |
| Krishimitra (MERN) | 12 (9 single, 3 multi) | 100% / 100% | 61% / 100% |
| **Combined multi-hop** | **13** | | **~54% / 100%** |

**Reading these numbers honestly**

- Single-hop: graph expansion neither helps nor hurts.
- Multi-hop (impact analysis, "what renders X"): graph expansion lifts recall from ~54% to 100%.
- Multi-hop labels were checked against edges that exist in the graph, so the 100% is optimistic. The sample is small (38 questions, 2 repos).
- The metric is **retrieval recall**, not answer quality.
- Indexing the full Krishimitra repo made one single-hop question fail (the right function ranked 10th with very close scores). Query expansion fixed it, at the cost of one extra LLM call per query, and slightly hurt one portfolio question.

## Run locally

Requirements: Node 20+, git, a MongoDB Atlas cluster, a Gemini API key.

```bash
# server
cd server
npm install
# create server/.env with:
#   MONGO_URI=your_atlas_connection_string
#   GEMINI_API_KEY=your_key
npm start                # http://localhost:5000

# client
cd client
npm install
# optional: VITE_API_URL=http://localhost:5000
npm run dev              # http://localhost:5173
```

Create an Atlas **Vector Search index** named `vector_index` on the `gnodes` collection:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
    { "type": "filter", "path": "repoId" }
  ]
}
```

Open the app, paste a public GitHub URL and click **Analyze**.

## Run the evaluation

```bash
cd server
node eval.js portfolio eval-questions.json
node eval.js <repoId> <questions.json>
```

## Project structure

```
client/   React app: landing page, analyzer UI, graph view
server/   Express API, parser, graph queries, retrieval, ingestion, eval scripts
```

## Limitations

- Only `.js`, `.jsx`, `.mjs` files are parsed. TypeScript and Python repos are not supported.
- The parser captures `foo()` calls and `<Component />` renders. It does not capture Express route wiring or `this.method()` calls, so backend call graphs are incomplete.
- Large repos are indexed in batches because of Gemini free-tier rate limits.
- Answers are LLM-generated and can be wrong even when retrieval is correct. Every answer cites its sources so it can be verified.
- No authentication or rate limiting: this is a demo, not production software. Anyone can trigger analysis, which can use up the free Gemini quota.
- Free-tier hosting means cold starts, and an exhausted Gemini quota pauses chat and analysis.

## Author

Aamir Khan · [GitHub](https://github.com/Khan786-Aamir) · [LinkedIn](https://www.linkedin.com/in/aamir-khan-278b71317) 
· [X](https://x.com/AamirKhan453200)
