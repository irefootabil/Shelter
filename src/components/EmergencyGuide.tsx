import { ChevronDown, ExternalLink, Phone } from "lucide-react";
import { appCopy, emergencyContent } from "../content";

export function EmergencyGuide() {
  return (
    <section id="emergency" className="emergency-guide" aria-labelledby="emergency-title">
      <h2 id="emergency-title">{emergencyContent.title}</h2>
      <a className="emergency-call" href="tel:112">
        <Phone size={20} aria-hidden="true" />
        {appCopy.actions.call112}
      </a>
      <p>{emergencyContent.intro}</p>

      <div className="emergency-contacts">
        {emergencyContent.numbers.map((number) => (
          <article className="emergency-contact" key={number.id} aria-labelledby={`${number.id}-title`}>
            <div className="emergency-contact-heading">
              <strong>{number.number}</strong>
              <h3 id={`${number.id}-title`}>{number.label}</h3>
            </div>
            <p>{number.description}</p>
            <p>{number.availability}</p>
            {number.number === "112" ? <p>{number.action}</p> : null}
          </article>
        ))}
      </div>

      <div className="emergency-instructions">
        {emergencyContent.instructionGroups.map((group, index) => (
          <details className="emergency-instruction" key={group.id} open={index === 0}>
            <summary>
              <span>
                <span className="instruction-title">{group.title}</span>
                <span className="instruction-summary">{group.summary}</span>
              </span>
              <ChevronDown className="instruction-chevron" size={20} aria-hidden="true" />
            </summary>
            <ol>
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </details>
        ))}
      </div>

      <p className="quiet-note">{emergencyContent.disclaimer}</p>
      <p className="emergency-reviewed">{emergencyContent.reviewedLabel}: {emergencyContent.lastReviewed}</p>
      <ul className="emergency-sources">
        {emergencyContent.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url}>
              {source.label}
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <p>{emergencyContent.externalLinksNote}</p>
    </section>
  );
}
