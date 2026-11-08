export default function Landing() {
  return (
    <main className="landing">
      <section className="hero">
        <span className="pill">GraphRAG for code</span>
        <h1>
          Stop scrolling through code.
          <br />
          <span className="grad">Ask your repo.</span>
        </h1>
        <p>
          Paste any public GitHub repository and get answers that understand how your
          functions call each other, not just which files look similar.
        </p>
        <div className="cta-row">
          <a className="btn primary" href="#app">Launch the analyzer →</a>
          <a className="btn ghost" href="#how">See how it works</a>
        </div>
        <div className="proof">
          <div><b>54% → 100%</b><span>multi-hop recall vs plain RAG (my 38-question eval)</span></div>
          <div><b>Cited</b><span>every answer points to real files and functions</span></div>
          <div><b>Live graph</b><span>see exactly what was retrieved</span></div>
        </div>
      </section>

      <section id="how" className="section">
        <h2>How it works</h2>
        <div className="grid3">
          <div className="card"><div className="num">1</div><h3>Paste a repo URL</h3>
            <p>RepoLens clones it and parses every file into functions, components and their relationships.</p></div>
          <div className="card"><div className="num">2</div><h3>Build the graph</h3>
            <p>Imports, calls and component renders become a knowledge graph. Each function is summarized and embedded.</p></div>
          <div className="card"><div className="num">3</div><h3>Ask anything</h3>
            <p>Vector search finds the right code, graph traversal pulls in callers and callees, and the answer comes with sources.</p></div>
        </div>
      </section>

      <section id="features" className="section">
        <h2>Why it is different</h2>
        <div className="grid3">
          <div className="card"><h3>Impact analysis</h3>
            <p>“If I change this function, what breaks?” Plain similarity search cannot answer that. A graph can.</p></div>
          <div className="card"><h3>Interactive graph</h3>
            <p>Retrieved nodes light up. Click any node to read its summary.</p></div>
          <div className="card"><h3>Honest by design</h3>
            <p>Answers cite their sources so you can verify them. Limits are documented, not hidden.</p></div>
        </div>
        <div className="cta-row center">
          <a className="btn primary" href="#app">Try it on a repo</a>
        </div>
      </section>
    </main>
  );
}