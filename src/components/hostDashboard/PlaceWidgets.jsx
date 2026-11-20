import React, { useMemo } from "react";
import { useText } from "../../context/LanguageContext.jsx";
import "./todayStrip.css";

const schedulePath = (item) => `/host-calendar?place=${encodeURIComponent(item.id)}`;

const STATUS_ROWS = [
  { status: "approved", key: "place_status_approved", tone: "good" },
  { status: "pending", key: "place_status_pending", tone: "wait" },
  { status: "rejected", key: "place_status_rejected", tone: "bad" },
];

// How many places are live, in moderation or rejected, and which rejected ones
// to fix (with the moderator's reason).
export function PlacesStatusWidget({ listings = [], onEdit }) {
  const { t } = useText();
  const count = (status) => listings.filter((item) => (item.status || "pending") === status).length;
  const toFix = listings.filter((item) => item.status === "rejected");

  return (
    <section className="tds">
      <span className="tds-title">{t("wid_status_title")}</span>
      <div className="tds-figures">
        {STATUS_ROWS.map((row) => {
          const value = count(row.status);
          return (
            <div key={row.status} className={`tds-figure${value ? ` is-${row.tone}` : ""}`}>
              <strong>{value}</strong>
              <small>{t(row.key)}</small>
            </div>
          );
        })}
      </div>

      {toFix.length ? (
        <div className="tds-list">
          <span className="tds-list-title">{t("wid_fix_title")}</span>
          <ul>
            {toFix.slice(0, 3).map((item) => (
              <li key={item.id} className="tds-fix">
                <div className="tds-who">
                  <strong>{item.title}</strong>
                  {item.moderator_note ? <small title={item.moderator_note}>{item.moderator_note}</small> : null}
                </div>
                <button type="button" onClick={() => onEdit?.(item)}>{t("wid_fix_btn")}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// The places guests book most, counted from the owner's real bookings.
export function TopPlacesWidget({ listings = [], bookings = [] }) {
  const { t, plural } = useText();

  const top = useMemo(() => {
    const counts = new Map();
    bookings
      .filter((booking) => !["cancelled", "blocked"].includes(booking.status))
      .forEach((booking) => {
        const id = String(booking.place_id ?? "");
        if (id) counts.set(id, (counts.get(id) || 0) + 1);
      });
    return listings
      .filter((item) => !item.isForSale && counts.get(String(item.id)))
      .map((item) => ({ item, count: counts.get(String(item.id)) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [listings, bookings]);

  const max = top[0]?.count || 1;

  return (
    <section className="tds">
      <span className="tds-title">{t("wid_top_title")}</span>
      {top.length ? (
        <ul className="tds-top">
          {top.map(({ item, count }, index) => (
            <li key={item.id}>
              <a href={schedulePath(item)}>
                <span className="tds-rank">{index + 1}</span>
                <img src={item.images?.[0]} alt="" loading="lazy" />
                <div className="tds-who">
                  <strong>{item.title}</strong>
                  <small>
                    {plural("list_bookings", count)}
                    {item.rating_avg ? ` · ★ ${Number(item.rating_avg).toFixed(1)}` : ""}
                  </small>
                  <span className="tds-bar"><i style={{ width: `${Math.round((count / max) * 100)}%` }} /></span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tds-empty">{t("wid_top_empty")}</p>
      )}
    </section>
  );
}
