import { FALLBACK_HOST_LISTINGS, formatMoneyShort, buildHostCalendarDays, formatCalendarMonthTitle, discountText, EmptyPanel, DashboardIcon } from "./shared.jsx";
import { useText } from "../../context/LanguageContext.jsx";
import { formatDayMonthShort, formatWeekdayDayMonth } from "../../utils/localeDate.js";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import api, { getApiErrorMessage } from "../../api/client.js";
import { fetchPlaceAvailability, getAvailabilityDay, getAvailabilitySlotStatus, getCalendarAvailabilityRange } from "../../utils/availability.js";
import { buildBlockedBookingPayload, isDateInSelectedRange, selectCalendarDate } from "../../utils/partnerCalendar.js";
import { PlacePricingModal } from "./PlacePricingModal.jsx";
import "./calendar.css";
import "./pricingModal.css";
import { navigate } from "../../utils/router.js";
import { schedulePath } from "./ListingsPage.jsx";
import { TodayStrip } from "./TodayStrip.jsx";

const PRICE_ROWS = ["price_hourly", "price_daily", "price_weekly", "price_monthly"];

const PLACE_STATUS = {
  approved: { label: "place_status_approved", tone: "good" },
  pending: { label: "place_status_pending", tone: "warn" },
  rejected: { label: "place_status_rejected", tone: "bad" },
};

const BOOKING_STATUS = {
  pending: { label: "cal_status_waiting", tone: "warn" },
  confirmed: { label: "status_confirmed", tone: "good" },
  completed: { label: "status_completed", tone: "muted" },
  blocked: { label: "cal_status_blocked", tone: "muted" },
  cancelled: { label: "status_cancelled", tone: "bad" },
};

// The default note the site saves when an owner closes time without a reason.
const AUTO_BLOCK_NOTE = "Ручная блокировка владельцем";

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function hhmm(value, fallback) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

function clock(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Bookings of one place that overlap the [startKey, endKey] day range.
function bookingsInRange(bookings, startKey, endKey) {
  if (!startKey) return [];
  const from = dateFromKey(startKey).getTime();
  const to = dateFromKey(endKey || startKey).getTime() + 24 * 3600 * 1000;
  return bookings
    .filter((booking) => booking.status !== "cancelled")
    .filter((booking) => new Date(booking.start_time).getTime() < to && new Date(booking.end_time).getTime() > from)
    .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime());
}

function Pill({ tone, children }) {
  return <span className={`hcal-pill is-${tone}`}>{children}</span>;
}

export function CalendarPage({ placeId = "", listings = [], bookings = [], usingFallback = false, onBookingCreated, onPlaceUpdated, onEditPlace }) {
  const { t, plural, lang, locale } = useText();
  const formatPrice = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? `${amount.toLocaleString(locale)} ${t("cab_sum")}` : null;
  };
  const displayListings = useMemo(
    () => listings.length > 0 ? listings : (usingFallback && import.meta.env.DEV ? FALLBACK_HOST_LISTINGS : []),
    [listings, usingFallback],
  );
  // Sale listings have no schedule. The place comes from the address (?place=),
  // and is read from the list so a refreshed place (after saving prices) shows up at once.
  const schedulable = useMemo(() => displayListings.filter((item) => !item.isForSale), [displayListings]);
  const activeSpace = schedulable.find((item) => String(item.id) === String(placeId)) || schedulable[0] || null;
  const [pricingOpen, setPricingOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [calendarYear, setCalendarYear] = useState(() => today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => today.getMonth());
  const [availability, setAvailability] = useState(null);
  const [calendarError, setCalendarError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selection, setSelection] = useState({ startDate: "", endDate: "" });
  const [blockMode, setBlockMode] = useState("daily");
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("18:00");
  const [blockNote, setBlockNote] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [busyBookingId, setBusyBookingId] = useState(null);
  const [calendarNotice, setCalendarNotice] = useState("");
  const [discounts, setDiscounts] = useState([]);

  useEffect(() => {
    let alive = true;
    api.get("/api/discounts/", { skipAuth: true })
      .then((response) => {
        const items = response.data?.results || response.data || [];
        if (alive) setDiscounts(Array.isArray(items) ? items : []);
      })
      .catch(() => alive && setDiscounts([]));
    return () => { alive = false; };
  }, []);

  const activeSpaceId = activeSpace?.id || activeSpace?._id;
  const opensAt = hhmm(activeSpace?.opens_at, "09:00");
  const closesAt = hhmm(activeSpace?.closes_at, "18:00");

  const loadAvailability = useCallback(async () => {
    if (!activeSpaceId) {
      setAvailability(null);
      return;
    }
    setAvailabilityLoading(true);
    const range = getCalendarAvailabilityRange(calendarYear, calendarMonth);
    try {
      const data = await fetchPlaceAvailability({ placeId: activeSpaceId, ...range, skipAuth: false });
      setAvailability(data);
      setCalendarError("");
    } catch (err) {
      setCalendarError(getApiErrorMessage(err, t("cal_err_availability"), lang));
      setAvailability(null);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [activeSpaceId, calendarYear, calendarMonth, t, lang]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    setSelection({ startDate: "", endDate: "" });
    setCalendarNotice("");
  }, [activeSpaceId, calendarYear, calendarMonth]);

  useEffect(() => {
    setBlockStartTime(opensAt);
    setBlockEndTime(closesAt);
  }, [opensAt, closesAt]);

  const changeMonth = (offset) => {
    const nextMonth = new Date(calendarYear, calendarMonth + offset, 1);
    setCalendarYear(nextMonth.getFullYear());
    setCalendarMonth(nextMonth.getMonth());
  };

  const goToday = () => {
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth());
  };

  const handleDayClick = (dateStr) => {
    if (!dateStr) return;
    setSelection((current) => {
      const next = selectCalendarDate(current.startDate, current.endDate, dateStr);
      if (next.startDate !== next.endDate) setBlockMode("daily");
      return next;
    });
    setCalendarError("");
    setCalendarNotice("");
  };

  const refreshAll = async () => {
    await loadAvailability();
    await onBookingCreated?.();
  };

  const handleCreateBlock = async () => {
    if (usingFallback) {
      setCalendarError(t("cal_err_close"));
      return;
    }

    let payload;
    try {
      payload = buildBlockedBookingPayload({
        placeId: activeSpaceId,
        startDate: selection.startDate,
        endDate: selection.endDate,
        mode: blockMode,
        startTime: blockStartTime,
        endTime: blockEndTime,
        note: blockNote,
      });
    } catch (error) {
      setCalendarError(t(error.message));
      return;
    }

    setBlocking(true);
    setCalendarError("");
    setCalendarNotice("");
    try {
      await api.post("/api/bookings/", payload);
      await refreshAll();
      setCalendarNotice(t("cal_closed_ok"));
      setBlockNote("");
    } catch (error) {
      const hasOverlap = Boolean(error.response?.data?.non_field_errors);
      setCalendarError(hasOverlap
        ? t("cal_err_overlap")
        : getApiErrorMessage(error, t("cal_err_close"), lang));
    } finally {
      setBlocking(false);
    }
  };

  const handleBookingAction = async (booking, action) => {
    const messages = {
      confirm: t("cal_confirmed_ok"),
      cancel: t(booking.status === "blocked" ? "cal_reopened_ok" : "cal_declined_ok"),
    };
    setBusyBookingId(booking.id);
    setCalendarError("");
    setCalendarNotice("");
    try {
      await api.post(`/api/bookings/${booking.id}/${action}/`);
      await refreshAll();
      setCalendarNotice(messages[action]);
    } catch (error) {
      setCalendarError(getApiErrorMessage(error, t("cal_err_change"), lang));
    } finally {
      setBusyBookingId(null);
    }
  };

  const placeBookings = useMemo(
    () => bookings.filter((booking) => String(booking.place_id) === String(activeSpaceId)),
    [bookings, activeSpaceId],
  );

  const dayPriceLabel = useMemo(() => {
    const daily = Number(activeSpace?.price_daily);
    const hourly = Number(activeSpace?.price_hourly);
    if (daily > 0) return `${formatMoneyShort(daily)} ${t("cab_sum")}`;
    if (hourly > 0) return t("cal_per_hour_short", { price: formatMoneyShort(hourly) });
    return "";
  }, [activeSpace, t]);

  const calendarDays = useMemo(
    () => buildHostCalendarDays(calendarYear, calendarMonth, availability, dayPriceLabel),
    [calendarYear, calendarMonth, availability, dayPriceLabel],
  );

  const monthStats = useMemo(() => {
    const realDays = calendarDays.filter((day) => day.label);
    const monthStart = new Date(calendarYear, calendarMonth, 1).getTime();
    const monthEnd = new Date(calendarYear, calendarMonth + 1, 1).getTime();
    const monthBookings = placeBookings.filter((booking) => {
      const start = new Date(booking.start_time).getTime();
      return start >= monthStart && start < monthEnd && !["cancelled", "blocked"].includes(booking.status);
    });
    return {
      free: realDays.filter((day) => day.status === "free").length,
      booked: realDays.filter((day) => day.status === "booked").length,
      blocked: realDays.filter((day) => day.status === "blocked").length,
      bookings: monthBookings.length,
      pending: monthBookings.filter((booking) => booking.status === "pending").length,
      revenue: monthBookings.reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0),
    };
  }, [calendarDays, placeBookings, calendarYear, calendarMonth]);

  const placeDiscounts = useMemo(() => {
    const ids = new Set((activeSpace?.discount_ids || []).map(String));
    return discounts.filter((item) => item.is_active !== false && ids.has(String(item.id)));
  }, [discounts, activeSpace]);

  const isSingleDay = selection.startDate && selection.startDate === selection.endDate;
  const selectedBookings = useMemo(
    () => bookingsInRange(placeBookings, selection.startDate, selection.endDate),
    [placeBookings, selection.startDate, selection.endDate],
  );
  const selectedDayAvailability = getAvailabilityDay(availability, selection.startDate);
  const workingSlots = useMemo(() => {
    const first = Number(opensAt.slice(0, 2));
    const last = Math.max(first + 1, Number(closesAt.slice(0, 2)) + (closesAt.endsWith(":00") ? 0 : 1));
    return Array.from({ length: last - first }, (_, index) => {
      const label = `${String(first + index).padStart(2, "0")}:00`;
      return { label, status: getAvailabilitySlotStatus(availability, selection.startDate, label) };
    });
  }, [availability, selection.startDate, opensAt, closesAt]);
  const selectionTitle = !selection.startDate
    ? ""
    : isSingleDay
      ? formatWeekdayDayMonth(dateFromKey(selection.startDate), lang)
      : `${formatDayMonthShort(dateFromKey(selection.startDate), lang)} — ${formatDayMonthShort(dateFromKey(selection.endDate), lang)}`;
  const selectionInPast = selection.startDate && selection.startDate < todayKey;
  const placeStatus = PLACE_STATUS[activeSpace?.status] || PLACE_STATUS.pending;
  const monthName = formatCalendarMonthTitle(calendarYear, calendarMonth, lang);

  return (
    <div className="host-calendar-page-container hcal">
      <div className="hcal-bar">
        <a className="hcal-back" href="/host-listings">
          <DashboardIcon type="chevronLeft" />
          <span>{t("cal_back")}</span>
        </a>
        {activeSpace ? (
          <div className="hcal-place">
            <img src={activeSpace.images?.[0] || "/placeholder-space.jpg"} alt="" />
            <div>
              <small>{t("cal_kicker")}{usingFallback ? " · DEV fallback" : ""}</small>
              <strong>{activeSpace.title}</strong>
              <span>{activeSpace.location}</span>
            </div>
          </div>
        ) : null}
        {schedulable.length > 1 ? (
          <label className="hcal-switch">
            <span>{t("cal_switch_place")}</span>
            <select value={activeSpace?.id ?? ""} onChange={(event) => navigate(schedulePath({ id: event.target.value }))}>
              {schedulable.map((space) => <option key={space.id} value={space.id}>{space.title}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      {!activeSpace ? (
        <EmptyPanel title={t("cal_no_places_title")} text={t("cal_no_places_text")} action={t("cab_add_place")} href="/partner" />
      ) : null}

      {activeSpace ? (
        <div className="hcal-layout">
          <aside className="hcal-side">
            <section className="hcal-card">
              <div className="hcal-card-head">
                <span>{t("cal_terms")}</span>
                <Pill tone={placeStatus.tone}>{t(placeStatus.label)}</Pill>
              </div>
              <ul className="hcal-prices">
                {PRICE_ROWS.map((row) => {
                  const value = formatPrice(activeSpace[row]);
                  return (
                    <li key={row} className={value ? "" : "is-empty"}>
                      <span>{t(row)}</span>
                      <strong>{value || t("cal_not_set")}</strong>
                    </li>
                  );
                })}
              </ul>
              <div className="hcal-hours">
                <DashboardIcon type="clock" />
                <div>
                  <small>{t("cal_hours")}</small>
                  <strong>{opensAt} – {closesAt}</strong>
                </div>
              </div>
              <div className="hcal-discounts">
                <small>{t("cal_discounts")}</small>
                {placeDiscounts.length ? (
                  <div>
                    {placeDiscounts.map((item) => (
                      <span key={item.id} title={discountText(item, "description", lang)}>−{item.percent}% · {discountText(item, "name", lang)}</span>
                    ))}
                  </div>
                ) : <p>{t("cal_no_discounts")}</p>}
              </div>
              {!usingFallback ? (
                <>
                  <button type="button" className="hcal-edit" onClick={() => setPricingOpen(true)}>
                    <DashboardIcon type="price" />
                    {t("cal_edit_prices")}
                  </button>
                  {onEditPlace ? (
                    <button type="button" className="hcal-edit-link" onClick={() => onEditPlace(activeSpace)}>
                      {t("cal_edit_listing")}
                    </button>
                  ) : null}
                </>
              ) : null}
            </section>

            <section className="hcal-card">
              <div className="hcal-card-head">
                <span>{monthName}</span>
              </div>
              <div className="hcal-month-stats">
                <div className="is-free"><strong>{monthStats.free}</strong><small>{t("cal_free")}</small></div>
                <div className="is-booked"><strong>{monthStats.booked}</strong><small>{t("cal_booked")}</small></div>
                <div className="is-blocked"><strong>{monthStats.blocked}</strong><small>{t("cal_closed")}</small></div>
              </div>
              <ul className="hcal-month-list">
                <li><span>{t("cal_month_bookings")}</span><strong>{monthStats.bookings}</strong></li>
                <li className={monthStats.pending ? "is-warn" : ""}><span>{t("cal_waiting")}</span><strong>{monthStats.pending}</strong></li>
                <li><span>{t("cal_month_sum")}</span><strong>{formatPrice(monthStats.revenue) || `0 ${t("cab_sum")}`}</strong></li>
              </ul>
            </section>

            <TodayStrip bookings={placeBookings} scope="place" />

            <section className="hcal-card hcal-help">
              <div className="hcal-card-head"><span>{t("cal_help_title")}</span></div>
              <ol>
                <li>{t("cal_help_1")}</li>
                <li>{t("cal_help_2")}</li>
                <li>{t("cal_help_3")}</li>
              </ol>
            </section>
          </aside>

          <section className="hcal-main">
            <header className="hcal-main-head">
              <div>
                <h2>{monthName}</h2>
                <p>{activeSpace.title}</p>
              </div>
              <div className="hcal-nav">
                <button type="button" className="hcal-today" onClick={goToday}>{t("cal_today")}</button>
                <button type="button" onClick={() => changeMonth(-1)} aria-label={t("cal_prev")}><DashboardIcon type="chevronLeft" /></button>
                <button type="button" onClick={() => changeMonth(1)} aria-label={t("cal_next")}><DashboardIcon type="chevronRight" /></button>
              </div>
            </header>

            <div className="hcal-legend">
              <span><i className="is-free" />{t("cal_legend_free")}</span>
              <span><i className="is-booked" />{t("cal_legend_booked")}</span>
              <span><i className="is-blocked" />{t("cal_legend_blocked")}</span>
              <span><i className="is-today" />{t("cal_today")}</span>
            </div>

            {calendarError ? <div className="hcal-alert is-error" role="alert">{calendarError}</div> : null}
            {calendarNotice ? <div className="hcal-alert is-success" role="status">{calendarNotice}</div> : null}

            <div className={`hcal-grid-wrap${availabilityLoading ? " is-loading" : ""}`}>
              <div className="hcal-weekdays">
                {String(t("cal_weekdays")).split(",").map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="hcal-grid">
                {calendarDays.map((day, index) => {
                  if (!day.label) return <span key={`empty-${index}`} className="hcal-day is-empty" aria-hidden="true" />;
                  const isSelected = isDateInSelectedRange(day.dateStr, selection.startDate, selection.endDate);
                  const count = getAvailabilityDay(availability, day.dateStr)?.bookings?.filter((item) => item.status !== "blocked").length || 0;
                  const isPast = day.dateStr < todayKey;
                  const caption = day.status === "blocked"
                    ? t("cal_day_closed")
                    : count
                      ? plural("cal_day_count", count)
                      : day.price || t("cal_day_free");
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      className={[
                        "hcal-day",
                        `is-${day.status}`,
                        isSelected ? "is-selected" : "",
                        day.dateStr === todayKey ? "is-today" : "",
                        isPast ? "is-past" : "",
                      ].join(" ")}
                      disabled={availabilityLoading}
                      onClick={() => handleDayClick(day.dateStr)}
                      aria-pressed={isSelected}
                      aria-label={`${day.label}: ${caption}`}
                    >
                      <strong>{day.label}</strong>
                      <small className="hcal-day-long">{caption}</small>
                      <small className="hcal-day-short" aria-hidden="true">{day.status === "blocked" ? t("cal_day_closed_short") : count ? t("cal_day_count_short", { n: count }) : ""}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            {selection.startDate ? (
              <div className="hcal-day-panel">
                <div className="hcal-day-panel-head">
                  <div>
                    <span>{t(isSingleDay ? "cal_selected_day" : "cal_selected_period")}</span>
                    <h3>{selectionTitle}</h3>
                  </div>
                  <button type="button" onClick={() => setSelection({ startDate: "", endDate: "" })} aria-label={t("cal_reset")}>
                    <DashboardIcon type="close" />
                  </button>
                </div>

                {isSingleDay ? (
                  <div className="hcal-slots" aria-label={t("cal_slots_label")}>
                    {workingSlots.map((slot) => (
                      <span key={slot.label} className={`is-${slot.status}`} title={`${slot.label}: ${t(slot.status === "booked" ? "cal_slot_booked" : slot.status === "blocked" ? "cal_closed" : "cal_free")}`}>
                        {slot.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="hcal-bookings">
                  <h4>{t(isSingleDay ? "cal_bookings_day" : "cal_bookings_period")} <small>{selectedBookings.length}</small></h4>
                  {selectedBookings.length ? selectedBookings.map((booking) => {
                    const status = BOOKING_STATUS[booking.status] || BOOKING_STATUS.pending;
                    const isBlock = booking.status === "blocked";
                    const busy = busyBookingId === booking.id;
                    return (
                      <article key={booking.id} className={`hcal-booking is-${booking.status}`}>
                        <div className="hcal-booking-time">
                          <strong>{clock(booking.start_time)}</strong>
                          <small>{clock(booking.end_time)}</small>
                        </div>
                        <div className="hcal-booking-body">
                          <strong>{isBlock ? (booking.ownerNote && booking.ownerNote !== AUTO_BLOCK_NOTE ? booking.ownerNote : t("cal_closed_owner")) : (booking.client_name || t("host_client"))}</strong>
                          <small>
                            {isBlock ? booking.durationText : [booking.client_phone !== booking.client_name ? booking.client_phone : "", booking.durationText, formatPrice(booking.amount)].filter(Boolean).join(" · ")}
                          </small>
                        </div>
                        <Pill tone={status.tone}>{t(status.label)}</Pill>
                        <div className="hcal-booking-actions">
                          {booking.status === "pending" ? (
                            <>
                              <button type="button" className="is-primary" disabled={busy} onClick={() => handleBookingAction(booking, "confirm")}>{t("cal_confirm")}</button>
                              <button type="button" disabled={busy} onClick={() => handleBookingAction(booking, "cancel")}>{t("cal_decline")}</button>
                            </>
                          ) : null}
                          {isBlock ? (
                            <button type="button" disabled={busy} onClick={() => handleBookingAction(booking, "cancel")}>{t("cal_reopen")}</button>
                          ) : null}
                        </div>
                      </article>
                    );
                  }) : <p className="hcal-muted">{t("cal_no_bookings")}</p>}
                </div>

                {selectionInPast ? (
                  <p className="hcal-muted">{t("cal_past")}</p>
                ) : (
                  <div className="hcal-block-form">
                    <h4>{t(isSingleDay ? "cal_close_day_title" : "cal_close_period_title")}</h4>
                    <div className="hcal-segment" aria-label={t("cal_block_type")}>
                      <button type="button" className={blockMode === "daily" ? "is-active" : ""} onClick={() => setBlockMode("daily")}>{t("cal_all_day")}</button>
                      <button
                        type="button"
                        className={blockMode === "hourly" ? "is-active" : ""}
                        disabled={!isSingleDay}
                        title={isSingleDay ? "" : t("cal_hours_only_hint")}
                        onClick={() => setBlockMode("hourly")}
                      >
                        {t("cal_hours_only")}
                      </button>
                    </div>
                    <div className="hcal-form-row">
                      {blockMode === "hourly" && isSingleDay ? (
                        <>
                          <label>{t("cal_from")}<input type="time" value={blockStartTime} onChange={(event) => setBlockStartTime(event.target.value)} /></label>
                          <label>{t("cal_to")}<input type="time" value={blockEndTime} onChange={(event) => setBlockEndTime(event.target.value)} /></label>
                        </>
                      ) : null}
                      <label className="is-grow">
                        {t("cal_reason")}
                        <input value={blockNote} onChange={(event) => setBlockNote(event.target.value)} placeholder={t("cal_reason_ph")} />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="hcal-submit"
                      disabled={blocking || availabilityLoading || usingFallback || !activeSpaceId}
                      onClick={handleCreateBlock}
                    >
                      {blocking ? t("cab_saving") : t(isSingleDay ? "cal_close_day" : "cal_close_period")}
                    </button>
                    {selectedDayAvailability?.bookings?.length && blockMode === "daily" ? (
                      <p className="hcal-hint">{t("cal_day_has_bookings")}</p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <p className="hcal-pick-hint">{t("cal_pick_hint")}</p>
            )}
          </section>
        </div>
      ) : null}

      {pricingOpen && activeSpace ? (
        <PlacePricingModal
          place={activeSpace}
          onClose={() => setPricingOpen(false)}
          onSaved={async (place) => {
            setPricingOpen(false);
            await onPlaceUpdated?.();
            setCalendarNotice(t(place?.status === "pending" ? "cal_saved_moderation" : "cal_saved"));
          }}
        />
      ) : null}
    </div>
  );
}
