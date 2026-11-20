import React, { useState } from "react";
import { HostListingDetailModal } from "../HostListingDetailModal.jsx";
import { removeStorageItem, STORAGE_KEYS } from "../../utils/storageKeys.js";
import { useText } from "../../context/LanguageContext.jsx";
import { navigate } from "../../utils/router.js";
import { TodayStrip } from "./TodayStrip.jsx";
import { PlacesStatusWidget, TopPlacesWidget } from "./PlaceWidgets.jsx";
import "./listings.css";

const ICONS = {
  calendar: ["M7 3v4M17 3v4", "M4 7h16v14H4z", "M4 11h16", "M8 15h3M8 18h6"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M6 6l1 14h10l1-14", "M10 11v6M14 11v6"],
  pin: ["M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
  plus: ["M12 5v14M5 12h14"],
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
  tag: ["M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z", "M7.5 7.5h.01"],
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const STATUS = {
  approved: { key: "place_status_approved", tone: "live" },
  rejected: { key: "place_status_rejected", tone: "bad" },
};

export function schedulePath(item) {
  return `/host-calendar?place=${encodeURIComponent(item.id)}`;
}

// The owner's places. A place opens its own schedule; sale listings have none,
// so they open their details instead.
export function ListingsPage({ listings = [], bookings = [], onEdit, onDelete }) {
  const { t, plural } = useText();
  const [selectedListing, setSelectedListing] = useState(null);
  const clearDraft = () => removeStorageItem(STORAGE_KEYS.workflow.editPlaceId);

  const open = (item) => {
    if (item.isForSale) setSelectedListing(item);
    else navigate(schedulePath(item));
  };

  // Buttons inside the card must not also open the card.
  const act = (fn) => (event) => {
    event.stopPropagation();
    fn();
  };

  return (
    <section className="hl">
      <header className="hl-head">
        <div>
          <h2>{t("list_title")}</h2>
          <p>
            {listings.length ? <b>{t("list_count", { n: listings.length })}</b> : null}
            {listings.length ? t("list_hint") : null}
          </p>
        </div>
        <a className="hl-add" href="/partner" onClick={clearDraft}>
          <Icon name="plus" />
          {t("cab_add_place")}
        </a>
      </header>


      {listings.length === 0 ? (
        <div className="hl-empty">
          <span className="hl-empty-icon"><Icon name="calendar" /></span>
          <h3>{t("list_empty_title")}</h3>
          <p>{t("list_empty_text")}</p>
          <a className="hl-add" href="/partner" onClick={clearDraft}>
            <Icon name="plus" />
            {t("cab_add_place")}
          </a>
        </div>
      ) : (
        <div className="hl-layout">
          <div className="hl-grid">
            {listings.map((item) => {
              const status = STATUS[item.status] || { key: "place_status_pending", tone: "wait" };
              const hasSchedule = !item.isForSale;
              return (
                <article
                  key={item.id || item.title}
                  className={`hl-card${hasSchedule ? "" : " is-sale"}`}
                  role="link"
                  tabIndex={0}
                  aria-label={item.title}
                  onClick={() => open(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") open(item);
                  }}
                >
                  <div className="hl-photo">
                    <img src={item.images?.[0]} alt="" loading="lazy" />
                    <span className={`hl-status is-${status.tone}`}>{t(status.key)}</span>
                    <span className="hl-price">{item.price}</span>
                    <span className="hl-photo-cta" aria-hidden="true">
                      <Icon name={hasSchedule ? "calendar" : "eye"} />
                      {hasSchedule ? t("list_schedule") : t("list_view")}
                    </span>
                  </div>
  
                  <div className="hl-body">
                    <small className="hl-category">
                      {item.isForSale ? <><Icon name="tag" />{t("list_for_sale")}</> : item.subcategory_name || item.category}
                    </small>
                    <h3>{item.title}</h3>
                    <p className="hl-location"><Icon name="pin" />{item.location}</p>
  
                    {item.status === "rejected" && item.moderator_note ? (
                      <div className="hl-note">
                        <strong>{t("list_reject_reason")}</strong>
                        <p>{item.moderator_note}</p>
                      </div>
                    ) : null}
  
                    {hasSchedule ? (
                      <div className="hl-stats">
                        <span>{plural("list_bookings", item.bookings_count || 0)}</span>
                        <span>{t("list_occupancy", { value: item.occupancy || "0%" })}</span>
                      </div>
                    ) : (
                      <p className="hl-muted">{t("list_no_schedule")}</p>
                    )}
                  </div>
  
                  <footer className="hl-actions">
                    {hasSchedule ? (
                      <a className="hl-schedule" href={schedulePath(item)} onClick={(event) => event.stopPropagation()}>
                        <Icon name="calendar" />
                        <span>{t("list_schedule")}</span>
                        <Icon name="arrow" />
                      </a>
                    ) : (
                      <button type="button" className="hl-schedule is-soft" onClick={act(() => setSelectedListing(item))}>
                        <Icon name="eye" />
                        <span>{t("list_view")}</span>
                      </button>
                    )}
                    {hasSchedule ? (
                      <button type="button" className="hl-icon" title={t("list_view")} aria-label={t("list_view")} onClick={act(() => setSelectedListing(item))}>
                        <Icon name="eye" />
                      </button>
                    ) : null}
                    <button type="button" className="hl-icon" title={t("cab_edit")} aria-label={t("cab_edit")} onClick={act(() => onEdit(item))}>
                      <Icon name="edit" />
                    </button>
                    <button type="button" className="hl-icon is-danger" title={t("cab_delete")} aria-label={t("cab_delete")} onClick={act(() => onDelete(item))}>
                      <Icon name="trash" />
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
          <aside className="hl-side">
            <TodayStrip bookings={bookings} />
            <PlacesStatusWidget listings={listings} onEdit={onEdit} />
            <TopPlacesWidget listings={listings} bookings={bookings} />
          </aside>
        </div>
      )}

      {selectedListing && (
        <HostListingDetailModal
          item={selectedListing}
          onClose={() => setSelectedListing(null)}
          onEdit={onEdit}
        />
      )}
    </section>
  );
}
