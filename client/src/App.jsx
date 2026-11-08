import { useEffect, useState } from "react";
import Landing from "./Landing";
import Analyzer from "./Analyzer";
import { Header, Footer } from "./Chrome";
import "./site.css";

const read = () => (window.location.hash === "#app" ? "app" : "home");

export default function App() {
  const [page, setPage] = useState(read());

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === "#app" || h === "" || h === "#") {
        setPage(read());
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isApp = page === "app";

  return (
    <div className={`site ${isApp ? "app-mode" : ""}`}>
      <Header onApp={isApp} />
      {isApp ? (
        <div className="app-wrap">
          <Analyzer />
        </div>
      ) : (
        <>
          <Landing />
          <Footer />
        </>
      )}
    </div>
  );
}