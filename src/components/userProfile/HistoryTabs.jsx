import React, { useMemo, useState } from "react";
import { normalizePlace } from "../../utils/placeMapper.js";
import { useText } from "../../context/LanguageContext.jsx";
import {
  CANCELLABLE_BOOKING_STATUSES,
  EmptyState,
  PAID_PAYMENT_STATUSES,
  ProfileIcon,
  bookingStatusLabel,
  bookingStatusTone,
  formatBookingPeriod,
  formatClock,
  formatMoney,
  formatShortDate,
  paymentProviderLabel,
  paymentStatusLabel,
  paymentStatusTone,
  paymentSubject,
} from "./helpers.jsx";
import "./historyTabs.css";

export function StatusPill({ tone = "muted", children }) {
  return <span className={`upx-pill is-${tone}`}>{children}</span>;
}

function SummaryCard({ label, value, hint, accent = false }) {
  return (
    <div className={`upx-summary-card${accent ? " is-accent" : ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

function StateBox({ tone, children }) {
  return <div className={`profile-bookings-state${tone ? ` is-${tone}` : ""}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

function bookingImage(booking) {
  const details = booking.place_details;
  if (!details) return "";
  return normalizePlace(details).images?.[0] || "";
}

export function isActiveBooking(booking) {
  return ["pending", "confirmed"].includes(booking.status) && new Date(booking.end_time).getTime() >= Date.now();
}

const BOOKING_FILTERS = [
  { id: "all", labelKey: "hist_all", test: () => true },
  { id: "active", labelKey: "hist_active", test: isActiveBooking },
  { id: "past", labelKey: "hist_past", test: (booking) => booking.status === "completed" || (booking.status === "confirmed" && new Date(booking.end_time).getTime() < Date.now()) },
  { id: "cancelled", labelKey: "hist_cancelled", test: (booking) => booking.status === "cancelled" },
];

export function BookingHistory({
  bookings,
  loading,
  error,
  success,
  actionError,
  cancellingId,
  onRetry,
  onCancel,
}) {
  const { t, lang } = useText();
  const [filter, setFilter] = useState("all");
  const counts = useMemo(
    () => Object.fromEntries(BOOKING_FILTERS.map((item) => [item.id, bookings.filter(item.test).length])),
    [bookings],
  );
  const visible = useMemo(() => {
    const active = BOOKING_FILTERS.find((item) => item.id === filter) || BOOKING_FILTERS[0];
    return [...bookings]
      .filter(active.test)
      .sort((left, right) => new Date(right.start_time).getTime() - new Date(left.start_time).getTime());
  }, [bookings, filter]);
  const spent = bookings
    .filter((booking) => PAID_PAYMENT_STATUSES.has(booking.payment_status) && booking.status !== "cancelled")
    .reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0);

  return (
    <div className="profile-tab-panel" key="history">
      {success ? <StateBox tone="success">{success}</StateBox> : null}
      {actionError ? <StateBox tone="error">{actionError}</StateBox> : null}

      {loading ? (
        <div className="upx-skeleton-list">{[0, 1, 2].map((key) => <div key={key} className="upx-skeleton" />)}</div>
      ) : error ? (
        <StateBox tone="error">
          <p>{error}</p>
          <button type="button" className="profile-booking-link" onClick={onRetry}>{t("cab_retry")}</button>
        </StateBox>
      ) : bookings.length === 0 ? (
        <EmptyState
          title={t("hist_empty_title")}
          text={t("hist_empty_text")}
          action={t("hist_empty_action")}
          href="/filter"
        />
      ) : (
        <>
          <div className="upx-summary-row">
            <SummaryCard label={t("hist_total")} value={bookings.length} accent />
            <SummaryCard label={t("hist_active")} value={counts.active} hint={t("hist_active_hint")} />
            <SummaryCard label={t("hist_spent")} value={formatMoney(spent)} hint={t("hist_spent_hint")} />
          </div>

          <div className="upx-filter-row" role="tablist" aria-label={t("hist_filter_label")}>
            {BOOKING_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? "is-active" : ""}
                onClick={() => setFilter(item.id)}
              >
                {t(item.labelKey)}
                <small>{counts[item.id]}</small>
              </button>
            ))}
            <a className="upx-filter-book" href="/filter">{t("hist_book")}</a>
          </div>

          {visible.length === 0 ? (
            <p className="upx-filter-empty">{t("hist_filter_empty")}</p>
          ) : (
            <div className="upx-booking-list">
              {visible.map((booking) => {
                const image = bookingImage(booking);
                const canCancel = CANCELLABLE_BOOKING_STATUSES.has(booking.status);
                return (
                  <article key={booking.id} className={`upx-booking is-${booking.status}`}>
                    <a className="upx-booking-thumb" href={booking.href} aria-label={booking.place_title}>
                      {image ? <img src={image} alt="" loading="lazy" /> : <ProfileIcon type="listing" />}
                    </a>

                    <div className="upx-booking-main">
                      <div className="upx-booking-pills">
                        <StatusPill tone={bookingStatusTone(booking.status)}>{bookingStatusLabel(booking.status, t)}</StatusPill>
                        <StatusPill tone={paymentStatusTone(booking.payment_status)}>{paymentStatusLabel(booking.payment_status, t)}</StatusPill>
                      </div>
                      <h3><a href={booking.href}>{booking.place_title}</a></h3>
                      <ul className="upx-booking-meta">
                        <li><ProfileIcon type="calendar" />{formatBookingPeriod(booking, lang)}</li>
                        <li><ProfileIcon type="clock" />{t(`duration_${booking.duration_type || "daily"}`)}</li>
                        {booking.location ? <li className="is-location" title={booking.location}><ProfileIcon type="pin" /><span>{booking.location}</span></li> : null}
                        {booking.guests > 1 ? <li><ProfileIcon type="user" />{t("hist_guests", { n: booking.guests })}</li> : null}
                      </ul>
                      {booking.note ? <p className="upx-booking-note">“{booking.note}”</p> : null}
                    </div>

                    <div className="upx-booking-side">
                      <small>{t("hist_amount")}</small>
                      <strong>{formatMoney(booking.amount, booking.currency)}</strong>
                      <span>#{booking.id} · {formatShortDate(booking.created_at, true, lang)}</span>
                      <div className="upx-booking-actions">
                        <a href={booking.href} className="upx-btn">{t("hist_open_place")}</a>
                        {canCancel ? (
                          <button
                            type="button"
                            className="upx-btn is-danger"
                            disabled={cancellingId === booking.id}
                            onClick={() => onCancel(booking)}
                          >
                            {cancellingId === booking.id ? t("hist_cancelling") : t("hist_cancel")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PaymentHistory({ payments, loading, error, onRetry }) {
  const { t, lang } = useText();
  const [copiedId, setCopiedId] = useState(null);
  const sorted = useMemo(
    () => [...payments].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()),
    [payments],
  );
  const paid = payments.filter((payment) => PAID_PAYMENT_STATUSES.has(payment.status));
  const totalPaid = paid.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const currency = payments[0]?.currency || "UZS";
  const last = sorted[0];

  const copyId = async (payment) => {
    try {
      await navigator.clipboard.writeText(payment.external_id || String(payment.id));
      setCopiedId(payment.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard can be blocked; the id stays visible in the row.
    }
  };

  return (
    <div className="profile-tab-panel" key="payments">
      {loading ? (
        <div className="upx-skeleton-list">{[0, 1].map((key) => <div key={key} className="upx-skeleton is-short" />)}</div>
      ) : error ? (
        <StateBox tone="error">
          <p>{error}</p>
          <button type="button" className="profile-booking-link" onClick={onRetry}>{t("cab_retry")}</button>
        </StateBox>
      ) : payments.length === 0 ? (
        <EmptyState
          title={t("payh_empty_title")}
          text={t("payh_empty_text")}
        />
      ) : (
        <>
          <div className="upx-summary-row">
            <SummaryCard label={t("payh_total")} value={formatMoney(totalPaid, currency)} accent />
            <SummaryCard label={t("payh_count")} value={payments.length} hint={t("payh_success", { n: paid.length })} />
            <SummaryCard label={t("payh_last")} value={formatShortDate(last?.created_at, true, lang)} hint={last ? formatMoney(last.amount, last.currency) : ""} />
          </div>

          <div className="upx-payment-list">
            <div className="upx-payment-head" aria-hidden="true">
              <span>{t("payh_col_payment")}</span>
              <span>{t("payh_col_date")}</span>
              <span>{t("payh_col_method")}</span>
              <span>{t("payh_col_status")}</span>
              <span>{t("payh_col_amount")}</span>
            </div>
            {sorted.map((payment) => {
              const isTariff = Boolean(payment.tariff_subscription_id);
              const reference = payment.external_id || `#${payment.id}`;
              return (
                <article key={payment.id} className="upx-payment">
                  <div className="upx-payment-subject">
                    <span className={`upx-payment-icon${isTariff ? " is-tariff" : ""}`}>
                      <ProfileIcon type={isTariff ? "star" : "calendar"} />
                    </span>
                    <div>
                      <strong>{paymentSubject(payment, t)}</strong>
                      <button type="button" className="upx-ref" onClick={() => copyId(payment)} title={t("payh_copy")}>
                        {copiedId === payment.id ? t("payh_copied") : reference.length > 18 ? `${reference.slice(0, 16)}…` : reference}
                      </button>
                    </div>
                  </div>
                  <div className="upx-payment-cell" data-label={t("payh_col_date")}>
                    {formatShortDate(payment.created_at, true, lang)}
                    <small>{formatClock(payment.created_at)}</small>
                  </div>
                  <div className="upx-payment-cell" data-label={t("payh_col_method")}>{paymentProviderLabel(payment.provider, t)}</div>
                  <div className="upx-payment-cell" data-label={t("payh_col_status")}>
                    <StatusPill tone={paymentStatusTone(payment.status)}>{paymentStatusLabel(payment.status, t)}</StatusPill>
                  </div>
                  <div className="upx-payment-amount" data-label={t("payh_col_amount")}>{formatMoney(payment.amount, payment.currency)}</div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const OVERVIEW_FIELDS = [
  { key: "city", labelKey: "edit_location_label", icon: "pin" },
  { key: "birthYear", labelKey: "edit_birth_year", icon: "calendar" },
  { key: "languages", labelKey: "edit_languages", icon: "globe" },
  { key: "work", labelKey: "edit_work", icon: "listing" },
  { key: "company", labelKey: "edit_company_short", icon: "star" },
  { key: "phone", labelKey: "edit_phone", icon: "phone" },
  { key: "email", labelKey: "edit_email", icon: "mail" },
];

export function ProfileDetailsCard({ profileData }) {
  const { t } = useText();
  return (
    <section className="upx-details">
      <dl className="upx-facts">
        {OVERVIEW_FIELDS.map((field) => {
          const value = String(profileData[field.key] || "").trim();
          return (
            <div key={field.key} className={value ? "" : "is-empty"}>
              <span><ProfileIcon type={field.icon} /></span>
              <div>
                <dt>{t(field.labelKey)}</dt>
                <dd>{value || t("prof_not_set")}</dd>
              </div>
            </div>
          );
        })}
      </dl>

      <div className="upx-text-blocks">
        <div>
          <h3>{t("edit_about_label")}</h3>
          <p className={profileData.about ? "" : "is-empty"}>{profileData.about || t("prof_nothing_written")}</p>
        </div>
        <div>
          <h3>{t("edit_interests")}</h3>
          {profileData.interests ? (
            <div className="upx-tags">
              {String(profileData.interests).split(/[,\n]/).map((item) => item.trim()).filter(Boolean).map((item) => <span key={item}>{item}</span>)}
            </div>
          ) : <p className="is-empty">{t("prof_not_set")}</p>}
        </div>
      </div>
    </section>
  );
}

export function ProfileStats({ bookingsCount, activeCount, paidTotal, favoritesCount, onOpen }) {
  const { t } = useText();
  const items = [
    { id: "history", label: t("prof_stat_bookings"), value: bookingsCount, hint: activeCount ? t("prof_stat_active", { n: activeCount }) : t("prof_stat_no_active"), icon: "calendar" },
    { id: "payments", label: t("prof_stat_paid"), value: formatMoney(paidTotal), hint: t("prof_stat_all_payments"), icon: "payment" },
    { id: "likes", label: t("prof_stat_saved"), value: favoritesCount, hint: t("prof_stat_liked"), icon: "heart" },
  ];
  return (
    <div className="upx-stats">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onOpen(item.id)}>
          <span><ProfileIcon type={item.icon} /></span>
          <div>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <em>{item.hint}</em>
          </div>
          <ProfileIcon type="arrow" />
        </button>
      ))}
    </div>
  );
}
