import { initialProfile, getCompletion, ProfileIcon } from "./helpers.jsx";
import { useText } from "../../context/LanguageContext.jsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fileToAvatarDataUrl } from "../../utils/avatarImage.js";
import api, { getApiErrorMessage, parseApiError } from "../../api/client.js";
import { cacheProfile, normalizeProfile, profileToUserState, questionnaireFromProfile, questionnaireToDetails } from "../../utils/profileMapper.js";
import { navigate } from "../../utils/router.js";
import { readJsonStorage, removeStorageItem, STORAGE_KEYS } from "../../utils/storageKeys.js";
import "./profileEdit.css";

// Language names are written in their own language, whatever the site language is.
const LANGUAGE_OPTIONS = ["O'zbekcha", "Русский", "English"];
const MAX_MISSING_SHOWN = 4;
const ABOUT_LIMIT = 500;

// Label of each field, in the order the form shows them. Scrolling to a missing
// field uses this order too.
const FIELD_LABELS = {
  firstName: "edit_first_name",
  lastName: "edit_last_name",
  role: "edit_role",
  phone: "edit_phone",
  email: "edit_email",
  city: "edit_location_label",
  birthYear: "edit_birth_year",
  work: "edit_work_label",
  company: "edit_company_short",
  languages: "edit_languages",
  interests: "edit_interests",
  about: "edit_about_label",
};

function splitList(value) {
  return String(value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function validate(draft, t) {
  const errors = {};
  if (!draft.firstName.trim()) errors.firstName = t("edit_err_first_name");
  const email = draft.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t("edit_err_email");
  const year = Number(draft.birthYear);
  if (draft.birthYear && (year < 1930 || year > new Date().getFullYear())) errors.birthYear = t("edit_err_year");
  return errors;
}

function focusField(key) {
  const element = document.getElementById(`pfe-${key}`);
  if (!element) return;
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  element.focus({ preventScroll: true });
}

function Field({ name, label, error, hint, wide, children }) {
  return (
    <div className={`pfe-field${wide ? " is-wide" : ""}${error ? " has-error" : ""}`}>
      <label htmlFor={`pfe-${name}`}>{label}</label>
      {children}
      {error ? <small className="pfe-error" role="alert">{error}</small> : hint ? <small>{hint}</small> : null}
    </div>
  );
}

// Buttons for common answers plus a box for anything else; stored as "a, b, c".
function ChipsField({ name, label, value, options, placeholder, onChange }) {
  const [custom, setCustom] = useState("");
  const selected = splitList(value);
  const chips = [...options, ...selected.filter((item) => !options.includes(item))];

  const toggle = (item) => {
    onChange((selected.includes(item) ? selected.filter((other) => other !== item) : [...selected, item]).join(", "));
  };

  const addCustom = () => {
    const item = custom.trim().replace(/,+$/, "");
    if (item && !selected.includes(item)) onChange([...selected, item].join(", "));
    setCustom("");
  };

  return (
    <div className="pfe-field is-wide">
      <label htmlFor={`pfe-${name}`}>{label}</label>
      <div className="pfe-chips">
        {chips.map((item) => {
          const isOn = selected.includes(item);
          return (
            <button key={item} type="button" className={isOn ? "is-on" : ""} aria-pressed={isOn} onClick={() => toggle(item)}>
              {isOn ? <ProfileIcon type="check" /> : null}
              {item}
            </button>
          );
        })}
        <input
          id={`pfe-${name}`}
          value={custom}
          placeholder={placeholder}
          onChange={(event) => setCustom(event.target.value)}
          onBlur={addCustom}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addCustom();
            }
          }}
        />
      </div>
    </div>
  );
}

export function ProfileQuestionnaireEdit({ userState, setUserState }) {
  const { t, lang } = useText();
  const [draft, setDraft] = useState(initialProfile);
  const [savedDraft, setSavedDraft] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const photoInputRef = useRef(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const completion = useMemo(() => getCompletion(draft), [draft]);
  const missing = Object.keys(FIELD_LABELS).filter((key) => !String(draft[key] || "").trim());
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const response = await api.get("/api/auth/profile/");
        if (!active) return;
        const profile = normalizeProfile(response.data);
        // Older builds kept the questionnaire in localStorage; it is moved to the account on the next save.
        const legacyLocal = readJsonStorage(STORAGE_KEYS.profile.localQuestionnaire, {});
        const loaded = {
          ...initialProfile,
          ...questionnaireFromProfile(response.data, legacyLocal),
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          email: profile.email || "",
          phone: profile.phone_number || "",
        };
        setDraft(loaded);
        setSavedDraft(loaded);
      } catch (requestError) {
        if (active) {
          setLoadFailed(true);
          setError(getApiErrorMessage(requestError, t("edit_err_load"), lang));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => { active = false; };
  }, []);

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
    setError("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!isDirty || saving || saved) return;

    const problems = validate(draft, t);
    setFieldErrors(problems);
    const firstProblem = Object.keys(FIELD_LABELS).find((key) => problems[key]);
    if (firstProblem) {
      focusField(firstProblem);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await api.patch("/api/auth/profile/", {
        first_name: draft.firstName.trim(),
        last_name: draft.lastName.trim(),
        email: draft.email.trim(),
        phone_number: draft.phone.trim(),
        profile_details: questionnaireToDetails(draft),
      });
      const profile = cacheProfile(response.data);
      setUserState?.(profileToUserState(profile, userState));
      removeStorageItem(STORAGE_KEYS.profile.localQuestionnaire);
      setSavedDraft(draft);
      setSaved(true);
      window.setTimeout(() => navigate("/profile"), 700);
    } catch (requestError) {
      const rejected = parseApiError(requestError).fieldErrors;
      if (rejected.email || rejected.phone_number) {
        const next = {
          ...(rejected.email ? { email: t("edit_err_email_used") } : {}),
          ...(rejected.phone_number ? { phone: t("edit_err_phone_used") } : {}),
        };
        setFieldErrors(next);
        focusField(rejected.email ? "email" : "phone");
      } else {
        setError(getApiErrorMessage(requestError, t("edit_err_save"), lang));
      }
    } finally {
      setSaving(false);
    }
  };

  // The photo is saved on its own, right away; it does not wait for the form's Save button.
  const savePhoto = async (avatar, fallbackKey) => {
    setPhotoSaving(true);
    setPhotoError("");
    try {
      const response = await api.patch("/api/auth/profile/", { avatar });
      const profile = cacheProfile(response.data);
      setUserState?.(profileToUserState(profile, userState));
    } catch (requestError) {
      setPhotoError(getApiErrorMessage(requestError, t(fallbackKey), lang));
    } finally {
      setPhotoSaving(false);
    }
  };

  const pickPhoto = () => {
    if (!photoSaving) photoInputRef.current?.click();
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await savePhoto(await fileToAvatarDataUrl(file), "prof_err_avatar");
    } catch {
      setPhotoError(t("prof_err_avatar"));
    }
  };

  const hasPhoto = Boolean(userState?.avatar);
  const fullName = `${draft.firstName} ${draft.lastName}`.trim();
  const initials = `${draft.firstName[0] || ""}${draft.lastName[0] || ""}`.toUpperCase() || "JZ";
  const place = [draft.city, draft.work].map((item) => item.trim()).filter(Boolean).join(", ");
  const previewTags = [...splitList(draft.languages), ...splitList(draft.interests)];

  const input = (key, extra = {}) => (
    <input
      id={`pfe-${key}`}
      value={draft[key] || ""}
      aria-invalid={Boolean(fieldErrors[key])}
      onChange={(event) => updateDraft(key, event.target.value)}
      {...extra}
    />
  );

  return (
    <section className="pfe">
        <header className="pfe-head">
          <a href="/profile" className="pfe-back">
            <ProfileIcon type="arrow" />
            {t("cab_back")}
          </a>
          <h1>{t("edit_title")}</h1>
        </header>

        <div className="pfe-layout">
          {/* The card fills in while the person types, so they see what the form is for. */}
          <aside className="pfe-card" aria-label={t("edit_your_profile")}>
            <div className="pfe-card-who">
              <button
                type="button"
                className={`pfe-avatar${photoSaving ? " is-busy" : ""}`}
                style={hasPhoto ? { backgroundImage: `url(${userState.avatar})` } : undefined}
                onClick={pickPhoto}
                disabled={photoSaving}
                aria-label={t(hasPhoto ? "prof_avatar_replace" : "prof_avatar_upload")}
              >
                {hasPhoto ? null : initials}
                <span className="pfe-avatar-cam" aria-hidden="true"><ProfileIcon type="camera" /></span>
              </button>
              <div>
                <strong>{fullName || t("edit_your_profile")}</strong>
                {draft.role.trim() ? <p>{draft.role}</p> : null}
              </div>
            </div>

            <div className="pfe-photo">
              <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              <button type="button" onClick={pickPhoto} disabled={photoSaving}>
                <ProfileIcon type="camera" />
                {photoSaving ? t("cab_saving") : t(hasPhoto ? "prof_avatar_replace" : "prof_avatar_upload")}
              </button>
              {hasPhoto ? (
                <button type="button" className="is-remove" onClick={() => savePhoto(null, "prof_err_avatar_delete")} disabled={photoSaving}>
                  {t("cab_delete")}
                </button>
              ) : null}
              {photoError ? <p className="is-error" role="alert">{photoError}</p> : <p>{t("edit_photo_note")}</p>}
            </div>
            {place ? <p className="pfe-card-place"><ProfileIcon type="pin" />{place}</p> : null}
            {previewTags.length ? (
              <ul className="pfe-card-tags">
                {previewTags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            ) : null}

            <div className="pfe-progress">
              <div className="pfe-progress-text">
                <span>{t("edit_filled")}</span>
                <b>{completion}%</b>
              </div>
              <div className="pfe-progress-track"><i style={{ width: `${completion}%` }} /></div>
            </div>

            {missing.length && !loading && !loadFailed ? (
              <div className="pfe-missing">
                <span>{t("edit_add_next")}</span>
                <div>
                  {missing.slice(0, MAX_MISSING_SHOWN).map((key) => (
                    <button key={key} type="button" onClick={() => focusField(key)}>{t(FIELD_LABELS[key])}</button>
                  ))}
                  {missing.length > MAX_MISSING_SHOWN ? <em>+{missing.length - MAX_MISSING_SHOWN}</em> : null}
                </div>
              </div>
            ) : null}
          </aside>

          <form className="pfe-sheet" onSubmit={saveProfile} noValidate>
            {loading ? <p className="pfe-state" role="status">{t("set_loading")}</p> : null}
            {loadFailed ? (
              <div className="pfe-state is-error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={() => window.location.reload()}>{t("cab_retry")}</button>
              </div>
            ) : null}

            {!loading && !loadFailed ? (
              <>
                <section className="pfe-group">
                  <h2>{t("edit_group_main")}</h2>
                  <div className="pfe-fields">
                    <Field name="firstName" label={t("edit_first_name")} error={fieldErrors.firstName}>
                      {input("firstName", { autoComplete: "given-name" })}
                    </Field>
                    <Field name="lastName" label={t("edit_last_name")}>
                      {input("lastName", { autoComplete: "family-name" })}
                    </Field>
                    <Field name="role" label={t("edit_role")} wide>
                      {input("role", { placeholder: t("edit_role_ph") })}
                    </Field>
                  </div>
                </section>

                <section className="pfe-group">
                  <h2>{t("edit_group_contacts")}</h2>
                  <div className="pfe-fields">
                    <Field name="phone" label={t("edit_phone")} error={fieldErrors.phone} hint={t("edit_phone_hint")}>
                      {input("phone", { type: "tel", autoComplete: "tel", placeholder: "+998 90 123 45 67" })}
                    </Field>
                    <Field name="email" label={t("edit_email")} error={fieldErrors.email}>
                      {input("email", { type: "email", autoComplete: "email", placeholder: "name@mail.com" })}
                    </Field>
                  </div>
                </section>

                <section className="pfe-group">
                  <h2>{t("edit_group_work")}</h2>
                  <div className="pfe-fields">
                    <Field name="city" label={t("edit_location_label")}>
                      {input("city", { placeholder: t("edit_city_ph") })}
                    </Field>
                    <Field name="birthYear" label={t("edit_birth_year")} error={fieldErrors.birthYear}>
                      <input
                        id="pfe-birthYear"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="1996"
                        value={draft.birthYear || ""}
                        aria-invalid={Boolean(fieldErrors.birthYear)}
                        onChange={(event) => updateDraft("birthYear", event.target.value.replace(/\D/g, ""))}
                      />
                    </Field>
                    <Field name="work" label={t("edit_work")}>
                      {input("work", { placeholder: t("edit_work_ph") })}
                    </Field>
                    <Field name="company" label={t("edit_company")}>
                      {input("company", { placeholder: t("edit_company_ph") })}
                    </Field>
                  </div>
                </section>

                <section className="pfe-group">
                  <h2>{t("edit_group_more")}</h2>
                  <div className="pfe-fields">
                    <ChipsField
                      name="languages"
                      label={t("edit_languages")}
                      value={draft.languages}
                      options={LANGUAGE_OPTIONS}
                      placeholder={t("edit_add_other")}
                      onChange={(value) => updateDraft("languages", value)}
                    />
                    <ChipsField
                      name="interests"
                      label={t("edit_interests")}
                      value={draft.interests}
                      options={splitList(t("edit_interest_options"))}
                      placeholder={t("edit_add_other")}
                      onChange={(value) => updateDraft("interests", value)}
                    />
                    <Field name="about" label={t("edit_about_label")} wide>
                      <textarea
                        id="pfe-about"
                        rows={3}
                        maxLength={ABOUT_LIMIT}
                        placeholder={t("edit_about_ph")}
                        value={draft.about || ""}
                        onChange={(event) => updateDraft("about", event.target.value)}
                      />
                    </Field>
                  </div>
                </section>

                <footer className="pfe-bar">
                  <p className={error ? "is-error" : isDirty ? "is-dirty" : ""} role={error ? "alert" : "status"}>
                    {error || (saved ? t("edit_saved") : isDirty ? t("edit_unsaved") : t("edit_no_changes"))}
                  </p>
                  <a href="/profile">{t("cab_cancel")}</a>
                  <button type="submit" disabled={!isDirty || saving || saved}>
                    {saved ? <ProfileIcon type="check" /> : null}
                    {saving ? t("cab_saving") : saved ? t("edit_saved_short") : t("cab_save")}
                  </button>
                </footer>
              </>
            ) : null}
          </form>
        </div>
    </section>
  );
}
