import { initialProfile, CANCELLABLE_BOOKING_STATUSES, ACTIVE_BOOKING_STATUSES, PAID_PAYMENT_STATUSES, ProfileIcon, buildProfileBookingView, bookingStatusLabel, paymentStatusLabel, normalizeBookingResponse, normalizePaymentResponse, getCompletion, formatBookingPeriod } from "./userProfile/helpers.jsx";
import { BookingHistory, PaymentHistory, ProfileDetailsCard, ProfileStats, isActiveBooking } from "./userProfile/HistoryTabs.jsx";
import { ProfileQuestionnaireEdit } from "./userProfile/ProfileQuestionnaireEdit.jsx";
import React, { useMemo, useState, useEffect } from "react";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";
import { useText } from "../context/LanguageContext.jsx";
import { formatMonthYear } from "../utils/localeDate.js";

import { PropertyCard } from "./ListingsSection.jsx";
import { HostListingDetailModal } from "./HostListingDetailModal.jsx";
import { normalizePlace } from "../utils/placeMapper.js";
import { fetchFavoritesFromBackend, getLocalFavorites } from "../utils/favoritesManager.js";
import { normalizeBooking } from "../utils/bookingMapper.js";
import { questionnaireFromProfile, splitFullName } from "../utils/profileMapper.js";
import { getStorageItem, readJsonStorage, STORAGE_KEYS } from "../utils/storageKeys.js";
import { navigate, useQueryParam } from "../utils/router.js";
import "./UserProfile.css";
import "./userProfile/profileHero.css";
import "./HostDashboard.css";

function UserProfile({ userState, setUserState }) {
  const { t, lang, locale } = useText();
  // The tab lives in the URL (/profile?tab=history), so the shared sidebar can link to it.
  const tabParam = useQueryParam("tab");
  const activeTab = ["history", "payments", "likes"].includes(tabParam) ? tabParam : "about";
  const setActiveTab = (id) => navigate(id === "about" ? "/profile" : `/profile?tab=${id}`);
  const [selectedListing, setSelectedListing] = useState(null);
  const [likedSpaces, setLikedSpaces] = useState(() => import.meta.env.DEV ? getLocalFavorites() : []);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");
  const [favoritesUsingDevFallback, setFavoritesUsingDevFallback] = useState(false);

  useEffect(() => {
    let active = true;
    setFavoritesLoading(true);
    setFavoritesError("");
    setFavoritesUsingDevFallback(false);

    if (!userState?.isAuthed || !getAccessToken()) {
      setLikedSpaces([]);
      setFavoritesLoading(false);
      setFavoritesError("fav_sign_in");
      return undefined;
    }

    fetchFavoritesFromBackend({
      onDevFallback: () => active && setFavoritesUsingDevFallback(true),
    })
      .then((favorites) => {
        if (active) setLikedSpaces(favorites);
      })
      .catch((error) => {
        if (!active) return;
        setLikedSpaces([]);
        setFavoritesError(getApiErrorMessage(error, t("fav_err_load"), lang));
      })
      .finally(() => {
        if (active) setFavoritesLoading(false);
      });
    
    const handleUpdate = (event) => {
      setLikedSpaces(getLocalFavorites());
      if (event.detail?.source === "dev-fallback") setFavoritesUsingDevFallback(true);
      if (["backend", "backend-merge"].includes(event.detail?.source)) {
        setFavoritesError("");
        setFavoritesUsingDevFallback(false);
      }
    };
    window.addEventListener("joyzone-favorites-update", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("joyzone-favorites-update", handleUpdate);
    };
  }, [userState?.isAuthed]);

  const profileData = useMemo(() => {
    const activeName = userState?.name || getStorageItem(STORAGE_KEYS.profile.name) || t("dash_user");
    const activeEmail = userState?.email || getStorageItem(STORAGE_KEYS.profile.email, "");
    const activePhone = userState?.phone || getStorageItem(STORAGE_KEYS.profile.phone, "");
    const legacyLocal = readJsonStorage(STORAGE_KEYS.profile.localQuestionnaire, {});
    return {
      ...initialProfile,
      ...questionnaireFromProfile({ profile_details: userState?.profileDetails }, legacyLocal),
      name: activeName,
      // Completion must count the same fields as the edit page, so the two percentages match.
      firstName: userState?.firstName ?? splitFullName(userState?.name).first_name,
      lastName: userState?.lastName ?? splitFullName(userState?.name).last_name,
      email: activeEmail,
      phone: activePhone
    };
  }, [userState, t]);
  const completion = useMemo(() => getCompletion(profileData), [profileData]);
  const roleLabel = ["admin", "moderator", "partner", "client"].includes(userState?.role) ? t(`prof_role_${userState.role}`) : t("prof_role_default");
  const joinedAt = userState?.dateJoined ? new Date(userState.dateJoined) : null;
  const memberSince = joinedAt && !Number.isNaN(joinedAt.getTime()) ? formatMonthYear(joinedAt, lang).replace(/\s*г\.$/, "") : "";
  const initials = (profileData.name || "").split(/\s+/).map((part) => part.replace(/[^\p{L}]/gu, "")[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "JZ";
  // Property states
  const [allBookings, setAllBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingActionError, setBookingActionError] = useState("");
  const [bookingsSuccess, setBookingsSuccess] = useState("");
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null);
  const [cancelError, setCancelError] = useState("");

  const fetchUserData = async () => {
    if (!userState?.isAuthed || !getAccessToken()) {
      setAllBookings([]);
      setPayments([]);
      setBookingsLoading(false);
      setBookingsLoaded(false);
      setPaymentsLoading(false);
      setBookingsError(t("hist_sign_in"));
      setPaymentsError(t("payh_sign_in"));
      return;
    }

    setBookingsLoading(true);
    setPaymentsLoading(true);
    setBookingsLoaded(false);
    const [bookingsResult, paymentsResult] = await Promise.allSettled([
      api.get("/api/bookings/", { params: { scope: "mine" } }),
      api.get("/api/payments/my/"),
    ]);

    if (bookingsResult.status === "fulfilled") {
      setAllBookings(normalizeBookingResponse(bookingsResult.value.data));
      setBookingsError("");
      setBookingsLoaded(true);
    } else {
      setAllBookings([]);
      setBookingsError(getApiErrorMessage(bookingsResult.reason, t("hist_err_load"), lang));
    }

    if (paymentsResult.status === "fulfilled") {
      setPayments(normalizePaymentResponse(paymentsResult.value.data));
      setPaymentsError("");
    } else {
      setPayments([]);
      setPaymentsError(getApiErrorMessage(paymentsResult.reason, t("payh_err_load"), lang));
    }
    setBookingsLoading(false);
    setPaymentsLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, [userState?.id, userState?.email, userState?.isAuthed]);

  useEffect(() => {
    if (!cancelBookingTarget) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape" && !cancellingBookingId) setCancelBookingTarget(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelBookingTarget, cancellingBookingId]);

  const openCancelBookingModal = (booking) => {
    if (!booking?.id || !CANCELLABLE_BOOKING_STATUSES.has(booking.status)) return;
    setCancelError("");
    setBookingActionError("");
    setBookingsSuccess("");
    setCancelBookingTarget(booking);
  };

  const closeCancelBookingModal = () => {
    if (cancellingBookingId) return;
    setCancelBookingTarget(null);
    setCancelError("");
  };

  const handleCancelBooking = async () => {
    const booking = cancelBookingTarget;
    if (!booking?.id || !CANCELLABLE_BOOKING_STATUSES.has(booking.status)) return;

    setCancellingBookingId(booking.id);
    setCancelError("");
    setBookingActionError("");
    setBookingsSuccess("");
    let cancellationConfirmed = false;
    try {
      const response = await api.post(`/api/bookings/${booking.id}/cancel/`);
      const cancelledBooking = normalizeBooking(response.data);
      if (cancelledBooking.status !== "cancelled") {
        throw new Error(t("hist_cancel_err"));
      }
      cancellationConfirmed = true;
      setAllBookings((current) => current.map((item) => (
        String(item.id) === String(cancelledBooking.id) ? cancelledBooking : item
      )));
      setCancelBookingTarget(null);

      setBookingsLoading(true);
      const refreshedBookingsResponse = await api.get("/api/bookings/", {
        params: { scope: "mine" },
      });
      setAllBookings(normalizeBookingResponse(refreshedBookingsResponse.data));
      setBookingsLoaded(true);
      setBookingsSuccess(t("hist_cancel_success", { place: cancelledBooking.place_title }));
    } catch (err) {
      const message = getApiErrorMessage(err, t(cancellationConfirmed ? "hist_cancel_reload_err" : "hist_cancel_err"), lang);
      setBookingActionError(message);
      if (!cancellationConfirmed) setCancelError(message);
    } finally {
      setCancellingBookingId(null);
      setBookingsLoading(false);
    }
  };

  const displayedBookings = allBookings.map(buildProfileBookingView);
  const activeBookingObj = [...displayedBookings]
    .filter((booking) => {
      if (!ACTIVE_BOOKING_STATUSES.has(booking.status)) return false;
      const endTime = new Date(booking.end_time).getTime();
      return !Number.isFinite(endTime) || endTime >= Date.now();
    })
    .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())[0] || null;

  const totalVal = activeBookingObj?.amount || 0;
  const formattedTotal = `${new Intl.NumberFormat(locale).format(totalVal)} ${activeBookingObj?.currency || "UZS"}`;
  const activeBookingCacheKey = activeBookingObj
    ? `${activeBookingObj.id}:${activeBookingObj.status}:${activeBookingObj.payment_status}:${activeBookingObj.updated_at}`
    : "none";

  useEffect(() => {
    if (!bookingsLoaded || !userState?.isAuthed) return;
    const cached = userState?.activeBooking;
    if (
      String(cached?.id || "") === String(activeBookingObj?.id || "")
      && String(cached?.status || "") === String(activeBookingObj?.status || "")
      && String(cached?.payment_status || cached?.paymentStatus || "") === String(activeBookingObj?.payment_status || "")
    ) {
      return;
    }

    setUserState?.({
      ...userState,
      activeBooking: activeBookingObj ? {
        ...activeBookingObj,
        placeSnapshot: activeBookingObj.place_details,
        spaceTitle: activeBookingObj.place_title,
      } : null,
    });
  }, [bookingsLoaded, activeBookingCacheKey]);

  return (
    <>

          <div className="profile-tab-content">
            {activeTab === "about" ? (
              <div className="profile-tab-panel" key="about">
                <section className="pf-hero">
                  <span
                    className="pf-hero-avatar"
                    style={userState?.avatar ? { backgroundImage: `url(${userState.avatar})` } : undefined}
                    aria-hidden="true"
                  >
                    {userState?.avatar ? null : initials}
                  </span>
                  <div className="pf-hero-text">
                    <span>{roleLabel}{memberSince ? ` · ${t("prof_member_since", { date: memberSince })}` : ""}</span>
                    <h1>{profileData.name}</h1>
                    {profileData.role ? <p>{profileData.role}</p> : null}
                  </div>
                  <a className="pf-hero-edit" href="/profile-edit">
                    <ProfileIcon type="edit" />
                    {t("prof_edit_form")}
                  </a>

                  {completion < 100 ? (
                    <a className="pf-hero-progress" href="/profile-edit">
                      <div className="pf-hero-progress-text">
                        <strong>{t("prof_progress", { percent: completion })}</strong>
                        <span>{t("prof_progress_hint")}</span>
                      </div>
                      <span className="pf-hero-track" aria-hidden="true"><i style={{ width: `${completion}%` }} /></span>
                      <span className="pf-hero-fill">
                        {t("prof_fill_action")}
                        <ProfileIcon type="arrow" />
                      </span>
                    </a>
                  ) : null}
                </section>

                <ProfileStats
                  bookingsCount={displayedBookings.length}
                  activeCount={displayedBookings.filter(isActiveBooking).length}
                  paidTotal={payments.filter((payment) => PAID_PAYMENT_STATUSES.has(payment.status)).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)}
                  favoritesCount={likedSpaces.length}
                  onOpen={setActiveTab}
                />

                {activeBookingObj && (
                  <section className="profile-active-booking-section pf-block">
                    <h2 className="pf-block-title">{t("prof_active_kicker")}</h2>
                    <div className="host-listings-grid" style={{ display: "grid", gap: "24px" }}>
                      <article className="host-listing-shell" style={{ overflow: "visible" }}>
                        <PropertyCard 
                          item={normalizePlace({
                            ...(activeBookingObj.place_details || {}),
                            id: activeBookingObj.place_id,
                            title: activeBookingObj.place_title || "Joyzone",
                            price: formattedTotal,
                            people: activeBookingObj.guests || 1,
                          })}
                          index={0} 
                          onClick={(targetItem) => setSelectedListing(targetItem)}
                        />
                        
                        <div className="host-listing-meta" style={{ padding: "20px" }}>
                          <span style={{ 
                            background: "rgba(249, 115, 22, 0.15)", 
                            color: "#ea580c", 
                            padding: "4px 10px", 
                            borderRadius: "8px", 
                            fontWeight: "700", 
                            textTransform: "uppercase", 
                            fontSize: "11px", 
                            display: "inline-block", 
                            marginBottom: "12px" 
                          }}>
                            {bookingStatusLabel(activeBookingObj.status, t)}
                          </span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              {t("prof_time")} <strong style={{ color: "#1e293b" }}>{formatBookingPeriod(activeBookingObj, lang)}</strong>
                            </div>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              {t("prof_payment_status")} <strong style={{ color: "#1e293b" }}>{paymentStatusLabel(activeBookingObj.payment_status, t)}</strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                )}

                <ProfileDetailsCard profileData={profileData} />
              </div>
            ) : null}

            {activeTab === "history" ? (
              <BookingHistory
                bookings={displayedBookings}
                loading={bookingsLoading}
                error={bookingsError}
                success={bookingsSuccess}
                actionError={bookingActionError}
                cancellingId={cancellingBookingId}
                onRetry={fetchUserData}
                onCancel={openCancelBookingModal}
              />
            ) : null}

            {activeTab === "payments" ? (
              <PaymentHistory payments={payments} loading={paymentsLoading} error={paymentsError} onRetry={fetchUserData} />
            ) : null}

            {activeTab === "likes" ? (
              <div className="profile-tab-panel" key="likes">
                {favoritesUsingDevFallback ? <span className="profile-dev-fallback">DEV fallback</span> : null}
                {favoritesLoading ? (
                  <div className="profile-bookings-state">{t("fav_loading")}</div>
                ) : favoritesError ? (
                  <div className="profile-bookings-state is-error" role="alert">{favoritesError === "fav_sign_in" ? t("fav_sign_in") : favoritesError}</div>
                ) : likedSpaces.length === 0 ? (
                  <div className="profile-empty-state">
                    <span><ProfileIcon type="heart" /></span>
                    <h3>{t("fav_empty_title")}</h3>
                    <p>{t("fav_empty_text")}</p>
                  </div>
                ) : (
                  <div className="profile-liked-grid">
                    {likedSpaces.map((item, index) => (
                      <PropertyCard
                        key={`liked-${item.id || item.title}`}
                        item={item}
                        index={index}
                        onClick={(targetItem) => setSelectedListing(targetItem)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

      {selectedListing && (
        <HostListingDetailModal
          item={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}

      {cancelBookingTarget ? (
        <div className="profile-cancel-modal-overlay" onClick={closeCancelBookingModal}>
          <div
            className="profile-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-cancel-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-cancel-modal-icon" aria-hidden="true">!</div>
            <div>
              <span>{t("hist_modal_kicker")}</span>
              <h2 id="profile-cancel-modal-title">{t("hist_modal_title")}</h2>
              <p>{t("hist_modal_text", { place: cancelBookingTarget.place_title })}</p>
            </div>
            {cancelError ? <div className="profile-cancel-modal-error" role="alert">{cancelError}</div> : null}
            <div className="profile-cancel-modal-actions">
              <button type="button" onClick={closeCancelBookingModal} disabled={Boolean(cancellingBookingId)}>
                {t("hist_modal_back")}
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={handleCancelBooking}
                disabled={Boolean(cancellingBookingId)}
              >
                {cancellingBookingId ? t("hist_cancelling") : t("hist_modal_confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export { ProfileQuestionnaireEdit };
export default UserProfile;
