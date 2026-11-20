import React from "react";

// Small animated pictures for the owners' promo page. Everything moves with
// CSS keyframes (see partnerPromoPage.css), so no timers run in JS.

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {[].concat(d).map((path) => <path key={path} d={path} />)}
    </svg>
  );
}

const ICONS = {
  check: "M20 6 9 17l-5-5",
  pin: ["M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  bell: ["M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.9 1.9 0 0 0 3.4 0"],
  shield: ["M12 3 20 6v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z", "m9 12 2 2 4-5"],
  up: ["M7 17 17 7", "M8 7h9v9"],
  star: "M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9Z",
};

const MOCK_PHOTOS = {
  main: "https://images.unsplash.com/photo-1631193816258-28b44b21e78b?auto=format&fit=crop&w=700&q=75",
  second: "https://images.unsplash.com/photo-1462826303086-329426d1aef5?auto=format&fit=crop&w=600&q=75",
};

// Hero picture: a listings account window with a real photo, a growing views
// chart and requests that keep arriving; two small cards float around it.
export function PromoHeroMock({ m }) {
  return (
    <div className="op-mock" aria-hidden="true">
      <span className="op-mock-blob is-orange" />
      <span className="op-mock-blob is-blue" />

      <div className="op-mock-window">
        <div className="op-mock-bar">
          <span className="op-mock-dots"><i /><i /><i /></span>
          <strong>{m.cabinet}</strong>
          <span className="op-mock-bell"><Icon d={ICONS.bell} /><i>3</i></span>
        </div>

        <div className="op-mock-listing">
          <img src={MOCK_PHOTOS.main} alt="" />
          <div>
            <span className="op-mock-status">{m.active}</span>
            <strong>{m.title}</strong>
            <small><Icon d={ICONS.pin} />{m.place}</small>
            <b>{m.price}</b>
          </div>
        </div>

        <div className="op-mock-chart">
          <div className="op-mock-chart-head">
            <span><Icon d={ICONS.eye} />{m.views} <em>{m.week}</em></span>
            <b>+38%</b>
          </div>
          <div className="op-mock-bars">
            {[34, 48, 40, 58, 52, 74, 92].map((value, index) => (
              <i key={index} style={{ "--h": `${value}%`, "--i": index }} />
            ))}
          </div>
        </div>
      </div>

      <div className="op-mock-second">
        <img src={MOCK_PHOTOS.second} alt="" />
        <span className="op-mock-top">{m.top}</span>
        <strong>{m.second}</strong>
      </div>

      <div className="op-mock-toasts">
        {m.requests.map(([name, what], index) => (
          <div key={name} className="op-mock-toast" style={{ "--i": index }}>
            <span className="op-avatar">{name[0]}</span>
            <span><strong>{m.request}</strong><small>{name} · {what}</small></span>
          </div>
        ))}
      </div>

      <span className="op-mock-verified"><Icon d={ICONS.shield} />{m.verified}</span>
    </div>
  );
}

function ListingScene({ s }) {
  return (
    <div className="op-sc op-sc-listing">
      <div className="op-mini-card">
        <span className="op-mc-photo" />
        <span className="op-line is-title" />
        <span className="op-line is-short" />
        <span className="op-mc-price" />
      </div>
      <span className="op-stamp"><Icon d={ICONS.check} />{s.published}</span>
    </div>
  );
}

function RequestsScene({ s }) {
  return (
    <div className="op-sc op-sc-requests">
      <span className="op-inbox"><Icon d={ICONS.bell} /><i>3</i></span>
      {s.names.map((name, i) => (
        <div key={name} className="op-row" style={{ "--i": i }}>
          <span className="op-avatar">{name[0]}</span>
          <span><strong>{name}</strong><small>{s.requestText}</small></span>
        </div>
      ))}
    </div>
  );
}

function CalendarScene({ s }) {
  return (
    <div className="op-sc op-sc-calendar">
      <div className="op-cal">
        {s.week.map((day) => <b key={day}>{day}</b>)}
        {Array.from({ length: 21 }, (_, i) => (
          <i key={i} className={[3, 4, 9, 10, 11, 16, 18].includes(i) ? "is-busy" : undefined} style={{ "--i": i }} />
        ))}
      </div>
    </div>
  );
}

function StackScene({ s }) {
  return (
    <div className="op-sc op-sc-stack">
      {[0, 1, 2].map((i) => (
        <div key={i} className="op-stack-card" style={{ "--i": i }}>
          <span className="op-mc-photo" />
          <span className="op-line is-title" />
          <span className={`op-tag${i === 1 ? " is-sale" : ""}`}>{i === 1 ? s.sale : s.rent}</span>
        </div>
      ))}
    </div>
  );
}

function VerifiedScene({ s }) {
  return (
    <div className="op-sc op-sc-verified">
      <div className="op-profile">
        <span className="op-profile-avatar" />
        <span className="op-line is-title" />
        <span className="op-stars">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ "--i": i }}><Icon d={ICONS.star} /></i>)}</span>
      </div>
      <span className="op-seal"><Icon d={ICONS.shield} /></span>
      <span className="op-seal-label">{s.verified}</span>
    </div>
  );
}

function GrowthScene({ s }) {
  return (
    <div className="op-sc op-sc-growth">
      <div className="op-rank">
        <div className="op-rank-row is-mine"><span className="op-mc-photo" /><span className="op-line" /><em>{s.top}</em></div>
        <div className="op-rank-row"><span className="op-mc-photo" /><span className="op-line" /></div>
        <div className="op-rank-row"><span className="op-mc-photo" /><span className="op-line" /></div>
      </div>
      <span className="op-up"><Icon d={ICONS.up} /></span>
    </div>
  );
}

function FloorsScene() {
  return (
    <div className="op-sc op-sc-floors">
      <div className="op-building">
        {Array.from({ length: 15 }, (_, i) => <i key={i} style={{ "--i": i }} />)}
      </div>
      <span className="op-ground" />
    </div>
  );
}

function HoursScene({ s }) {
  return (
    <div className="op-sc op-sc-hours">
      <div className="op-units">{s.units.map((unit, i) => <b key={unit} style={{ "--i": i }}>{unit}</b>)}</div>
      <div className="op-timeline">
        {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
        <span className="op-range" />
      </div>
    </div>
  );
}

function ChatScene({ s }) {
  return (
    <div className="op-sc op-sc-chat">
      {s.chat.map((line, i) => (
        <p key={line} className={i === 1 ? "is-mine" : undefined} style={{ "--i": i }}>{line}</p>
      ))}
      <span className="op-typing"><i /><i /><i /></span>
    </div>
  );
}

const SCENES = {
  listing: ListingScene,
  requests: RequestsScene,
  calendar: CalendarScene,
  stack: StackScene,
  verified: VerifiedScene,
  growth: GrowthScene,
  floors: FloorsScene,
  hours: HoursScene,
  chat: ChatScene,
};

export function PromoScene({ type, s }) {
  const Scene = SCENES[type] || ListingScene;
  return <div className="op-scene" aria-hidden="true"><Scene s={s} /></div>;
}
