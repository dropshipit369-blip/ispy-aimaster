import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Theme initialiser – runs BEFORE first paint to avoid FOUC ──
(function initTheme() {
  const stored = localStorage.getItem('ispy-theme');
  // iSpy master defaults to dark tactical theme; light only when explicitly chosen
  if (stored === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    if (!stored) localStorage.setItem('ispy-theme', 'dark');
  }
})();

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW unavailable in dev – no action needed
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
