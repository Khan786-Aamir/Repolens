export const BRAND = "RepoLens";

const LINKS = {
  github: "https://github.com/Khan786-Aamir",
  twitter: "https://x.com/AamirKhan453200",
  linkedin: "https://www.linkedin.com/in/aamir-khan-278b71317",
};

const Icon = ({ d }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
);

const PATHS = {
  github:
    "M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.3 1 .1-.7.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.200-3.1-.1-.3-.5-1.500.1-3.100 0 0 1-.3 3.200 1.200a11 11 0 0 1 5.800 0C17 5.600 18 6 18 6c.6 1.600.2 2.800.1 3.100.8.8 1.200 1.800 1.200 3.100 0 4.400-2.700 5.400-5.300 5.700.4.4.8 1.100.8 2.200v3.200c0 .3.2.7.8.6A11.500 11.500 0 0 0 23.500 12C23.500 5.700 18.300.5 12 .5z",
  twitter:
    "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
};

export function Header({ onApp }) {
  return (
    <header className="site-header">
      <a href="#" className="brand">
        <span className="brand-mark">◈</span> {BRAND}
      </a>
      <nav>
        <a href="#how">How it works</a>
        <a href="#features">Features</a>
        <a href="#app" className={onApp ? "nav-cta active" : "nav-cta"}>
          {onApp ? "Analyzer" : "Launch app"}
        </a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <div className="brand">
          <span className="brand-mark">◈</span> {BRAND}
        </div>
        <p>Built by Aamir Khan · Vector search + code graph for your repos.</p>
      </div>
      <div className="socials">
        {Object.keys(LINKS).map((k) => (
          <a key={k} href={LINKS[k]} target="_blank" rel="noreferrer" aria-label={k} title={k}>
            <Icon d={PATHS[k]} />
          </a>
        ))}
      </div>
    </footer>
  );
}