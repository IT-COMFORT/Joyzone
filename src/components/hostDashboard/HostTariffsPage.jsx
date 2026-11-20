import React, { useState, useEffect, useMemo } from "react";
import api, { getAccessToken, getApiErrorMessage } from "../../api/client.js";
import { useText } from "../../context/LanguageContext.jsx";
import { tariffFeatures, tariffText } from "./shared.jsx";
import { formatFullDate } from "../../utils/localeDate.js";
import PaymentModal from "../PaymentModal.jsx";
import "./hostTariffs.css";

const DAY_MS = 24 * 60 * 60 * 1000;
// A plan that lasts longer than this is shown as "no expiry" (the free plan runs 100 years).
const NO_EXPIRY_DAYS = 3650;

function Icon({ name }) {
  const paths = {
    check: ["M20 6 9 17l-5-5"],
    dash: ["M6 12h12"],
    crown: ["M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z"],
    clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
    layers: ["m12 3 9 5-9 5-9-5 9-5Z", "m3 13 9 5 9-5"],
    card: ["M3 6h18v12H3z", "M3 10h18", "M7 15h4"],
    up: ["M12 19V5", "m5 12 7-7 7 7"],
    swap: ["M7 7h13", "m16 3 4 4-4 4", "M17 17H4", "m8 13-4 4 4 4"],
    history: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v5h5", "M12 8v4l3 2"],
    spark: ["M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z"],
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(paths[name] || paths.check).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export function HostTariffsPage({ showToast, profile, fetchProfile, listingsCount = 0 }) {
  const [tariffs, setTariffs] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const { t: tr, lang, locale } = useText();

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/tariffs/");
      setTariffs(res.data?.results || res.data || []);
    } catch (e) {
      showToast(getApiErrorMessage(e, tr("tar_err_load"), lang), "error");
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get("/api/tariffs/my-subscriptions/");
      setHistory(res.data?.results || res.data || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    fetchTariffs();
    fetchHistory();
  }, []);

  const currentTariff = useMemo(() => {
    if (profile?.tariff_details) return profile.tariff_details;
    return tariffs.find((item) => item.id === profile?.tariff) || tariffs.find((item) => item.slug === "standard") || null;
  }, [profile, tariffs]);

  // Open the switcher on the next plan up, so the upgrade is one click away.
  useEffect(() => {
    if (selectedId || !tariffs.length || !profile) return;
    const index = tariffs.findIndex((item) => item.id === currentTariff?.id);
    const next = tariffs[index + 1] || tariffs[Math.max(index, 0)];
    setSelectedId(next?.id ?? tariffs[0].id);
  }, [tariffs, currentTariff, selectedId]);

  const handleSubscribe = async (tariff) => {
    const token = getAccessToken();
    if (!token) {
      showToast(tr("tar_err_sign_in"), "error");
      return;
    }
    setSubmitting(tariff.id);

    try {
      const res = await api.post(
        "/api/tariffs/subscribe/",
        { tariff_id: tariff.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.requires_payment) {
        if (!res.data?.subscription_id) {
          throw new Error(tr("tar_err_choose"));
        }
        setPaymentTarget({
          ...tariff,
          subscriptionId: res.data?.subscription_id,
          subscriptionStatus: res.data?.status
        });
        fetchHistory();
        return;
      }

      if (res.data?.status !== "active") {
        throw new Error(tr("tar_err_choose"));
      }

      const refreshedProfile = await fetchProfile();
      if (!refreshedProfile) {
        throw new Error(tr("tar_err_refresh"));
      }
      fetchHistory();
      showToast(tr("tar_activated", { name: tariffText(tariff, "name", lang) }), "success");
    } catch (e) {
      const known = [tr("tar_err_choose"), tr("tar_err_refresh")].includes(e?.message);
      showToast(known ? e.message : getApiErrorMessage(e, tr("tar_err_choose"), lang), "error");
    } finally {
      setSubmitting(null);
    }
  };

  const money = (value) => new Intl.NumberFormat(locale).format(Number(value) || 0);
  const formatPrice = (tariff) => (tariff?.is_free ? tr("tar_free") : `${money(tariff?.price)} UZS`);
  const isUnlimited = (tariff) => !tariff || tariff.is_free || Number(tariff.duration_days) >= NO_EXPIRY_DAYS;

  // ----- current plan numbers -----
  const expiresAt = profile?.tariff_expires_at ? new Date(profile.tariff_expires_at) : null;
  const expired = Boolean(expiresAt && expiresAt.getTime() < Date.now());
  const activeSub = history.find((item) => item.status === "active" && item.tariff === currentTariff?.id);
  const startedAt = activeSub?.start_date ? new Date(activeSub.start_date) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS)) : null;
  const totalDays = Number(currentTariff?.duration_days) || 30;
  const timeShare = daysLeft === null ? 1 : Math.min(1, daysLeft / totalDays);
  const maxPlaces = Number(currentTariff?.max_places) || 1;
  const used = Math.max(0, Number(listingsCount) || 0);
  const usageShare = Math.min(1, used / maxPlaces);
  const left = Math.max(0, maxPlaces - used);
  const pendingSub = history.find((item) => item.status === "pending_payment");
  const pendingTariff = pendingSub ? tariffs.find((item) => item.id === pendingSub.tariff) : null;

  // ----- selected plan vs current -----
  const selected = tariffs.find((item) => item.id === selectedId) || null;
  const selectedIsCurrent = selected && currentTariff && selected.id === currentTariff.id && !expired;
  const placesDiff = selected ? Number(selected.max_places) - maxPlaces : 0;
  const currentFeatures = new Set(currentTariff ? tariffFeatures(currentTariff, lang) : []);
  const newFeatures = selected ? tariffFeatures(selected, lang).filter((item) => !currentFeatures.has(item)) : [];
  const isUpgrade = selected && Number(selected.price) > Number(currentTariff?.price || 0);

  // Every feature of every plan, for the comparison table.
  const allFeatures = useMemo(() => {
    const seen = [];
    tariffs.forEach((item) => tariffFeatures(item, lang).forEach((feature) => {
      if (!seen.includes(feature)) seen.push(feature);
    }));
    return seen;
  }, [tariffs, lang]);

  const payPending = () => {
    if (!pendingSub || !pendingTariff) return;
    setPaymentTarget({ ...pendingTariff, subscriptionId: pendingSub.id, subscriptionStatus: pendingSub.status });
  };

  return (
    <section className="host-main-surface ht">
      {/* ---------- current plan ---------- */}
      {profile ? (
        <div className="ht-current">
          <div className="ht-current-main">
            <span className="ht-eyebrow">{tr("tar_current")}</span>
            <div className="ht-current-title">
              <span className="ht-current-icon"><Icon name="crown" /></span>
              <h2>{tariffText(currentTariff, "name", lang) || tr("tar_basic")}</h2>
              <span className={`ht-pill ${expired ? "is-expired" : "is-active"}`}>
                {expired ? tr("tar_status_expired") : tr("tar_status_active")}
              </span>
            </div>
            <p className="ht-current-price">
              <strong>{formatPrice(currentTariff)}</strong>
              {currentTariff && !currentTariff.is_free ? <span>{tr("tar_per_month")}</span> : null}
            </p>
            {currentTariff ? (
              <ul className="ht-current-features">
                {tariffFeatures(currentTariff, lang).map((feature) => (
                  <li key={feature}><Icon name="check" />{feature}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="ht-meters">
            <div className="ht-meter">
              <div className="ht-meter-head">
                <span><Icon name="layers" />{tr("tar_usage")}</span>
                <b>{used} / {maxPlaces}</b>
              </div>
              <div className="ht-bar"><i style={{ width: `${usageShare * 100}%` }} className={usageShare >= 1 ? "is-full" : undefined} /></div>
              <small className={left === 0 ? "is-warn" : undefined}>
                {left === 0 ? tr("tar_usage_full") : tr("tar_usage_left", { n: left })}
              </small>
            </div>

            <div className="ht-meter">
              <div className="ht-meter-head">
                <span><Icon name="clock" />{tr("tar_period_label")}</span>
                <b>{isUnlimited(currentTariff) || daysLeft === null ? tr("tar_no_expiry") : tr("tar_days_left", { n: daysLeft })}</b>
              </div>
              <div className="ht-bar"><i style={{ width: `${timeShare * 100}%` }} className={daysLeft !== null && daysLeft <= 5 ? "is-full" : undefined} /></div>
              <div className="ht-dates">
                {startedAt ? <span>{tr("tar_started")}: <b>{formatFullDate(startedAt, lang)}</b></span> : null}
                {expiresAt && !isUnlimited(currentTariff) ? <span>{tr("tar_ends")}: <b>{formatFullDate(expiresAt, lang)}</b></span> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- unpaid plan ---------- */}
      {pendingSub && pendingTariff ? (
        <div className="ht-pending">
          <span className="ht-pending-icon"><Icon name="card" /></span>
          <div>
            <strong>{tr("tar_pending_title", { name: tariffText(pendingTariff, "name", lang) })}</strong>
            <span>{tr("tar_pending_text")}</span>
          </div>
          <button type="button" className="ht-btn is-primary" onClick={payPending}>{tr("tar_pay_now")}</button>
        </div>
      ) : null}

      {/* ---------- switcher ---------- */}
      <div className="ht-block">
        <div className="ht-block-head">
          <div>
            <span className="ht-eyebrow is-dark"><Icon name="swap" />{tr("tar_compare")}</span>
            <h2>{tr("tar_switch_title")}</h2>
            <p>{tr("tar_switch_text")}</p>
          </div>
        </div>

        {loading ? (
          <div className="ht-loading"><span /></div>
        ) : (
          <>
            <div className="ht-switch" role="tablist" aria-label={tr("tar_switch_title")}>
              {tariffs.map((item) => {
                const isCurrent = item.id === currentTariff?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={item.id === selectedId}
                    className={item.id === selectedId ? "is-active" : undefined}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <strong>{tariffText(item, "name", lang)}</strong>
                    <small>{formatPrice(item)}</small>
                    {isCurrent ? <em>{tr("tar_active")}</em> : null}
                  </button>
                );
              })}
            </div>

            {selected ? (
              <div className={`ht-detail${selected.slug === "premium" ? " is-premium" : ""}`} key={selected.id}>
                <div className="ht-detail-main">
                  <h3>{tariffText(selected, "name", lang)}</h3>
                  <p className="ht-detail-desc">{tariffText(selected, "description", lang)}</p>
                  <div className="ht-detail-price">
                    <strong>{formatPrice(selected)}</strong>
                    {!selected.is_free ? <span>{tr("tar_per_month")}</span> : null}
                  </div>
                  <dl className="ht-detail-facts">
                    <div><dt>{tr("tar_limit_label")}</dt><dd>{selected.max_places}</dd></div>
                    <div><dt>{tr("tar_period_label")}</dt><dd>{isUnlimited(selected) ? tr("tar_no_expiry") : tr("tar_period", { n: selected.duration_days })}</dd></div>
                    <div>
                      <dt>{tr("tar_vs_current")}</dt>
                      <dd className={placesDiff > 0 ? "is-up" : placesDiff < 0 ? "is-down" : undefined}>
                        {placesDiff > 0 ? tr("tar_more_places", { n: placesDiff }) : placesDiff < 0 ? tr("tar_less_places", { n: -placesDiff }) : tr("tar_same_places")}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="ht-detail-side">
                  <span className="ht-detail-label">{tr("tar_included")}</span>
                  <ul className="ht-detail-features">
                    {tariffFeatures(selected, lang).map((feature) => (
                      <li key={feature} className={newFeatures.includes(feature) && !selectedIsCurrent ? "is-new" : undefined}>
                        <Icon name="check" />{feature}
                        {newFeatures.includes(feature) && !selectedIsCurrent ? <em>{tr("tar_new_features")}</em> : null}
                      </li>
                    ))}
                  </ul>
                  {!selectedIsCurrent && used > Number(selected.max_places) ? (
                    <p className="ht-warn">{tr("tar_over_limit", { used, max: selected.max_places })}</p>
                  ) : null}
                  <button
                    type="button"
                    className={`ht-btn ${selectedIsCurrent ? "is-muted" : "is-primary"}`}
                    disabled={selectedIsCurrent || submitting === selected.id}
                    onClick={() => handleSubscribe(selected)}
                  >
                    {submitting === selected.id ? tr("tar_processing")
                      : selectedIsCurrent ? tr("tar_is_current")
                        : isUpgrade ? <><Icon name="up" />{tr("tar_upgrade")}</>
                          : tr("tar_switch_to")}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ---------- comparison table ---------- */}
      {tariffs.length ? (
        <div className="ht-block">
          <div className="ht-block-head">
            <div>
              <span className="ht-eyebrow is-dark"><Icon name="layers" />{tr("tar_plans")}</span>
              <h2>{tr("tar_compare")}</h2>
            </div>
          </div>
          <div className="ht-table-wrap">
            <table className="ht-table">
              <thead>
                <tr>
                  <th>{tr("tar_feature_col")}</th>
                  {tariffs.map((item) => (
                    <th key={item.id} className={item.id === currentTariff?.id ? "is-current" : undefined}>
                      {tariffText(item, "name", lang)}
                      {item.id === currentTariff?.id ? <em>{tr("tar_active")}</em> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{tr("tar_price_label")}</td>
                  {tariffs.map((item) => <td key={item.id} className={item.id === currentTariff?.id ? "is-current" : undefined}><b>{formatPrice(item)}</b></td>)}
                </tr>
                <tr>
                  <td>{tr("tar_limit_label")}</td>
                  {tariffs.map((item) => <td key={item.id} className={item.id === currentTariff?.id ? "is-current" : undefined}><b>{item.max_places}</b></td>)}
                </tr>
                <tr>
                  <td>{tr("tar_period_label")}</td>
                  {tariffs.map((item) => <td key={item.id} className={item.id === currentTariff?.id ? "is-current" : undefined}>{isUnlimited(item) ? tr("tar_no_expiry") : tr("tar_period", { n: item.duration_days })}</td>)}
                </tr>
                {allFeatures.map((feature) => (
                  <tr key={feature}>
                    <td>{feature}</td>
                    {tariffs.map((item) => {
                      const has = tariffFeatures(item, lang).includes(feature);
                      return (
                        <td key={item.id} className={item.id === currentTariff?.id ? "is-current" : undefined}>
                          <span className={`ht-mark ${has ? "is-yes" : "is-no"}`}><Icon name={has ? "check" : "dash"} /></span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="ht-table-actions">
                  <td />
                  {tariffs.map((item) => {
                    const isCurrent = item.id === currentTariff?.id && !expired;
                    return (
                      <td key={item.id} className={item.id === currentTariff?.id ? "is-current" : undefined}>
                        <button
                          type="button"
                          className={`ht-btn is-small ${isCurrent ? "is-muted" : "is-ghost"}`}
                          disabled={isCurrent || submitting === item.id}
                          onClick={() => handleSubscribe(item)}
                        >
                          {submitting === item.id ? tr("tar_processing") : isCurrent ? tr("tar_is_current") : tr("tar_choose")}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ---------- history ---------- */}
      <div className="ht-block">
        <div className="ht-block-head">
          <div>
            <span className="ht-eyebrow is-dark"><Icon name="history" />{tr("tar_history")}</span>
          </div>
        </div>
        {history.length ? (
          <ul className="ht-history">
            {history.slice(0, 8).map((item) => {
              const plan = tariffs.find((tariff) => tariff.id === item.tariff);
              const start = item.start_date ? new Date(item.start_date) : null;
              const end = item.end_date ? new Date(item.end_date) : null;
              return (
                <li key={item.id}>
                  <span className="ht-history-icon"><Icon name="spark" /></span>
                  <div>
                    <strong>{plan ? tariffText(plan, "name", lang) : item.tariff_name || "—"}</strong>
                    <small>
                      {start ? formatFullDate(start, lang) : ""}
                      {end ? ` — ${formatFullDate(end, lang)}` : ""}
                    </small>
                  </div>
                  <span className={`ht-pill is-${item.status}`}>{tr(`tar_hist_${item.status}`)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ht-empty">{tr("tar_history_empty")}</p>
        )}
      </div>

      {paymentTarget && (
        <PaymentModal
          isOpen={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          amount={formatPrice(paymentTarget)}
          title={tr("tar_buy")}
          defaultPhone={profile?.phone_number}
          productDetails={{
            subscriptionId: paymentTarget.subscriptionId,
            name: tariffText(paymentTarget, "name", lang),
            description: tariffText(paymentTarget, "description", lang),
            limit: paymentTarget.max_places
          }}
          onSuccess={async () => {
            const t = paymentTarget;
            const refreshedProfile = await fetchProfile();
            if (!refreshedProfile) {
              throw new Error(tr("tar_err_refresh"));
            }
            fetchHistory();
            showToast(tr("tar_paid", { name: tariffText(t, "name", lang) }), "success");
          }}
        />
      )}
    </section>
  );
}
