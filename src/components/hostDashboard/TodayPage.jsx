import { DashboardIcon, EmptyPanel } from "./shared.jsx";
import { formatMoneyShort } from "./shared.jsx";
import React from "react";
import { useText } from "../../context/LanguageContext.jsx";

export function TodayPage({ todayBookings = [], upcomingBookings = [], stats, usingFallback = false }) {
  const { t, plural } = useText();
  const hasBookings = todayBookings.length > 0;
  const statCards = [
    { label: t("host_stat_revenue"), value: `${formatMoneyShort(stats.approximateRevenue)} UZS`, icon: "price", tone: "accent", wide: true },
    { label: t("host_stat_active"), value: stats.activeListings, icon: "listing" },
    { label: t("host_stat_moderation"), value: stats.pendingPlaces, icon: "clock", tone: stats.pendingPlaces ? "warn" : "" },
    { label: t("host_stat_rejected"), value: stats.rejectedPlaces, icon: "empty", tone: stats.rejectedPlaces ? "bad" : "" },
    { label: t("host_stat_waiting"), value: stats.pendingBookings, icon: "clock", tone: stats.pendingBookings ? "warn" : "" },
    { label: t("host_stat_confirmed"), value: stats.confirmedBookings, icon: "check", tone: "good" },
    { label: t("host_stat_completed"), value: stats.completedBookings, icon: "check" },
    { label: t("host_stat_blocked"), value: stats.blockedSlots, icon: "calendar" },
  ];

  return (
    <div className="host-page-grid host-page-grid-today">
      <section className="host-main-surface">
        <div className="host-section-head">
          <div>
            <span>{t("host_kicker_today")}{usingFallback ? " · DEV fallback" : ""}</span>
            <h2>{hasBookings ? plural("host_today_count", todayBookings.length) : t("host_today_none")}</h2>
          </div>
          <a href="/host-calendar">{t("host_upcoming_link")}<DashboardIcon type="arrow" /></a>
        </div>

        {hasBookings ? (
          <div className="host-booking-list">
            {todayBookings.map((booking) => (
              <article data-testid={`host-booking-${booking.id}`} className="host-booking-card" key={booking.id || `${booking.space}-${booking.time}`}>
                <div className="host-booking-time">
                  <DashboardIcon type="clock" />
                  <strong>{booking.time}</strong>
                </div>
                <div>
                  <span>{booking.statusLabel || booking.status}</span>
                  <h3>{booking.space}</h3>
                  <p>{booking.company} · {booking.guests}</p>
                </div>
                <p>{booking.note}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel title={t("host_empty_today_title")} text={t("host_empty_today_text")} action={t("host_open_schedule")} href="/host-calendar" />
        )}
      </section>

      <aside className="host-side-surface">
        <div className="host-section-head compact">
          <div>
            <span>{t("host_kicker_cabinet")}</span>
            <h2>{t("host_summary")}</h2>
          </div>
        </div>
        <div className="host-stat-grid">
          {statCards.map((item) => (
            <article key={item.label} className={`${item.tone ? `is-${item.tone}` : ""}${item.wide ? " is-wide" : ""}`}>
              <span className="host-stat-icon"><DashboardIcon type={item.icon} /></span>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
        <div className="host-section-head compact host-side-subhead">
          <div>
            <span>{t("host_kicker_soon")}</span>
            <h2>{t("host_upcoming_title")}</h2>
          </div>
        </div>
        <div className="host-upcoming-list">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => (
              <article data-testid={`host-upcoming-booking-${booking.id}`} key={booking.id || `${booking.title}-${booking.date}`}>
                <span>{booking.date}</span>
                <strong>{booking.title}</strong>
                <small>{booking.type}</small>
              </article>
            ))
          ) : (
            <article>
              <span>{t("host_none")}</span>
              <strong>{t("host_no_upcoming")}</strong>
              <small>{t("host_no_upcoming_text")}</small>
            </article>
          )}
        </div>
      </aside>
    </div>
  );
}
