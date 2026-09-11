import { hubHref } from "@/lib/base";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="container">
          <div className="nav__inner">
            <a href={hubHref} className="nav__logo">
              Duckingo <span>qr</span>
            </a>
          </div>
        </div>
      </nav>
      <main id="main-content" className="not-found-wrap" role="main">
        <div className="not-found-card">
          <div className="not-found-code">404</div>
          <h1>Page Not Found</h1>
          <p className="not-found-sub">The page you were looking for doesn't exist or may have been moved.</p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => setLocation("/")}>
              Back to Generator
            </button>
            <a href={hubHref} className="btn">
              Duckingo Home
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
