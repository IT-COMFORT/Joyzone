import React, { useEffect, useMemo, useState } from "react";
import { useText } from "../context/LanguageContext.jsx";
import { defaultContent } from "../data/defaultContent.js";
import api, { getApiErrorMessage } from "../api/client.js";
import { cacheProfile, normalizeProfile, profileToUserState, splitFullName } from "../utils/profileMapper.js";
import { readJsonStorage, STORAGE_KEYS, writeJsonStorage } from "../utils/storageKeys.js";
import "./AccountSettings.css";

// Shown only to partners: the public profile from the "Top agentlar" block.
function buildCompanySection(t) {
  return {
    id: "company",
    title: t("set_company_title"),
    description: t("set_company_text"),
    items: [
      { key: "companyName", title: t("set_company_name"), empty: t("set_not_set"), action: t("set_action_edit"), type: "text" },
      { key: "partnerBio", title: t("set_company_bio"), empty: t("set_not_set"), action: t("set_action_edit"), type: "textarea", note: t("set_company_bio_note") },
    ],
  };
}

function buildSettingsSections(t) {
  const edit = t("set_action_edit");
  return [
    {
      id: "personal",
      title: t("set_personal_title"),
      description: t("set_personal_text"),
      items: [
        { key: "legalName", title: t("set_legal_name"), empty: t("set_not_set"), action: edit, type: "text" },
        { key: "preferredName", title: t("set_preferred_name"), empty: t("set_no_data"), action: t("set_action_add"), type: "text" },
        { key: "email", title: t("set_email"), empty: t("set_not_set"), action: edit, type: "email" },
        { key: "phone", title: t("set_phone"), empty: t("set_not_set"), note: t("set_phone_note"), action: edit, type: "tel" },
        { key: "identity", title: t("set_identity"), value: t("set_identity_value"), action: t("set_action_start"), type: "text" },
        { key: "address", title: t("set_address"), empty: t("set_not_set"), action: edit, type: "text" },
      ],
    },
    {
      id: "security",
      title: t("set_security_title"),
      description: t("set_security_text"),
      items: [
        { key: "password", title: t("set_password"), value: t("set_password_value"), action: edit, type: "password" },
        { key: "twoFactor", title: t("set_two_factor"), value: t("set_off"), action: t("set_action_enable"), type: "text" },
        { key: "sessions", title: t("set_sessions"), value: t("set_sessions_value"), action: t("set_action_view"), type: "text" },
      ],
    },
    {
      id: "privacy",
      title: t("set_privacy_title"),
      description: t("set_privacy_text"),
      items: [
        { key: "profileVisibility", title: t("set_visibility"), value: t("set_visibility_value"), action: edit, type: "text" },
        { key: "savedSpaces", title: t("set_saved_spaces"), value: t("set_saved_spaces_value"), action: edit, type: "text" },
      ],
    },
    {
      id: "notifications",
      title: t("set_notifications_title"),
      description: t("set_notifications_text"),
      items: [
        { key: "bookingAlerts", title: t("set_booking_alerts"), value: t("set_booking_alerts_value"), action: edit, type: "text" },
        { key: "marketing", title: t("set_marketing"), value: t("set_on"), action: edit, type: "text" },
      ],
    },
    {
      id: "payments",
      title: t("set_payments_title"),
      description: t("set_payments_text"),
      items: [
        { key: "paymentMethod", title: t("set_payment_method"), empty: t("set_no_data"), action: t("set_action_add"), type: "text" },
        { key: "receipts", title: t("set_receipts"), value: t("set_receipts_value"), action: edit, type: "text" },
      ],
    },
    {
      id: "language",
      title: t("set_language_title"),
      description: t("set_language_text"),
      items: [
        { key: "language", title: t("set_language"), value: t("set_language_value"), action: edit, type: "text" },
        { key: "currency", title: t("set_currency"), value: "UZS", action: edit, type: "text" },
      ],
    },
    {
      id: "booking",
      title: t("set_booking_title"),
      description: t("set_booking_text"),
      items: [
        { key: "companyBooking", title: t("set_company_booking"), value: t("set_company_booking_value"), action: edit, type: "text" },
        { key: "autoShare", title: t("set_auto_share"), value: t("set_auto_share_value"), action: edit, type: "text" },
      ],
    },
  ];
}

// Older builds stored the untouched default of every row; those must not stick
// to one language, so only values the person really typed are kept.
function isStoredDefault(key, value) {
  return Object.values(defaultContent).some((texts) => {
    const translate = (textKey) => texts[textKey];
    return [buildCompanySection(translate), ...buildSettingsSections(translate)]
      .flatMap((section) => section.items)
      .some((item) => item.key === key && item.value === value);
  });
}

function SettingsIcon({ type }) {
  const paths = {
    personal: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
    security: ["M12 3 20 7v5c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V7z", "m9 12 2 2 4-5"],
    privacy: ["M12 2s7 4 7 10-7 10-7 10-7-4-7-10 7-10 7-10Z", "M12 8v5l3 2"],
    notifications: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
    payments: ["M4 7h16v12H4z", "M4 11h16", "M8 15h3"],
    language: ["M4 5h9M9 3v2c0 4-2 7-5 9", "M5 9c1 3 3 5 7 6", "M13 21l4-9 4 9M15 17h4"],
    booking: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01M3 12h.01M3 18h.01"],
    company: ["M4 21V7l8-4 8 4v14", "M9 21v-6h6v6", "M9 10h.01M15 10h.01"],
    chevron: ["m9 18 6-6-6-6"],
    close: ["M18 6 6 18", "M6 6l12 12"]
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(paths[type] || paths.personal).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

// Settings rows stored inside profile_details on the account.
const DETAIL_SETTING_KEYS = { preferredName: "preferred_name", address: "address" };
const BACKEND_PROFILE_KEYS = new Set(["legalName", "email", "phone", "companyName", "partnerBio", ...Object.keys(DETAIL_SETTING_KEYS)]);

function profileValues(data, normalized) {
  const details = data?.profile_details || {};
  return {
    legalName: normalized.full_name,
    email: normalized.email,
    phone: normalized.phone_number,
    companyName: data?.company_name || "",
    partnerBio: data?.partner_bio || "",
    ...Object.fromEntries(Object.entries(DETAIL_SETTING_KEYS)
      .filter(([, detailKey]) => details[detailKey])
      .map(([key, detailKey]) => [key, details[detailKey]])),
  };
}

function AccountSettings({ userState, setUserState }) {
  const { t, lang } = useText();
  const sections = useMemo(() => {
    const settingsSections = buildSettingsSections(t);
    return userState?.isPartner ? [buildCompanySection(t), ...settingsSections] : settingsSections;
  }, [userState?.isPartner, t]);
  const [activeSectionId, setActiveSectionId] = useState("personal");
  const [editingKey, setEditingKey] = useState("");
  // Only real values live here; an untouched row shows its translated default.
  const [values, setValues] = useState({});
  const [draftValue, setDraftValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) || sections[0],
    [activeSectionId, sections]
  );

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/auth/profile/");
        if (!active) return;
        const normalized = normalizeProfile(response.data);
        const localValues = Object.fromEntries(
          Object.entries(readJsonStorage(STORAGE_KEYS.profile.localAccountSettings, {}))
            .filter(([key, value]) => !isStoredDefault(key, value))
        );
        setValues((current) => ({
          ...current,
          ...localValues,
          ...profileValues(response.data, normalized),
        }));
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, t("set_err_load"), lang));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => { active = false; };
  }, []);

  const startEditing = (item) => {
    setEditingKey(item.key);
    setDraftValue(values[item.key] || item.value || "");
  };

  const cancelEditing = () => {
    setEditingKey("");
    setDraftValue("");
  };

  const saveEditing = async () => {
    if (!editingKey) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (BACKEND_PROFILE_KEYS.has(editingKey)) {
        let payload = {};
        if (editingKey === "legalName") payload = splitFullName(draftValue);
        if (editingKey === "email") payload = { email: draftValue.trim() };
        if (editingKey === "phone") payload = { phone_number: draftValue.trim() };
        if (editingKey === "companyName") payload = { company_name: draftValue.trim() };
        if (editingKey === "partnerBio") payload = { partner_bio: draftValue.trim() };
        if (DETAIL_SETTING_KEYS[editingKey]) payload = { profile_details: { [DETAIL_SETTING_KEYS[editingKey]]: draftValue.trim() } };
        const response = await api.patch("/api/auth/profile/", payload);
        const normalized = cacheProfile(response.data);
        setUserState?.(profileToUserState(normalized, userState));
        setValues((current) => ({ ...current, ...profileValues(response.data, normalized) }));
      } else {
        const nextValues = { ...values, [editingKey]: draftValue };
        const localOnly = Object.fromEntries(
          Object.entries(nextValues).filter(([key]) => !BACKEND_PROFILE_KEYS.has(key))
        );
        writeJsonStorage(STORAGE_KEYS.profile.localAccountSettings, localOnly);
        setValues(nextValues);
      }
      setSuccess(BACKEND_PROFILE_KEYS.has(editingKey) ? t("set_saved") : t("set_saved_local"));
      cancelEditing();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("set_err_save"), lang));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-shell">
        <aside className="settings-sidebar" aria-label={t("set_title")}>
          <h1>{t("set_title")}</h1>
          <div className="settings-nav-list">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection.id === section.id ? "is-active" : ""}
                onClick={() => {
                  setActiveSectionId(section.id);
                  cancelEditing();
                }}
              >
                <span><SettingsIcon type={section.id} /></span>
                <b>{section.title}</b>
                <SettingsIcon type="chevron" />
              </button>
            ))}
          </div>
        </aside>

        <section className="settings-content">
          <div className="settings-content-head">
            <span>{t("set_kicker")}</span>
            <h2>{activeSection.title}</h2>
            <p>{activeSection.description}</p>
            {loading ? <p role="status">{t("set_loading")}</p> : null}
            {error ? <p role="alert" style={{ color: "#b91c1c" }}>{error}</p> : null}
            {success ? <p role="status" style={{ color: "#15803d" }}>{success}</p> : null}
          </div>

          <div className="settings-row-list">
            {activeSection.items.map((item) => {
              const isEditing = editingKey === item.key;
              const value = values[item.key] || item.value;

              return (
                <article className={`settings-row ${isEditing ? "is-editing" : ""}`} key={item.key}>
                  <div className="settings-row-copy">
                    <h3>{item.title}</h3>
                    {item.note ? <p>{item.note}</p> : null}
                    {!BACKEND_PROFILE_KEYS.has(item.key) ? <p>{t("set_local_note")}</p> : null}
                    <strong className={!value ? "is-empty" : ""}>{value || item.empty || t("set_no_data")}</strong>
                  </div>

                  {isEditing ? (
                    <div className="settings-edit-box">
                      {item.type === "textarea" ? (
                        <textarea
                          rows={4}
                          value={draftValue}
                          placeholder={item.title}
                          onChange={(event) => setDraftValue(event.target.value)}
                        />
                      ) : (
                        <input
                          type={item.type === "password" ? "text" : item.type}
                          value={draftValue}
                          placeholder={item.empty || item.title}
                          onChange={(event) => setDraftValue(event.target.value)}
                        />
                      )}
                      <div>
                        <button type="button" className="settings-save" onClick={saveEditing} disabled={saving}>
                          {saving ? t("cab_saving") : t("cab_save")}
                        </button>
                        <button type="button" className="settings-cancel" onClick={cancelEditing}>{t("cab_cancel")}</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="settings-row-action" onClick={() => startEditing(item)} disabled={loading}>
                      {item.action}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
    </section>
  );
}

export default AccountSettings;
