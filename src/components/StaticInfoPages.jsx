import { cmsList, mailHref, phoneHref, socialLinks } from "../utils/cmsLinks.js";
import React, { useState, useEffect, useContext, useRef } from "react";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";
import { LanguageContext, useSiteContent } from "../context/LanguageContext.jsx";
import { cacheProfile } from "../utils/profileMapper.js";
import PaymentModal from "./PaymentModal.jsx";
import logoImage from "../assets/img/Logo.png";
import "./StaticInfoPages.css";
import "./partner/partnerPromoPage.css";
import BecomePartnerForm from "./partner/BecomePartnerForm.jsx";
import { PROMO_TEXT } from "./partner/promoPageText.js";
import { PromoHeroMock, PromoScene } from "./partner/PromoScenes.jsx";
import AccentTitle from "./ui/AccentTitle.jsx";
import { partnerEntryHref, useAccountRole } from "../utils/partnerAccess.js";
import { getPlacesFromApiResponse, normalizePlace } from "../utils/placeMapper.js";
import { ABOUT_TEXT } from "./about/aboutText.js";
import "./about/aboutPage.css";
import LiveStats from "./about/LiveStats.jsx";
import { navigate } from "../utils/router.js";

function PageIcon({ type }) {
  const paths = {
    back: ["M19 12H5", "m12 19-7-7 7-7"],
    spark: ["M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z"],
    map: ["M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
    shield: ["M12 3 20 6v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z", "m9 12 2 2 4-5"],
    building: ["M5 21V8l7-4 7 4v13", "M9 21v-5h6v5", "M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01"],
    check: ["M20 6 9 17l-5-5"],
    chat: ["M12 3.2c5 0 9 3.6 9 8s-4 8-9 8c-1.1 0-2.1-.2-3.1-.5L4.4 20.8l1.3-3.9C4 15.4 3 13.4 3 11.2c0-4.4 4-8 9-8Z", "M7.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0", "M11.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0", "M15.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0"],
    users: ["M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20", "M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4", "M15.5 4.6a3.5 3.5 0 0 1 0 6.8"],
    search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m20 20-4-4"],
    phone: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2.1Z"],
    mail: ["M4 6h16v12H4z", "m4 7 8 6 8-6"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    instagram: ["M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M17.5 6.5h.01"],
    telegram: ["M21 4 3 11.5l6.8 2.3L17 8.2l-4.7 7.1 5.2 4.7L21 4Z"],
    linkedin: ["M6 9v11", "M6 5v.01", "M10 20v-7a4 4 0 0 1 8 0v7"]
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {/* "eye" may still be saved in the CMS; it now draws the people icon. */}
      {(paths[type === "eye" ? "users" : type] || paths.spark).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function BackButton() {
  const { cms } = useSiteContent();
  return (
    <a className="static-back-button" href="/" aria-label={cms.back_button || "Ortga qaytish"}>
      <PageIcon type="back" />
      <span>{cms.back_button || "Ortga qaytish"}</span>
    </a>
  );
}

// Up to three real listings with photos for the about page collage.
function useShowcasePlaces() {
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    api.get("/api/places/popular/", { skipAuth: true })
      .then((res) => setPlaces(
        getPlacesFromApiResponse(res.data)
          .map((item) => normalizePlace(item))
          .filter((item) => /^https?:/.test(item.images?.[0] || ""))
          .slice(0, 3),
      ))
      .catch(() => setPlaces([]));
  }, []);
  return places;
}

function AboutUsPage() {
  const { cms } = useSiteContent();
  const { lang } = useContext(LanguageContext);
  const t = ABOUT_TEXT[lang] || ABOUT_TEXT.uz;
  const { role } = useAccountRole();
  const places = useShowcasePlaces();
  const partnerHref = partnerEntryHref(role);
  const isPartner = partnerHref === "/partner";
  const socials = socialLinks(cms).filter(([type]) => type === "telegram" || type === "instagram");

  return (
    <main className="static-page ab">
      <BackButton />

      <section className="ab-hero">
        <div className="ab-hero-copy">
          <h1>{cms.about_page_title}</h1>
          <p>{cms.about_page_text}</p>
          <div className="ab-actions">
            <a className="bp-btn is-primary" href="/filter">{t.findCta}<PageIcon type="arrow" /></a>
            <a className="bp-btn is-ghost" href={partnerHref}>{isPartner ? t.addCta : t.becomeCta}</a>
          </div>
        </div>

        <div className={`ab-collage${places.length ? "" : " is-empty"}`} aria-hidden="true">
          {[0, 1, 2].map((index) => {
            const place = places[index];
            return (
              <div key={index} className={`ab-shot ab-shot-${index + 1}`} style={place ? { backgroundImage: `url("${place.images[0]}")` } : undefined}>
                {place && index === 0 ? (
                  <span className="ab-shot-card">
                    <strong>{place.title}</strong>
                    <small><PageIcon type="map" />{place.location}</small>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <LiveStats labels={t.stats} lang={lang} />

      <section className="ab-section">
        <header className="ab-head">
          <h2>{t.forTitle}</h2>
        </header>
        <div className="ab-audiences">
          {[["renters", "/filter", "search"], ["owners", partnerHref, "building"]].map(([key, href, icon]) => {
            const block = t[key];
            return (
              <article key={key} className={`ab-audience is-${key}`}>
                <span className="ab-audience-icon"><PageIcon type={icon} /></span>
                <span className="ab-tag">{block.tag}</span>
                <h3>{block.title}</h3>
                <ul>
                  {block.points.map((point) => <li key={point}><PageIcon type="check" />{point}</li>)}
                </ul>
                <a href={href} className="ab-link">{block.cta}<PageIcon type="arrow" /></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ab-section">
        <header className="ab-head is-center">
          <h2>{t.howTitle}</h2>
        </header>
        <ol className="ab-steps">
          {t.how.map((step, index) => (
            <li key={step.title}>
              <b>{index + 1}</b>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ab-section ab-values-wrap">
        <header className="ab-head">
          <h2>{t.valuesTitle}</h2>
        </header>
        <div className="ab-values">
          {cmsList(cms, "about_values_arr").map((item) => (
            <article key={item.title}>
              <span className="ab-value-icon"><PageIcon type={item.icon} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ab-section ab-story">
        <blockquote>
          <h2>{cms.about_story_title}</h2>
          <p>{cms.about_story_text}</p>
        </blockquote>
      </section>

      <section className="ab-section ab-contact">
        <div>
          <h2>{t.contactTitle}</h2>
          <p>{t.contactText}</p>
        </div>
        <div className="ab-contact-links">
          {cms.footer_phone ? <a href={phoneHref(cms.footer_phone)}><PageIcon type="phone" />{cms.footer_phone}</a> : null}
          {cms.footer_email ? <a href={mailHref(cms.footer_email)}><PageIcon type="mail" />{cms.footer_email}</a> : null}
          {socials.map(([type, label, href]) => (
            <a key={type} href={href} target="_blank" rel="noreferrer"><PageIcon type={type} />{label}</a>
          ))}
        </div>
      </section>
    </main>
  );
}

// Adds "is-in" to every .op-reveal block once it scrolls into view.
function useReveal(rootRef, deps) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const nodes = [...root.querySelectorAll(".op-reveal:not(.is-in)")];
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-in"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Owners' promo page: what Joyzone gives owners, agents and business centers.
function PartnerGuidePage() {
  const { cms } = useSiteContent();
  const { lang } = useContext(LanguageContext);
  const t = PROMO_TEXT[lang] || PROMO_TEXT.uz;
  const account = useAccountRole();
  const isPartner = account.isAuthed && account.canListPlaces;
  const [tab, setTab] = useState(0);
  const rootRef = useRef(null);
  useReveal(rootRef, [lang]);

  const audience = t.audiences[tab] || t.audiences[0];
  const helpTelegram = socialLinks(cms).find(([type]) => type === "telegram");
  const terms = cmsList(cms, "partner_terms_arr");
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const startCta = () => (isPartner ? navigate("/partner") : scrollTo("become"));

  // Arriving on /partner-guide#become is handled by App (it opens on the form).
  // A "Become a partner" link clicked while already here scrolls smoothly.
  useEffect(() => {
    const onRoute = () => {
      if (window.location.hash === "#become") scrollTo("become");
    };
    window.addEventListener("joyzone-route-change", onRoute);
    return () => window.removeEventListener("joyzone-route-change", onRoute);
  }, []);

  return (
    <main className="static-page op" ref={rootRef}>
      <BackButton />

      <section className="op-hero">
        <div className="op-hero-copy">
          <h1><AccentTitle text={t.heroTitle} highlight={t.heroHighlight} /></h1>
          <p>{t.heroText}</p>
          <div className="op-actions">
            <button type="button" className="bp-btn is-primary" onClick={startCta}>
              {isPartner ? t.add : t.start}<PageIcon type="arrow" />
            </button>
            <button type="button" className="bp-btn is-ghost" onClick={() => scrollTo("tariffs")}>{t.tariffs}</button>
          </div>
          <ul className="op-facts">
            {t.facts.map((fact, index) => (
              <li key={fact.value} style={{ "--i": index }}>
                <strong>{fact.value}</strong>
                <small>{fact.label}</small>
              </li>
            ))}
          </ul>
        </div>
        <PromoHeroMock m={t.mock} />
      </section>

      <section className="op-section op-audience op-reveal">
        <div className="op-tabs" role="tablist" aria-label={t.tabsLabel}>
          {t.audiences.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === tab}
              className={index === tab ? "is-active" : undefined}
              onClick={() => setTab(index)}
            >
              {item.tab}
            </button>
          ))}
        </div>
        <div className="op-audience-body" key={audience.id} role="tabpanel">
          <h2>{audience.title}</h2>
          <div className="op-cards">
            {audience.cards.map((card, index) => (
              <article key={card.scene} className="op-card" style={{ "--i": index }}>
                <PromoScene type={card.scene} s={t.scene} />
                <p>{card.text}</p>
              </article>
            ))}
          </div>
          <ul className="op-perks">
            {audience.points.map((point, index) => (
              <li key={point} style={{ "--i": index }}><PageIcon type="check" />{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="op-section op-reveal">
        <header className="op-head">
          <h2><AccentTitle text={t.featuresTitle} /></h2>
        </header>
        <div className="op-features">
          {t.features.map((item, index) => (
            <article key={item.title} style={{ "--i": index }}>
              <span className="op-feature-icon"><PageIcon type={item.icon} /></span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="op-section op-duo op-reveal">
        <div className="op-duo-stats">
          <h2><AccentTitle text={t.statsTitle} highlight="Joyzone" /></h2>
          <p>{t.statsText}</p>
          <LiveStats labels={t.stats} lang={lang} />
        </div>
        <div className="op-duo-steps">
          <h2><AccentTitle text={t.stepsTitle} highlight={t.stepsHighlight} /></h2>
          <ol className="op-steps">
            {t.steps.map((step, index) => (
              <li key={step.title} style={{ "--i": index }}>
                <b>{index + 1}</b>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <TariffPlansSection />

      {terms.length ? (
        <section className="op-section op-reveal" id="terms">
          <header className="op-head">
            <h2>{cms.partner_terms_title}</h2>
            {cms.partner_terms_text ? <p>{cms.partner_terms_text}</p> : null}
          </header>
          <div className="op-terms">
            {terms.map((term, index) => (
              <article key={term.title} style={{ "--i": index }}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{term.title}</h3>
                <p>{term.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="op-section op-become" id="become">
        <span className="op-orb is-c" aria-hidden="true" />
        <div className="op-become-copy">
          <h2>{t.becomeTitle}</h2>
          <p>{t.becomeText}</p>
          <ul className="op-points">
            {t.becomePoints.map((point) => <li key={point}><PageIcon type="check" />{point}</li>)}
          </ul>
          {cms.footer_phone || helpTelegram ? (
            <div className="op-help">
              <span className="op-help-icon"><PageIcon type="chat" /></span>
              <span className="op-help-copy"><strong>{t.helpTitle}</strong>{t.helpText}</span>
              <span className="op-help-links">
                {cms.footer_phone ? <a href={phoneHref(cms.footer_phone)} aria-label={cms.footer_phone}><PageIcon type="phone" /></a> : null}
                {helpTelegram ? <a href={helpTelegram[2]} target="_blank" rel="noreferrer" aria-label={helpTelegram[1]}><PageIcon type="telegram" /></a> : null}
              </span>
            </div>
          ) : null}
        </div>
        <BecomePartnerForm />
      </section>
    </main>
  );
}

// Interface words of the tariff block (plan names and features come from the API).
const TARIFF_TEXT = {
  uz: {
    places: "ta joy", days: "kun", start: "Bepul boshlash", choose: "Tanlash", loading: "Yuklanmoqda…",
    empty: "Hozircha tariflar yo'q.", chosen: "tarifi tanlandi!", ok: "Yaxshi",
    loadError: "Tariflarni yuklab bo'lmadi.", activateError: "Tarifni faollashtirib bo'lmadi.",
    footnote: "Barcha tariflarda moderatsiya bir xil • Tarifni istalgan vaqtda o'zgartirish mumkin",
  },
  ru: {
    places: "мест", days: "дней", start: "Начать бесплатно", choose: "Выбрать", loading: "Загрузка…",
    empty: "Тарифов пока нет.", chosen: "— тариф выбран!", ok: "Хорошо",
    loadError: "Не удалось загрузить тарифы.", activateError: "Не удалось активировать тариф.",
    footnote: "Модерация одинакова для всех тарифов • Тариф можно сменить в любое время",
  },
  en: {
    places: "places", days: "days", start: "Start for free", choose: "Choose", loading: "Loading…",
    empty: "No plans yet.", chosen: "plan selected!", ok: "Great",
    loadError: "Could not load the plans.", activateError: "Could not activate the plan.",
    footnote: "Moderation is the same on every plan • You can change your plan any time",
  },
};

function TariffPlansSection() {
  const [tariffs, setTariffs] = useState([]);
  const [submitting, setSubmitting] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const { lang, content } = useContext(LanguageContext);
  const cms = content?.[lang] || {};
  const tt = TARIFF_TEXT[lang] || TARIFF_TEXT.uz;

  const FALLBACK = [
    {
      id: 1, slug: 'standard', name: 'Standard', name_ru: 'Стандарт',
      price: 0, max_places: 1, is_free: true, duration_days: 36500,
      features: ["1 ta faol e'lon", "Asosiy profil", "Bron so'rovlari"],
      features_ru: ["1 активное объявление", "Базовый профиль", "Запросы бронирования"],
      features_en: ["1 active listing", "Basic profile", "Booking requests"],
    },
    {
      id: 2, slug: 'comfort', name: 'Comfort', name_ru: 'Комфорт',
      price: 99000, max_places: 5, is_free: false, duration_days: 30,
      features: ["5 ta faol e'lon", "Kengaytirilgan profil", "Statistika", "Reklama", "Ustuvor ko'rsatish"],
      features_ru: ["До 5 активных объявлений", "Расширенный профиль", "Статистика", "Реклама", "Приоритетный показ"],
      features_en: ["Up to 5 active listings", "Extended profile", "Statistics", "Advertising", "Priority showing"],
    },
    {
      id: 3, slug: 'premium', name: 'Premium', name_ru: 'Премиум',
      price: 199000, max_places: 10, is_free: false, duration_days: 30,
      features: ["10 ta faol e'lon", "Premium belgisi", "API integratsiya", "Ustuvor moderatsiya", "Shaxsiy menejer"],
      features_ru: ["До 10 активных объявлений", "Премиум значок", "API интеграция", "Приоритетная модерация", "Личный менеджер"],
      features_en: ["Up to 10 active listings", "Premium badge", "API integration", "Priority moderation", "Personal manager"],
    },
  ];

  useEffect(() => {
    api.get('/api/tariffs/', { skipAuth: true })
      .then(res => {
        setTariffs(res.data?.results || res.data || []);
        setLoadError("");
        setUsingFallback(false);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          setTariffs(FALLBACK);
          setUsingFallback(true);
          setLoadError("DEV fallback tariffs");
        } else {
          setTariffs([]);
          setUsingFallback(false);
          setLoadError(getApiErrorMessage(err, tt.loadError));
        }
      });
  }, []);

  const handleSelect = async (tariff) => {
    const token = getAccessToken();
    if (!token) { navigate('/login'); return; }
    setSubmitting(tariff.id);
    try {
      const res = await api.post(
        '/api/tariffs/subscribe/',
        { tariff_id: tariff.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.requires_payment) {
        if (!res.data?.subscription_id) {
          throw new Error("Backend не вернул subscription_id для оплаты.");
        }
        setPaymentTarget({
          ...tariff,
          subscriptionId: res.data.subscription_id,
        });
        return;
      }
      if (res.data?.status !== "active") {
        throw new Error("Backend не подтвердил активацию бесплатного тарифа.");
      }
      const profileResponse = await api.get('/api/auth/profile/');
      cacheProfile(profileResponse.data);
      setDone({ tariff, message: res.data.detail });
    } catch (e) {
      setError(getApiErrorMessage(e, tt.activateError));
    } finally {
      setSubmitting(null);
    }
  };

  const formatPrice = (tariff) => {
    if (tariff.is_free) return cms.tariffs_free || 'Bepul';
    return new Intl.NumberFormat('ru-RU').format(tariff.price);
  };

  return (
    <section className="tariff-section" id="tariffs">
      <div className="tariff-head">
        <h2>{cms.tariffs_title || "O'zingizga mos tarifni tanlang"}</h2>
        <p>{cms.tariffs_subtitle || "Bepul boshlang, biznesingiz o'sgani sari tarifni o'zgartiring."}</p>
      </div>

      {done ? (
        <div className="tariff-success">
          <div className="tariff-success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3>{(lang === 'ru' ? done.tariff.name_ru : lang === 'en' ? done.tariff.name_en : done.tariff.name) || done.tariff.name} {tt.chosen}</h3>
          <p>{done.message}</p>
          <button className="tariff-cta tariff-cta--accent" onClick={() => setDone(null)}>
            {tt.ok}
          </button>
        </div>
      ) : (
        <div className="tariff-grid">
          {loadError ? (
            <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontWeight: 800, fontSize: 13 }}>
              {loadError}
            </div>
          ) : null}
          {tariffs.map(tariff => {
            const isPremium = tariff.slug === 'premium';
            const name = (lang === 'ru' ? tariff.name_ru : lang === 'en' ? tariff.name_en : tariff.name) || tariff.name;
            const features = (lang === 'ru' ? tariff.features_ru : lang === 'en' ? tariff.features_en : tariff.features) || tariff.features || [];
            return (
              <div key={tariff.id} data-testid={`tariff-card-${tariff.slug || tariff.id}`} className={`tariff-card${isPremium ? ' tariff-card--premium' : ''}`}>
                {isPremium && <div className="tariff-badge-top">{cms.tariffs_best || "Eng yaxshi tanlov"}</div>}

                <div className="tariff-card-top">
                  <div className="tariff-slug">{tariff.slug}</div>
                  <div className="tariff-name">{name}</div>
                  <div className="tariff-price">
                    <strong>{formatPrice(tariff)}</strong>
                    {!tariff.is_free && <span>{cms.tariffs_per_month || "so'm / oy"}</span>}
                  </div>
                  <div className="tariff-meta">
                    {tariff.max_places} {tt.places} &bull; {tariff.is_free ? (cms.tariffs_unlimited || 'Muddatsiz') : `${tariff.duration_days} ${tt.days}`}
                  </div>
                </div>

                <div className="tariff-features">
                  {features.map((f, i) => (
                    <div key={i} className="tariff-feature">
                      <div className="tariff-feature-check">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <div className="tariff-card-foot">
                  <button
                    data-testid={`tariff-select-${tariff.slug || tariff.id}`}
                    className={`tariff-cta${isPremium ? ' tariff-cta--accent' : ''}`}
                    onClick={() => handleSelect(tariff)}
                    disabled={submitting === tariff.id}
                  >
                    {submitting === tariff.id ? tt.loading : tariff.is_free ? tt.start : tt.choose}
                  </button>
                </div>
              </div>
            );
          })}
          {!loadError && tariffs.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", color: "#64748b", fontWeight: 700 }}>
              {tt.empty}
            </div>
          ) : null}
          {usingFallback ? (
            <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontWeight: 800, fontSize: 12 }}>
              DEV fallback
            </div>
          ) : null}
        </div>
      )}

      <p className="tariff-footnote">
        {tt.footnote}
      </p>

      {error && (
        <div className="tariff-error-overlay" onClick={() => setError(null)}>
          <div className="tariff-error-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
            <h3>Xatolik yuz berdi</h3>
            <p>{error}</p>
            <button className="tariff-error-btn" onClick={() => setError(null)}>Yopish</button>
          </div>
        </div>
      )}

      {paymentTarget && (
        <PaymentModal
          isOpen={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          amount={`${formatPrice(paymentTarget)} UZS`}
          title="Tarif uchun test to'lovi"
          productDetails={{
            subscriptionId: paymentTarget.subscriptionId,
            name: paymentTarget.name_ru || paymentTarget.name,
            limit: paymentTarget.max_places,
          }}
          onSuccess={async () => {
            const profileResponse = await api.get('/api/auth/profile/');
            cacheProfile(profileResponse.data);
            setDone({
              tariff: paymentTarget,
              message: "Test to'lovi tasdiqlandi va tarif faollashtirildi.",
            });
          }}
        />
      )}
    </section>
  );
}


export { AboutUsPage, PartnerGuidePage };
