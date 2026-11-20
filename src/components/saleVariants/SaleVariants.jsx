import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client.js";
import { Header as JoyNavbar } from "../HomeHero.jsx";
import { DirectChatDrawer } from "../DirectChatDrawer.jsx";
import { PackIcon, resolveIconName } from "../ui/iconPack.jsx";
import { normalizeReview } from "../spaceDetail/helpers.js";
import { startOrGetChatForSpace } from "../../utils/chatManager.js";
import { getPlacesFromApiResponse, normalizePlace } from "../../utils/placeMapper.js";
import { navigate, useQueryParam } from "../../utils/router.js";
import { phoneHref } from "../../utils/cmsLinks.js";
import { useSiteContent } from "../../context/LanguageContext.jsx";
import "./saleVariants.css";

// Six complete versions of the sale listing block that sits between the photo
// slider and "O'xshash joylar": characteristics, description, amenities,
// location, reviews and the sale card. Open /sale-variants?id=<place>&v=1..6,
// pick one, and it moves into SpaceDetail.jsx.

const TEXT = {
  sale: ["Sotuvda", "Продаётся", "For sale"],
  new: ["Yangi", "Новый", "New"],
  price: ["Sotuv narxi", "Цена продажи", "Sale price"],
  perM2: ["1 m² narxi", "Цена за 1 м²", "Price per m²"],
  capacity: ["Sig'im", "Вместимость", "Capacity"],
  people: ["kishi", "чел.", "people"],
  area: ["Maydon", "Площадь", "Area"],
  type: ["Turi", "Тип", "Type"],
  seller: ["Sotuvchi", "Продавец", "Seller"],
  status: ["Holati", "Статус", "Status"],
  active: ["Faol", "Активно", "Active"],
  review: ["Tekshirilmoqda", "На проверке", "Under review"],
  call: ["Qo'ng'iroq qilish", "Позвонить", "Call"],
  write: ["Sotuvchiga yozish", "Написать продавцу", "Message seller"],
  note: [
    "Bu joy sotuvda, Joyzone orqali bron qilinmaydi. Narx va ko'rish vaqtini sotuvchi bilan kelishing.",
    "Объект продаётся, бронирование через Joyzone недоступно. Цену и просмотр обсудите с продавцом.",
    "This place is for sale and can't be booked on Joyzone. Agree the price and a viewing with the seller.",
  ],
  aboutKicker: ["Joy haqida", "Об объекте", "About"],
  aboutTitle: ["Obyekt haqida batafsil", "Подробнее об объекте", "About this property"],
  specsKicker: ["Xususiyatlar", "Характеристики", "Features"],
  specsTitle: ["Asosiy ma'lumotlar", "Основные данные", "Key details"],
  amenKicker: ["Qulayliklar", "Удобства", "Amenities"],
  amenTitle: ["Obyektda nimalar bor", "Что есть на объекте", "What the place has"],
  amenNone: ["Qulayliklar ko'rsatilmagan", "Удобства не указаны", "No amenities listed"],
  placeKicker: ["Joylashuv", "Расположение", "Location"],
  placeTitle: ["Obyekt qayerda", "Где находится объект", "Where it is"],
  address: ["Manzil", "Адрес", "Address"],
  revKicker: ["Sharhlar", "Отзывы", "Reviews"],
  revTitle: ["Mehmonlar fikri", "Мнения гостей", "What guests say"],
  revEmpty: ["Hozircha sharhlar yo'q", "Пока нет отзывов", "No reviews yet"],
  revEmptyText: ["Obyektni ko'rganlar birinchi bo'lib fikr qoldirishi mumkin.", "Те, кто посмотрел объект, могут оставить отзыв первыми.", "People who viewed the place can leave the first review."],
  revAdd: ["Sharh qoldirish", "Оставить отзыв", "Leave a review"],
  revCount: ["ta sharh", "отзывов", "reviews"],
  help: ["Joyzone yordam beradi", "Joyzone поможет", "Joyzone can help"],
  sv1: ["Ko'rishga yozilish", "Запись на просмотр", "Book a viewing"],
  sv1t: ["Sotuvchi bilan qulay vaqtni kelishamiz", "Договоримся с продавцом о времени", "We agree a time with the seller"],
  sv2: ["Hujjatlarni tekshirish", "Проверка документов", "Document check"],
  sv2t: ["Yurist mulk huquqi va taqiqlarni tekshiradi", "Юрист проверит право собственности", "A lawyer checks ownership"],
  sv3: ["Ipoteka bo'yicha yordam", "Помощь с ипотекой", "Mortgage help"],
  sv3t: ["Bank shartlarini tanlashga yordam beramiz", "Поможем выбрать условия банка", "We help you pick bank terms"],
  safe: ["Obyektni ko'rmasdan va hujjatlarni tekshirmasdan oldindan pul o'tkazmang.", "Не переводите деньги, пока не увидели объект и не проверили документы.", "Don't pay before you have seen the place and checked the documents."],
  allListings: ["Barcha e'lonlari", "Все объявления", "All listings"],
  partner: ["Joyzone hamkori", "Партнёр Joyzone", "Joyzone partner"],
};

const LANGS = ["uz", "ru", "en"];

const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const money = (value) => `${new Intl.NumberFormat("ru-RU").format(Math.round(value || 0))} UZS`;

function useSale(place, reviews, lang) {
  return useMemo(() => {
    if (!place) return null;
    const t = (key) => (TEXT[key] || [key])[Math.max(0, LANGS.indexOf(lang))] || TEXT[key][0];
    const sub = place.subcategory_info || {};
    const params = Array.isArray(sub.parameters) ? sub.parameters : [];
    const name = (p) => p[`name_${lang}`] || p.name_uz || p.name_ru;
    const chars = place.characteristics || {};
    const price = Number(place.sale_price) || 0;
    const area = Number(place.area) || 0;
    const perM2 = price && area ? price / area : 0;

    const stats = [
      { icon: "users", label: t("capacity"), value: `${place.people || 0} ${t("people")}` },
      { icon: "area", label: t("area"), value: `${area} m²` },
      ...params
        .filter((p) => p.type !== "boolean" && chars[p.slug] !== undefined && chars[p.slug] !== "")
        .map((p) => {
          const raw = chars[p.slug];
          const opt = p.type === "select" ? p.config?.options?.find((o) => o.slug === raw) : null;
          return {
            icon: resolveIconName(p.icon, p.slug, p.name_ru),
            label: name(p).replace(/\s*\(.*\)$/, ""),
            value: opt ? opt[lang] || opt.uz || opt.ru : `${raw}${p.config?.unit ? ` ${p.config.unit}` : ""}`,
          };
        }),
      { icon: "wallet", label: t("perM2"), value: perM2 ? money(perM2) : "" },
      { icon: "shield", label: t("status"), value: place.status === "approved" ? t("active") : t("review") },
    ].filter((s) => s.value);

    const rated = reviews.filter((r) => Number(r.rating) > 0);
    const avg = rated.length ? rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length : Number(place.rating_avg) || 0;

    return {
      t,
      id: place.id,
      title: place.title,
      location: place.location,
      description: place[`description_${lang}`] || place.description_uz || place.description_ru || "",
      price,
      perM2,
      type: sub[`name_${lang}`] || sub.name_uz || place.subcategory_name || "",
      area,
      stats,
      amenities: params
        .filter((p) => p.type === "boolean" && (place.amenities || []).includes(p.slug))
        .map((p) => ({ icon: resolveIconName(p.icon, p.slug, p.name_ru), label: name(p) })),
      lat: Number(place.latitude) || null,
      lng: Number(place.longitude) || null,
      reviews,
      rating: avg,
      owner: { id: place.owner_id || place.owner, name: place.owner_name || t("seller"), phone: place.owner_phone || "" },
    };
  }, [place, reviews, lang]);
}

/* ================= shared pieces ================= */

function Section({ kicker, title, action, children, className = "" }) {
  return (
    <section className={`sv-sec ${className}`}>
      <div className="sv-sec-head">
        <div>
          {kicker ? <small>{kicker}</small> : null}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stats({ d, look = "cards" }) {
  return (
    <div className={`sv-stats is-${look}`}>
      {d.stats.map((s) => (
        <div key={s.label} className="sv-stat">
          <span className="sv-stat-icon"><PackIcon name={s.icon} size={20} /></span>
          <div>
            <small>{s.label}</small>
            <strong>{s.value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function Amenities({ d, look = "rows" }) {
  if (!d.amenities.length) return <p className="sv-muted">{d.t("amenNone")}</p>;
  return (
    <ul className={`sv-amen is-${look}`}>
      {d.amenities.map((a) => (
        <li key={a.label}><span><PackIcon name={a.icon} size={18} /></span>{a.label}</li>
      ))}
    </ul>
  );
}

function MapBox({ d, height = 300 }) {
  return (
    <div className="sv-map" style={{ height }}>
      {d.lat && d.lng ? (
        <iframe title={d.t("placeTitle")} loading="lazy" src={`https://yandex.uz/map-widget/v1/?ll=${d.lng},${d.lat}&z=16&pt=${d.lng},${d.lat},pm2rdm`} />
      ) : null}
      <div className="sv-map-pin">
        <span><PackIcon name="map" size={18} /></span>
        <div><small>{d.t("address")}</small><b>{d.location}</b></div>
      </div>
    </div>
  );
}

function Stars({ value }) {
  return (
    <span className="sv-stars" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= Math.round(value) ? "is-on" : ""}>★</i>)}
    </span>
  );
}

function Reviews({ d, look = "plain" }) {
  return (
    <div className={`sv-rev is-${look}`}>
      {d.reviews.length ? (
        <>
          <div className="sv-rev-score">
            <b>{d.rating.toFixed(1)}</b>
            <Stars value={d.rating} />
            <small>{d.reviews.length} {d.t("revCount")}</small>
          </div>
          <div className="sv-rev-list">
            {d.reviews.slice(0, 4).map((r) => (
              <article key={r.id}>
                <header>
                  <span className="sv-avatar">{r.name.slice(0, 1)}</span>
                  <div><b>{r.name}</b><small>{r.date}</small></div>
                  <Stars value={r.rating} />
                </header>
                <p>{r.text}</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="sv-rev-empty">
          <span><PackIcon name="star" size={22} /></span>
          <b>{d.t("revEmpty")}</b>
          <p>{d.t("revEmptyText")}</p>
        </div>
      )}
    </div>
  );
}

function ReviewButton({ d }) {
  return <button type="button" className="sv-chip-btn" onClick={() => navigate(`/space-${d.id}`)}>{d.t("revAdd")}</button>;
}

function Buttons({ d, phone, onChat }) {
  return (
    <div className="sv-buttons">
      <a className="sv-btn is-main" href={phoneHref(d.owner.phone || phone)}><PackIcon name="phone" size={18} />{d.t("call")}</a>
      <button type="button" className="sv-btn" onClick={onChat}><ChatIcon />{d.t("write")}</button>
    </div>
  );
}

function SaleCard({ d, phone, onChat, look = "light", children }) {
  return (
    <div className={`sv-card is-${look}`}>
      <div className="sv-card-top">
        <div className="sv-card-tags">
          <span className="sv-badge">{d.t("sale")}</span>
          <span className="sv-rating"><PackIcon name="star" size={14} />{d.rating ? d.rating.toFixed(1) : d.t("new")}</span>
        </div>
        <small>{d.t("price")}</small>
        <strong>{money(d.price)}</strong>
        {d.perM2 ? <p>{money(d.perM2)} / m²</p> : null}
      </div>
      <div className="sv-card-body">
        <ul className="sv-card-facts">
          <li><span>{d.t("area")}</span><b>{d.area} m²</b></li>
          <li><span>{d.t("type")}</span><b>{d.type}</b></li>
          <li><span>{d.t("seller")}</span><b>{d.owner.name}</b></li>
        </ul>
        <Buttons d={d} phone={phone} onChat={onChat} />
        <p className="sv-card-note">{d.t("note")}</p>
        {children}
      </div>
    </div>
  );
}

function Seller({ d, onChat }) {
  return (
    <div className="sv-seller">
      <span className="sv-avatar is-big">{d.owner.name.slice(0, 1)}</span>
      <div>
        <b>{d.owner.name}</b>
        <small>{d.t("partner")}</small>
      </div>
      <button type="button" onClick={onChat} aria-label={d.t("write")}><ChatIcon /></button>
      {d.owner.id ? <a href={`/agent-${d.owner.id}`}>{d.t("allListings")}<ArrowIcon /></a> : null}
    </div>
  );
}

function Services({ d, phone }) {
  const items = [
    { icon: "calendar", title: d.t("sv1"), text: d.t("sv1t") },
    { icon: "shield", title: d.t("sv2"), text: d.t("sv2t") },
    { icon: "wallet", title: d.t("sv3"), text: d.t("sv3t") },
  ];
  return (
    <div className="sv-help">
      <small>{d.t("help")}</small>
      {items.map((s) => (
        <a key={s.title} href={phoneHref(phone)}>
          <span><PackIcon name={s.icon} size={18} /></span>
          <div><b>{s.title}</b><p>{s.text}</p></div>
        </a>
      ))}
      <p className="sv-safe"><PackIcon name="shield" size={16} />{d.t("safe")}</p>
    </div>
  );
}

/* ================= 1. Klassik ================= */

function V1({ d, phone, onChat }) {
  return (
    <div className="sv-layout v1">
      <div className="sv-main">
        <Stats d={d} look="cards" />
        <Section kicker={d.t("aboutKicker")} title={d.t("aboutTitle")}>
          <p className="sv-desc">{d.description}</p>
        </Section>
        <Section kicker={d.t("amenKicker")} title={d.t("amenTitle")}>
          <Amenities d={d} look="rows" />
        </Section>
        <Section kicker={d.t("placeKicker")} title={d.t("placeTitle")}>
          <MapBox d={d} />
        </Section>
        <Section kicker={d.t("revKicker")} title={d.t("revTitle")} action={<ReviewButton d={d} />}>
          <Reviews d={d} />
        </Section>
      </div>
      <aside className="sv-side">
        <SaleCard d={d} phone={phone} onChat={onChat} />
      </aside>
    </div>
  );
}

/* ================= 2. Panellar ================= */

function V2({ d, phone, onChat }) {
  return (
    <div className="sv-layout v2">
      <div className="sv-main">
        <Section title={d.t("specsTitle")} className="is-panel">
          <Stats d={d} look="table" />
        </Section>
        <Section title={d.t("aboutTitle")} className="is-panel">
          <p className="sv-desc">{d.description}</p>
        </Section>
        <Section title={d.t("amenTitle")} className="is-panel">
          <Amenities d={d} look="chips" />
        </Section>
        <Section title={d.t("placeTitle")} className="is-panel">
          <MapBox d={d} height={260} />
        </Section>
        <Section title={d.t("revTitle")} className="is-panel" action={<ReviewButton d={d} />}>
          <Reviews d={d} look="compact" />
        </Section>
      </div>
      <aside className="sv-side">
        <SaleCard d={d} phone={phone} onChat={onChat} look="split" />
      </aside>
    </div>
  );
}

/* ================= 3. Tablar ================= */

function V3({ d, phone, onChat }) {
  const tabs = [
    { id: "about", label: d.t("aboutKicker") },
    { id: "specs", label: d.t("specsKicker") },
    { id: "amen", label: d.t("amenKicker") },
    { id: "place", label: d.t("placeKicker") },
    { id: "rev", label: `${d.t("revKicker")} (${d.reviews.length})` },
  ];
  const [tab, setTab] = useState("about");
  return (
    <div className="sv-layout v3">
      <div className="sv-main">
        <Stats d={d} look="strip" />
        <nav className="sv-tabs" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? "is-active" : ""} onClick={() => setTab(x.id)}>{x.label}</button>
          ))}
        </nav>
        <div key={tab} className="sv-tab-body">
          {tab === "about" ? (
            <>
              <h2 className="sv-tab-title">{d.t("aboutTitle")}</h2>
              <p className="sv-desc">{d.description}</p>
              <Amenities d={d} look="chips" />
            </>
          ) : null}
          {tab === "specs" ? (<><h2 className="sv-tab-title">{d.t("specsTitle")}</h2><Stats d={d} look="table" /></>) : null}
          {tab === "amen" ? (<><h2 className="sv-tab-title">{d.t("amenTitle")}</h2><Amenities d={d} look="rows" /></>) : null}
          {tab === "place" ? (<><h2 className="sv-tab-title">{d.t("placeTitle")}</h2><MapBox d={d} height={340} /></>) : null}
          {tab === "rev" ? (
            <>
              <div className="sv-sec-head"><h2 className="sv-tab-title">{d.t("revTitle")}</h2><ReviewButton d={d} /></div>
              <Reviews d={d} />
            </>
          ) : null}
        </div>
      </div>
      <aside className="sv-side">
        <SaleCard d={d} phone={phone} onChat={onChat} />
      </aside>
    </div>
  );
}

/* ================= 4. Tungi karta ================= */

function V4({ d, phone, onChat }) {
  return (
    <div className="sv-layout v4">
      <div className="sv-main">
        <Stats d={d} look="numbers" />
        <Section kicker={d.t("aboutKicker")} title={d.t("aboutTitle")}>
          <p className="sv-desc is-lead">{d.description}</p>
        </Section>
        <Section kicker={d.t("amenKicker")} title={d.t("amenTitle")}>
          <Amenities d={d} look="ticks" />
        </Section>
        <Section kicker={d.t("placeKicker")} title={d.t("placeTitle")}>
          <MapBox d={d} />
        </Section>
        <Section kicker={d.t("revKicker")} title={d.t("revTitle")} action={<ReviewButton d={d} />}>
          <Reviews d={d} />
        </Section>
      </div>
      <aside className="sv-side">
        <SaleCard d={d} phone={phone} onChat={onChat} look="dark" />
      </aside>
    </div>
  );
}

/* ================= 5. Keng ================= */

function V5({ d, phone, onChat }) {
  return (
    <div className="v5">
      <div className="v5-bar">
        <div className="v5-price">
          <div className="sv-card-tags">
            <span className="sv-badge">{d.t("sale")}</span>
            <span className="sv-rating"><PackIcon name="star" size={14} />{d.rating ? d.rating.toFixed(1) : d.t("new")}</span>
          </div>
          <strong>{money(d.price)}</strong>
          <p>{d.perM2 ? `${money(d.perM2)} / m² · ` : ""}{d.type}</p>
        </div>
        <Seller d={d} onChat={onChat} />
        <Buttons d={d} phone={phone} onChat={onChat} />
      </div>
      <p className="v5-note">{d.t("note")}</p>

      <div className="v5-grid">
        <Section kicker={d.t("aboutKicker")} title={d.t("aboutTitle")} className="is-panel">
          <p className="sv-desc">{d.description}</p>
          <Amenities d={d} look="chips" />
        </Section>
        <Section kicker={d.t("specsKicker")} title={d.t("specsTitle")} className="is-panel">
          <Stats d={d} look="table" />
        </Section>
      </div>

      <Section kicker={d.t("placeKicker")} title={d.t("placeTitle")}>
        <MapBox d={d} height={380} />
      </Section>
      <Section kicker={d.t("revKicker")} title={d.t("revTitle")} action={<ReviewButton d={d} />}>
        <Reviews d={d} />
      </Section>
    </div>
  );
}

/* ================= 6. Xizmatlar bilan ================= */

function V6({ d, phone, onChat }) {
  return (
    <div className="sv-layout v6">
      <div className="sv-main">
        <Stats d={d} look="chips" />
        <Section kicker={d.t("aboutKicker")} title={d.t("aboutTitle")}>
          <p className="sv-desc">{d.description}</p>
        </Section>
        <Section kicker={d.t("amenKicker")} title={d.t("amenTitle")}>
          <Amenities d={d} look="tiles" />
        </Section>
        <Section kicker={d.t("placeKicker")} title={d.t("placeTitle")}>
          <MapBox d={d} />
        </Section>
        <Section kicker={d.t("revKicker")} title={d.t("revTitle")} action={<ReviewButton d={d} />}>
          <Reviews d={d} />
        </Section>
      </div>
      <aside className="sv-side">
        <SaleCard d={d} phone={phone} onChat={onChat}>
          <Seller d={d} onChat={onChat} />
        </SaleCard>
        <Services d={d} phone={phone} />
      </aside>
    </div>
  );
}

/* ================= page ================= */

const VARIANTS = [
  { id: "1", label: "Klassik", hint: "Hozirgi tuzilma, lekin tozaroq: kartochkalar, bo'limlar va o'ngda sotuv kartasi." },
  { id: "2", label: "Panellar", hint: "Har bir bo'lim alohida oq panelda, xususiyatlar jadval ko'rinishida." },
  { id: "3", label: "Tablar", hint: "Tepada qisqa ma'lumot qatori, pastda bo'limlar tablar orqali almashadi." },
  { id: "4", label: "Tungi karta", hint: "Katta raqamlar va o'ngda to'q ko'k sotuv kartasi." },
  { id: "5", label: "Keng", hint: "Yon kartasiz: tepada keng narx paneli, ostida ikki ustunli bo'limlar." },
  { id: "6", label: "Xizmatlar", hint: "Klassik tuzilma, o'ngda sotuvchi va xaridorga yordam xizmatlari." },
];

const VIEWS = { 1: V1, 2: V2, 3: V3, 4: V4, 5: V5, 6: V6 };

export default function SaleVariants({ userState, setUserState }) {
  const { cms, lang } = useSiteContent();
  const idParam = useQueryParam("id") || "";
  const vParam = useQueryParam("v") || "1";
  const [variant, setVariant] = useState(VIEWS[vParam] ? vParam : "1");
  const [place, setPlace] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [chatId, setChatId] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let one;
        if (idParam) {
          one = (await api.get(`/api/places/${idParam}/`, { skipAuth: true })).data;
        } else {
          const res = await api.get("/api/places/", { params: { deal_type: "sale" }, skipAuth: true });
          one = getPlacesFromApiResponse(res.data)[0];
        }
        if (!alive) return;
        if (!one) {
          setError("Sotuv e'lonlari topilmadi.");
          return;
        }
        setPlace({ ...normalizePlace(one), subcategory_info: one.subcategory_info, owner_phone: one.owner_phone, status: one.status });
        const rev = await api.get("/api/reviews/", { params: { place: one.id }, skipAuth: true }).catch(() => ({ data: [] }));
        const list = rev.data?.results || rev.data || [];
        if (alive) setReviews(Array.isArray(list) ? list.map(normalizeReview) : []);
      } catch (e) {
        if (alive) setError("E'lonni yuklab bo'lmadi.");
      }
    })();
    return () => { alive = false; };
  }, [idParam]);

  const d = useSale(place, reviews, lang);
  const phone = cms.support_phone || cms.footer_phone || "";

  const pick = (id) => {
    setVariant(id);
    const params = new URLSearchParams(window.location.search);
    params.set("v", id);
    if (d?.id) params.set("id", d.id);
    window.history.replaceState(null, "", `/sale-variants?${params.toString()}`);
  };

  const onChat = async () => {
    if (!d) return;
    const chat = await startOrGetChatForSpace({ spaceId: d.id, spaceTitle: d.title, hostName: d.owner.name });
    if (chat) setChatId(chat.id);
  };

  const View = VIEWS[variant];
  const current = VARIANTS.find((v) => v.id === variant);

  return (
    <main className="sv-page">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} />
      <div className="sv-wrap">
        <header className="sv-top">
          <div className="sv-switch" role="tablist">
            {VARIANTS.map((v) => (
              <button key={v.id} type="button" className={v.id === variant ? "is-active" : ""} onClick={() => pick(v.id)}>
                <i>{v.id}</i>{v.label}
              </button>
            ))}
          </div>
          <p>
            {current?.hint}
            {d ? <button type="button" onClick={() => navigate(`/space-${d.id}`)}>Hozirgi sahifa<ArrowIcon /></button> : null}
          </p>
        </header>

        {error ? <p className="sv-error">{error}</p> : null}
        {d ? <div key={variant} className="sv-stage"><View d={d} phone={phone} onChat={onChat} /></div> : null}
      </div>
      {chatId ? <DirectChatDrawer chatId={chatId} spaceTitle={d?.title} hostName={d?.owner.name} onClose={() => setChatId(null)} /> : null}
    </main>
  );
}
