import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SUGGESTIONS = [
  "What does this project do?",
  "How many files are in this repo?",
  "Which npm packages are used?",
  "How does authentication work?",
  "If I change a core function, what is affected?",
];

const prettyRepo = (id) => id.replace("__", " / ");

export default function Analyzer() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [highlight, setHighlight] = useState(new Set());
  const [size, setSize] = useState({ w: 600, h: 500 });
  const [selected, setSelected] = useState(null);
  const [showImports, setShowImports] = useState(false);
  const [showFiles, setShowFiles] = useState(true);

  const [repoId, setRepoId] = useState("portfolio");
  const [repos, setRepos] = useState([]);
  const [url, setUrl] = useState("");
  const [ingestMsg, setIngestMsg] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const graphBox = useRef(null);
  const fgRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    setSelected(null);
    setHighlight(new Set());
    fetch(`${API}/api/graph?repoId=${encodeURIComponent(repoId)}`)
      .then((r) => r.json())
      .then(setGraph)
      .catch(console.error);
  }, [repoId]);

  useEffect(() => {
    fetch(`${API}/api/repos`).then((r) => r.json()).then(setRepos).catch(console.error);
  }, []);

  useEffect(() => {
    const update = () => {
      if (graphBox.current)
        setSize({ w: graphBox.current.clientWidth, h: graphBox.current.clientHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const data = useMemo(() => {
    const nodes = showFiles ? graph.nodes : graph.nodes.filter((n) => n.type !== "File");
    const ids = new Set(nodes.map((n) => n.id));
    const idOf = (x) => (typeof x === "object" ? x.id : x);
    const links = graph.links.filter(
      (l) =>
        (showImports || l.type !== "IMPORTS") && ids.has(idOf(l.source)) && ids.has(idOf(l.target))
    );
    return { nodes, links };
  }, [graph, showImports, showFiles]);

  const stats = useMemo(() => {
    const c = (t) => graph.nodes.filter((n) => n.type === t).length;
    return { files: c("File"), fns: c("Function"), classes: c("Class"), links: graph.links.length };
  }, [graph]);

  async function analyze(e) {
    e.preventDefault();
    if (!url.trim() || analyzing) return;
    setAnalyzing(true);
    setIngestMsg("Starting...");
    try {
      const r = await fetch(`${API}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await r.json();
      if (d.error) {
        setIngestMsg("Error: " + d.error);
        setAnalyzing(false);
        return;
      }
      const timer = setInterval(async () => {
        try {
          const s = await (await fetch(`${API}/api/status/${d.repoId}`)).json();
          setIngestMsg(s.message || s.state);
          if (s.state === "done" || s.state === "error") {
            clearInterval(timer);
            setAnalyzing(false);
            if (s.state === "done") {
              setRepos((x) => [...new Set([...x, d.repoId])]);
              setRepoId(d.repoId);
              setMessages([]);
              setUrl("");
            }
          }
        } catch (err) {
          clearInterval(timer);
          setAnalyzing(false);
          setIngestMsg("Error: " + err.message);
        }
      }, 3000);
    } catch (err) {
      setIngestMsg("Error: " + err.message);
      setAnalyzing(false);
    }
  }

  async function send(q) {
    q = q.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, repoId }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMessages((m) => [...m, { role: "bot", text: d.answer, nodes: d.nodes, edges: d.edges }]);
      const keys = new Set(d.nodes.map((n) => n.key));
      setHighlight(keys);
      // retrieved node par zoom
      const target = graph.nodes.find((n) => keys.has(n.id) && n.x !== undefined);
      if (target && fgRef.current) {
        fgRef.current.centerAt(target.x, target.y, 800);
        fgRef.current.zoom(3, 800);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: "Error: " + err.message }]);
    }
    setLoading(false);
  }

  // Light theme ke liye graph colors
  const color = (n) =>
    highlight.has(n.id)
      ? "#f59e0b"
      : n.type === "File"
      ? "#2563eb"
      : n.type === "Class"
      ? "#db2777"
      : "#059669";

  return (
    <div className="app">
      <aside className="chat">
        <header>
          <h1>
            <span className="logo">◈</span> GraphRAG Repo Analyzer
          </h1>
          <p className="sub">Vector search + call graph over any public JS/React repo.</p>
        </header>

        <form className="row" onSubmit={analyze}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
          />
          <button disabled={analyzing}>{analyzing ? "Working..." : "Analyze"}</button>
        </form>
        {ingestMsg && <div className="status">{ingestMsg}</div>}

        <select
          value={repoId}
          onChange={(e) => {
            setRepoId(e.target.value);
            setMessages([]);
          }}
        >
          {repos.map((r) => (
            <option key={r} value={r}>
              {prettyRepo(r)}
            </option>
          ))}
        </select>

        <div className="stats">
          <span><b>{stats.files}</b> files</span>
          <span><b>{stats.fns}</b> functions</span>
          <span><b>{stats.classes}</b> classes</span>
          <span><b>{stats.links}</b> edges</span>
        </div>

        <div className="messages">
          {messages.length === 0 && (
            <div className="empty">
              <p>Ask anything about <b>{prettyRepo(repoId)}</b>:</p>
              <div className="chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === "bot" ? (
                <div className="md">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              ) : (
                m.text
              )}
              {m.nodes && m.nodes.length > 0 && (
                <details>
                  <summary>
                    Sources ({m.nodes.length}) · graph edges ({m.edges.length})
                  </summary>
                  <ul>
                    {m.nodes.map((n) => (
                      <li key={n.key}>
                        <code>{n.key}</code>
                        <span className="score">{n.score}</span>
                      </li>
                    ))}
                  </ul>
                  {m.edges.length > 0 && <pre>{m.edges.join("\n")}</pre>}
                </details>
              )}
            </div>
          ))}

          {loading && (
            <div className="msg bot">
              <span className="dots"><i /><i /><i /></span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            send(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about the repo..."
          />
          <button disabled={loading}>Ask</button>
        </form>
      </aside>

      <main className="graph" ref={graphBox}>
        <div className="toolbar">
          <div className="legend">
            <span style={{ color: "#2563eb" }}>● File</span>
            <span style={{ color: "#059669" }}>● Function</span>
            <span style={{ color: "#db2777" }}>● Class</span>
            <span style={{ color: "#f59e0b" }}>● Retrieved</span>
          </div>
          <label>
            <input type="checkbox" checked={showFiles} onChange={(e) => setShowFiles(e.target.checked)} />
            Files
          </label>
          <label>
            <input type="checkbox" checked={showImports} onChange={(e) => setShowImports(e.target.checked)} />
            Imports
          </label>
          <button className="ghost" onClick={() => fgRef.current?.zoomToFit(600, 40)}>
            Fit
          </button>
        </div>

        {selected && (
          <div className="node-card">
            <button className="close" onClick={() => setSelected(null)}>×</button>
            <div className="tag">{selected.type}</div>
            <code>{selected.id}</code>
            <p>{selected.summary || "No summary (not indexed)."}</p>
          </div>
        )}

        <ForceGraph2D
          ref={fgRef}
          width={size.w}
          height={size.h}
          graphData={data}
          backgroundColor="#efece1"
          nodeColor={color}
          nodeLabel={(n) => `${n.name} (${n.type})`}
          nodeRelSize={4}
          onNodeClick={(n) => setSelected(n)}
          linkColor={(l) => (l.type === "IMPORTS" ? "#c9c4b3" : "#0f1a3a")}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          cooldownTicks={120}
        />
      </main>
    </div>
  );
}