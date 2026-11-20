import { pageMeta, buildHostListingView, buildHostBookingView, FALLBACK_HOST_LISTINGS, DashboardToast } from "./hostDashboard/shared.jsx";
import { CalendarPage } from "./hostDashboard/CalendarPage.jsx";
import { ListingsPage } from "./hostDashboard/ListingsPage.jsx";
import { MessagesPage } from "./hostDashboard/MessagesPage.jsx";
import { HostTariffsPage } from "./hostDashboard/HostTariffsPage.jsx";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";
import { useText } from "../context/LanguageContext.jsx";

import { setStorageItem, STORAGE_KEYS } from "../utils/storageKeys.js";
import { cacheProfile } from "../utils/profileMapper.js";
import "./HostDashboard.css";
import { navigate, partnerEditPath, useQueryParam } from "../utils/router.js";

function HostDashboard({ page = "today", userState, setUserState }) {
  const { t, lang } = useText();
  // "Today" now lives on top of "My places", so its old address opens that page.
  const normalizedPage = page === "today" || !pageMeta[page] ? "listings" : page;
  // The schedule opens for one place: /host-calendar?place=<id>.
  const placeId = useQueryParam("place") || "";
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [listingsApiFailed, setListingsApiFailed] = useState(false);
  const [bookingsApiFailed, setBookingsApiFailed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState({ profile: "", listings: "", bookings: "" });
  const [deleteConfirmSpace, setDeleteConfirmSpace] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ open: true, message: msg, type });
  };

  const setApiError = useCallback((section, message) => {
    setApiErrors((current) => ({ ...current, [section]: message }));
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await api.get("/api/auth/profile/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const normalizedProfile = cacheProfile(res.data);
      setProfile(normalizedProfile);
      setApiError("profile", "");
      return normalizedProfile;
    } catch (e) {
      setApiError("profile", getApiErrorMessage(e, t("host_err_profile"), lang));
      return null;
    }
  }, [setApiError, t, lang]);

  const fetchListings = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get("/api/places/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.results || res.data || [];
      setListings(Array.isArray(data) ? data.map(buildHostListingView) : []);
      setListingsApiFailed(false);
      setApiError("listings", "");
    } catch (e) {
      setApiError("listings", getApiErrorMessage(e, t("host_err_listings"), lang));
      setListings([]);
      setListingsApiFailed(true);
    }
    setLoading(false);
  }, [setApiError, t, lang]);

  const fetchBookings = useCallback(async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await api.get("/api/bookings/", {
          params: { scope: "host" },
          headers: { Authorization: `Bearer ${token}` }
        });
      const data = res.data?.results || res.data || [];
      setBookings(Array.isArray(data) ? data : []);
      setBookingsApiFailed(false);
      setApiError("bookings", "");
    } catch (e) {
      setApiError("bookings", getApiErrorMessage(e, t("host_err_bookings"), lang));
      setBookings([]);
      setBookingsApiFailed(true);
    }
  }, [setApiError, t, lang]);

  useEffect(() => {
    fetchProfile();
    fetchListings();
    fetchBookings();
  }, [fetchProfile, fetchListings, fetchBookings]);

  useEffect(() => {
    const refreshAfterPlaceSave = () => {
      fetchListings();
      fetchBookings();
    };
    window.addEventListener("joyzone-place-saved", refreshAfterPlaceSave);
    return () => window.removeEventListener("joyzone-place-saved", refreshAfterPlaceSave);
  }, [fetchListings, fetchBookings]);

  const listingsById = useMemo(() => (
    new Map(listings.map((item) => [String(item.id), item]))
  ), [listings]);

  const normalizedBookings = useMemo(
    () => bookings.map((booking) => buildHostBookingView(booking, listingsById, t, lang)),
    [bookings, listingsById, t, lang]
  );

  const usingListingsFallback = import.meta.env.DEV && listingsApiFailed;
  const usingBookingsFallback = import.meta.env.DEV && bookingsApiFailed;
  const usingFallbackData = usingListingsFallback || usingBookingsFallback;
  const displayListings = useMemo(
    () => usingListingsFallback ? FALLBACK_HOST_LISTINGS.map(buildHostListingView) : listings,
    [listings, usingListingsFallback],
  );
  const dashboardError = useMemo(
    () => Object.values(apiErrors).filter(Boolean).join(" "),
    [apiErrors],
  );

  const handleEdit = (item) => {
    setStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash, window.location.pathname);
    navigate(partnerEditPath(item.id));
  };

  const askDelete = (item) => {
    setDeleteConfirmSpace(item);
  };

  const performDelete = async (id) => {
    const token = getAccessToken();
    try {
      await api.delete(`/api/places/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(t("list_deleted"), "success");
      setDeleteConfirmSpace(null);
      fetchListings();
      fetchBookings();
    } catch (e) {
      showToast(getApiErrorMessage(e, t("list_delete_err"), lang), "error");
      setDeleteConfirmSpace(null);
    }
  };

  return (
    <div className={`host-dash-page ${normalizedPage === "messages" ? "is-messages-page" : ""}`}>
        {dashboardError ? (
          <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
            {dashboardError}
            {usingFallbackData ? " · DEV fallback data is shown." : ""}
          </div>
        ) : null}
        {normalizedPage === "calendar" ? (
          <CalendarPage
            placeId={placeId}
            listings={listings}
            bookings={normalizedBookings}
            usingFallback={usingListingsFallback}
            onBookingCreated={fetchBookings}
            onPlaceUpdated={fetchListings}
            onEditPlace={handleEdit}
          />
        ) : null}
        {normalizedPage === "listings" ? (
          loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div className="joy-spinner" style={{ display: "inline-block", width: 40, height: 40, border: "3px solid rgba(228, 102, 48, 0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
              <p style={{ marginTop: 16, color: "#64748b" }}>{t("list_loading")}</p>
            </div>
          ) : (
            <ListingsPage listings={displayListings} bookings={normalizedBookings} onEdit={handleEdit} onDelete={askDelete} />
          )
        ) : null}
        {normalizedPage === "messages" ? <MessagesPage listings={displayListings} partnerId={profile?.id} /> : null}
        {normalizedPage === "tariffs" ? <HostTariffsPage showToast={showToast} profile={profile} fetchProfile={fetchProfile} listingsCount={listings.length} /> : null}

      {/* Beautiful Custom Alert Popup portal */}
      {deleteConfirmSpace && createPortal(
        <div className="host-custom-alert-overlay" onClick={() => setDeleteConfirmSpace(null)}>
          <div className="host-custom-alert-box animate-pop" onClick={e => e.stopPropagation()}>
            <div className="host-custom-alert-icon">⚠️</div>
            <h3>{t("list_delete_title")}</h3>
            <p>{t("list_delete_text", { name: deleteConfirmSpace.title })}</p>
            <div className="host-custom-alert-buttons">
              <button className="host-alert-btn cancel" onClick={() => setDeleteConfirmSpace(null)}>{t("cab_cancel")}</button>
              <button className="host-alert-btn confirm" onClick={() => performDelete(deleteConfirmSpace.id)}>{t("list_delete_confirm")}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Beautiful Toast alert portal */}
      {toast.open && createPortal(
        <DashboardToast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, open: false }))} 
        />,
        document.body
      )}
    </div>
  );
}

export default HostDashboard;
