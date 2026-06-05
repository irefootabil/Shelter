import { appCopy } from "./content/appCopy";

const statusItems = [
  appCopy.status.offlineReady,
  appCopy.status.manualFallback,
  appCopy.status.localOnly,
];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <p className="eyebrow">{appCopy.productLabel}</p>
        <h1 id="app-title">{appCopy.title}</h1>
        <p className="lead">{appCopy.subtitle}</p>
      </section>

      <section className="status-panel" aria-labelledby="status-title">
        <h2 id="status-title">{appCopy.status.title}</h2>
        <ul>
          {statusItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
