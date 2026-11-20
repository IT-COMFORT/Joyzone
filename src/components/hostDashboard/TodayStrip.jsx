import React, { useMemo } from "react";
import { useText } from "../../context/LanguageContext.jsx";
import { buildPartnerStats, selectTodayBookings, selectUpcomingBookings } from "../../utils/partnerDashboard.js";
import { formatDayMonth } from "../../utils/localeDate.js";
import { formatMoneyShort } from "./shared.jsx";
import "./todayStrip.css";

const SUN = ["M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"];

const STATUS_TONE = { confirmed: "good", completed: "good", pending: "wait", blocked: "muted" };

// "Today" at a glance, as a compact side card: today's bookings, or the next
// ones when today is free. Beside "My places" it covers every place; beside a
// place's schedule, that place only.
export function TodayStrip({ bookings = [], scope = "all" }) {
  const { t, plural, lang } = useText();
  const today = useMemo(() => selectTodayBookings(bookings), [bookings]);
  const upcoming = useMemo(() => selectUpcomingBookings(bookings, new Date(), 3), [bookings]);
  const stats = useMemo(() => buildPartnerStats([], bookings), [bookings]);
  const list = today.length ? today : upcoming;
  const showPlace = scope === "all";

  const figures = [
    { label: t("host_stat_waiting"), value: stats.pendingBookings, tone: stats.pendingBookings ? "wait" : "" },
    { label: t("host_stat_confirmed"), value: stats.confirmedBookings, tone: stats.confirmedBookings ? "good" : "" },
    { label: t("host_stat_revenue"), value: formatMoneyShort(stats.approximateRevenue), unit: "UZS" },
  ];

  return (
    <section className="tds">
      <header className="tds-head">
        <span className="tds-sun">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{SUN.map((d) => <path key={d} d={d} />)}</svg>
        </span>
        <div>
          <small>{t("host_kicker_today")} · {formatDayMonth(new Date(), lang)}</small>
          <h3>{today.length ? plural("host_today_count", today.length) : t("host_today_none")}</h3>
        </div>
      </header>

      <div className="tds-figures">
        {figures.map((item) => (
          <div key={item.label} className={`tds-figure${item.tone ? ` is-${item.tone}` : ""}`}>
            <strong>{item.value}{item.unit ? <em>{item.unit}</em> : null}</strong>
            <small>{item.label}</small>
          </div>
        ))}
      </div>

      <div className="tds-list">
        <span className="tds-list-title">
          {today.length ? t("host_kicker_today") : t("host_kicker_soon")}
          <i>{t(showPlace ? "today_all_places" : "today_this_place")}</i>
        </span>
        {list.length ? (
          <ul>
            {list.slice(0, 4).map((booking) => (
              <li key={booking.id || `${booking.space}-${booking.start_time}`}>
                <span className="tds-when">{today.length ? booking.time : booking.date}</span>
                <div className="tds-who">
                  <strong>{showPlace ? booking.space : booking.company}</strong>
                  <small>{showPlace ? booking.company : booking.durationText} · {booking.guests}</small>
                </div>
                <span className={`tds-state is-${STATUS_TONE[booking.status] || "wait"}`} title={booking.statusLabel} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="tds-empty">{t("host_no_upcoming")}</p>
        )}
      </div>
    </section>
  );
}
