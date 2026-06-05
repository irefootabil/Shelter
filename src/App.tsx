import { appCopy, emergencyContent } from "./content";
import { shelterDataSource } from "./data/sourceMetadata";

const statusItems = [
  {
    label: "Offline",
    text: appCopy.status.offlineReady,
  },
  {
    label: "Manual",
    text: appCopy.status.manualFallback,
  },
  {
    label: "Privat",
    text: appCopy.status.localOnly,
  },
];

export function App() {
  return (
    <div className="app-frame">
      <header className="top-bar">
        <a className="brand-lockup" href="#top" aria-label={appCopy.productLabel}>
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>{appCopy.productLabel}</span>
        </a>
        <span className="network-pill">{statusItems[0].label}</span>
      </header>

      <main id="top" className="app-shell">
        <section className="hero" aria-labelledby="app-title">
          <p className="eyebrow">{appCopy.productLabel}</p>
          <h1 id="app-title">{appCopy.title}</h1>
          <p className="lead">{appCopy.subtitle}</p>
          <div className="hero-actions" aria-label="Actiuni principale">
            <a className="primary-action" href="#nearby">
              {appCopy.actions.findShelter}
            </a>
            <a className="secondary-action" href="#emergency">
              {appCopy.actions.emergencyGuide}
            </a>
          </div>
        </section>

        <section id="status" className="status-grid" aria-labelledby="status-title">
          <h2 id="status-title">{appCopy.status.title}</h2>
          <div className="status-cards">
            {statusItems.map((item) => (
              <article className="status-card" key={item.label}>
                <p className="card-kicker">{item.label}</p>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel location-panel" aria-labelledby="location-title">
          <div>
            <p className="card-kicker">{appCopy.sections.location.status}</p>
            <h2 id="location-title">{appCopy.sections.location.title}</h2>
            <p>{appCopy.sections.location.description}</p>
          </div>
          <div className="control-row">
            <button type="button" className="primary-action" disabled>
              {appCopy.actions.enableLocation}
            </button>
            <button type="button" className="secondary-action" disabled>
              {appCopy.actions.manualSearch}
            </button>
          </div>
          <p className="quiet-note">{appCopy.sections.location.fallback}</p>
        </section>

        <section id="nearby" className="panel shelter-panel" aria-labelledby="shelter-title">
          <div className="section-heading">
            <div>
              <p className="card-kicker">{appCopy.sections.shelter.status}</p>
              <h2 id="shelter-title">{appCopy.sections.shelter.title}</h2>
            </div>
            <span className="distance-placeholder">-- km</span>
          </div>
          <p>{appCopy.sections.shelter.description}</p>
          <div className="result-placeholder" aria-live="polite">
            <h3>{appCopy.sections.shelter.listTitle}</h3>
            <p>{appCopy.sections.shelter.listPlaceholder}</p>
          </div>
        </section>

        <section id="emergency" className="panel emergency-panel" aria-labelledby="emergency-title">
          <div className="section-heading">
            <div>
              <p className="card-kicker">{emergencyContent.title}</p>
              <h2 id="emergency-title">{appCopy.sections.emergency.title}</h2>
            </div>
            <a className="emergency-call" href="tel:112">
              {appCopy.actions.call112}
            </a>
          </div>
          <p>{appCopy.sections.emergency.description}</p>

          <div className="number-grid">
            {emergencyContent.numbers.map((number) => (
              <article className="number-card" key={number.id}>
                <strong>{number.number}</strong>
                <div>
                  <h3>{number.label}</h3>
                  <p>{number.action}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="instruction-list">
            {emergencyContent.instructionGroups.slice(0, 3).map((group) => (
              <article className="instruction-card" key={group.id}>
                <h3>{group.title}</h3>
                <p>{group.summary}</p>
              </article>
            ))}
          </div>

          <p className="quiet-note">{emergencyContent.disclaimer}</p>
        </section>

        <section className="source-panel" aria-labelledby="source-title">
          <h2 id="source-title">{appCopy.sections.source.title}</h2>
          <dl>
            <div>
              <dt>{appCopy.sections.source.reviewed}</dt>
              <dd>{shelterDataSource.vendoredAt}</dd>
            </div>
            <div>
              <dt>{appCopy.sections.source.official}</dt>
              <dd>
                <a href={shelterDataSource.officialPdfUrl}>{shelterDataSource.officialSourceName}</a>
              </dd>
            </div>
            <div>
              <dt>{appCopy.sections.source.repository}</dt>
              <dd>
                <a href={shelterDataSource.referenceRepositoryUrl}>mhlnu/adaposturi</a>
              </dd>
            </div>
          </dl>
          <p>{appCopy.sections.source.disclaimer}</p>
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Navigare principala">
        <a href="#status">{appCopy.navigation.status}</a>
        <a href="#nearby">{appCopy.navigation.shelter}</a>
        <a href="#emergency">{appCopy.navigation.emergency}</a>
      </nav>
    </div>
  );
}
