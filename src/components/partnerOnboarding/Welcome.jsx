import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./parts.jsx";
import { useOnboardingText } from "./onboardingText.js";
import "./welcome.css";

// Start screen of the partner wizard: a short pitch, a live preview of a
// listing assembling itself, then what the wizard asks for and what the
// owner's cabinet gives back.

// The preview runs on ticks; each element shows from its tick onwards.
const TICK_MS = 900;
const LAST_TICK = 14;
const STAGE_FROM = [1, 5, 7, 8, 10];
const PHOTO_TILES = ["desk", "coffee", "sofa", "meeting"];

function usePreviewTick(stageRef, { last = LAST_TICK, ms = TICK_MS, still = 11 } = {}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setTick(still);
      return undefined;
    }
    let timer = null;
    const start = () => {
      if (!timer) timer = setInterval(() => setTick((value) => (value >= last ? 0 : value + 1)), ms);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    // Runs only while the preview is on screen.
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    if (stageRef.current) observer.observe(stageRef.current);
    return () => {
      stop();
      observer.disconnect();
    };
  }, [stageRef, last, ms, still]);

  return tick;
}

// "Three steps" block: each step has a small live scene that plays in turn.
// Step 1 ticks 1-5, step 2 ticks 6-10, step 3 ticks 11-15, then a short hold.
const HOW_LAST_TICK = 18;
const HOW_TICK_MS = 700;
const HOW_STEP_FROM = [1, 6, 11];
const HOW_PHOTOS = ["desk", "coffee", "sofa"];

function HowSteps() {
  const { t } = useOnboardingText();
  const w = t.welcome;
  const s = w.scenes;
  const listRef = useRef(null);
  const tick = usePreviewTick(listRef, { last: HOW_LAST_TICK, ms: HOW_TICK_MS, still: HOW_LAST_TICK });
  const on = (from) => (tick >= from ? " is-on" : "");
  const active = HOW_STEP_FROM.reduce((current, from, index) => (tick >= from ? index : current), -1);
  const published = tick >= 13;

  const scenes = [
    <div className="pw-scene pw-scene-place" key="place">
      <div className="pw-s-map">
        <i /><i /><i />
        <span className={`pw-s-pin${on(1)}`}><Icon name="pin" /></span>
      </div>
      <div className="pw-s-side">
        <div className="pw-s-photos">
          {HOW_PHOTOS.map((icon, index) => (
            <span key={icon} className={`pw-s-photo pw-s-photo-${index + 1}${on(2 + index)}`}><Icon name={icon} /></span>
          ))}
        </div>
        <strong className={`pw-s-type${on(4)}`}>{s.title}</strong>
        <small className={`pw-s-fade${on(5)}`}>{s.address}</small>
      </div>
    </div>,
    <div className="pw-scene pw-scene-terms" key="terms">
      {s.rows.map(([label, value], index) => (
        <div key={label} className={`pw-s-row${on(6 + index * 1.5)}`}>
          <i className="pw-s-switch" />
          <span>{label}</span>
          <b>{value}</b>
        </div>
      ))}
    </div>,
    <div className="pw-scene pw-scene-review" key="review">
      <div className={`pw-s-card${on(11)}`}>
        <span className="pw-s-thumb"><Icon name="desk" /></span>
        <span className="pw-s-card-text">
          <strong>{s.title}</strong>
          <span className={`pw-s-status${published ? " is-live" : ""}`}>
            {published ? <Icon name="check" /> : <i className="pw-s-spin" />}
            {published ? s.published : s.checking}
          </span>
        </span>
      </div>
      <div className={`pw-s-toast${on(15)}`}>
        <span className="pw-s-toast-icon"><Icon name="bell" /></span>
        <span><strong>{s.request}</strong><small>{s.requestTime}</small></span>
      </div>
    </div>,
  ];

  return (
    <ol className="pw-how" ref={listRef}>
      {w.how.map((item, index) => (
        <li key={item.title} style={{ "--i": index }} className={index === active ? "is-active" : index < active ? "is-done" : undefined}>
          <b>{index < active ? <Icon name="check" /> : index + 1}</b>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
          <div className="pw-scene-wrap" aria-hidden="true">{scenes[index]}</div>
        </li>
      ))}
    </ol>
  );
}

function ListingPreview() {
  const { t } = useOnboardingText();
  const w = t.welcome;
  const stageRef = useRef(null);
  const tick = usePreviewTick(stageRef);
  const on = (from) => (tick >= from ? " is-on" : "");
  const activeLabel = STAGE_FROM.reduce((current, from, index) => (tick >= from ? index : current), -1);

  return (
    <div className="pw-stage" ref={stageRef} aria-hidden="true">
      <span className="pw-stage-glow" />

      <div className="pw-listing">
        <div className="pw-photos">
          {PHOTO_TILES.map((icon, index) => (
            <span key={icon} className={`pw-photo pw-photo-${index + 1}${on(index + 1)}`}>
              <Icon name={icon} />
            </span>
          ))}
        </div>
        <div className="pw-listing-body">
          <div className="pw-listing-top">
            <strong className={`pw-type${on(5)}`}>{w.previewTitle}</strong>
            <span className={`pw-status${tick >= 9 ? " is-live" : ""}${on(8)}`}>
              {tick >= 9 ? w.published : w.onModeration}
            </span>
          </div>
          <div className="pw-chips">
            <span className={`pw-chip${on(6)}`}>40 {t.sqm}</span>
            <span className={`pw-chip${on(6)}`}>{w.seats}</span>
            <span className={`pw-chip${on(6)}`}>Wi-Fi</span>
          </div>
          <div className={`pw-price${on(7)}`}>
            <b>{w.price}</b>
            <small>{w.perDay}</small>
          </div>
        </div>
      </div>

      <div className={`pw-toast${on(10)}`}>
        <span className="pw-toast-icon"><Icon name="bell" /></span>
        <span>
          <strong>{w.newRequest}</strong>
          <small>{w.requestTime}</small>
        </span>
      </div>

      <div className={`pw-income${on(11)}`}>
        <small>{w.income}</small>
        <strong>{w.incomeValue}</strong>
      </div>

      <ol className="pw-track">
        {w.stages.map((label, index) => (
          <li key={label} className={index < activeLabel ? "is-done" : index === activeLabel ? "is-active" : ""}>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PartnerWelcome({ onStart }) {
  const { t } = useOnboardingText();
  const w = t.welcome;
  const scrollToHow = () => document.getElementById("pw-how")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="pw">
      <section className="pw-hero">
        <div className="pw-copy">
          <span className="pow-eyebrow">{w.eyebrow}</span>
          <h1>{w.titleBefore}<em>Joyzone</em>{w.titleAfter}</h1>
          <p>{w.lead}</p>
          <ul className="pw-facts">
            <li><Icon name="clock" />{w.facts[0]}</li>
            <li><Icon name="shield" />{w.facts[1]}</li>
            <li><Icon name="users" />{w.facts[2]}</li>
          </ul>
          <div className="pw-actions">
            <button data-testid="onboarding-start" type="button" className="pow-start" onClick={onStart}>
              {w.start}<Icon name="chevronRight" />
            </button>
            <button type="button" className="pw-link" onClick={scrollToHow}>{w.howLink}</button>
          </div>
        </div>
        <ListingPreview />
      </section>

      <section className="pw-section" id="pw-how">
        <header className="pw-head">
          <span className="pow-eyebrow">{w.howEyebrow}</span>
          <h2>{w.howTitle}</h2>
        </header>
        <HowSteps />
      </section>

      <section className="pw-section pw-split">
        <div className="pw-panel">
          <header className="pw-head">
            <span className="pow-eyebrow">{w.needsEyebrow}</span>
            <h2>{w.needsTitle}</h2>
          </header>
          <ul className="pw-needs">
            {w.needs.map((item) => (
              <li key={item.title}>
                <span className="pw-icon"><Icon name={item.icon} /></span>
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pw-panel is-dark">
          <header className="pw-head">
            <span className="pow-eyebrow">{w.perksEyebrow}</span>
            <h2>{w.perksTitle}</h2>
          </header>
          <ul className="pw-perks">
            {w.perks.map((item) => (
              <li key={item.title}>
                <span className="pw-icon"><Icon name={item.icon} /></span>
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pw-final">
        <div>
          <h2>{w.finalTitle}</h2>
          <p>{w.finalText}</p>
        </div>
        <button type="button" className="pow-start" onClick={onStart}>
          {w.start}<Icon name="chevronRight" />
        </button>
      </section>
    </div>
  );
}
