import { Icon, Header, SelectionCard, CounterRow, resolveIconName } from "./partnerOnboarding/parts.jsx";
import { AddressStep } from "./partnerOnboarding/AddressStep.jsx";
import { PowSelect } from "./partnerOnboarding/PowSelect.jsx";
import { PartnerWelcome } from "./partnerOnboarding/Welcome.jsx";
import { pickLocalized, useOnboardingText } from "./partnerOnboarding/onboardingText.js";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import api, { getAccessToken, getApiErrorMessage, withUploadTimeout } from "../api/client.js";
import { getStorageItem, removeStorageItem, STORAGE_KEYS } from "../utils/storageKeys.js";
import {
  buildPlacePayload,
  groupOnboardingErrors,
  mapPlaceApiErrors,
  validateOnboarding,
  validateOnboardingStep,
} from "../utils/placeOnboarding.js";
import "./PartnerOnboarding.css";
import "./partnerOnboarding/wizard.css";
import { navigate, useQueryParam } from "../utils/router.js";
import { BECOME_PARTNER_PATH, loginThenReturn, useAccountRole } from "../utils/partnerAccess.js";

// Wizard order. Step 4 (a manual address form whose fields were never saved)
// was removed; the remaining numbers stay as they are referenced by validation.
const WIZARD_STEPS = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12];
// A place for sale is never booked: no booking/hours step and no discounts.
const SALE_WIZARD_STEPS = WIZARD_STEPS.filter(item => item !== 10 && item !== 12);
const MIN_PHOTOS = 4;

// Sections the owner can jump to while editing an existing place.
const editSectionsFor = (steps, t) => steps.filter(item => item > 0).map(item => ({
  step: item,
  label: (item === 11 && steps === SALE_WIZARD_STEPS ? t.salePrice : t.steps[item]).label,
}));

const BOOKING_MODES = ["request", "instant"];

const PRICE_TIERS = [
  { id: "soatlik", placeholder: "50 000" },
  { id: "kunlik", placeholder: "250 000" },
  { id: "haftalik", placeholder: "1 500 000" },
  { id: "oylik", placeholder: "5 000 000" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => (
  `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`
));

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

function groupDigits(value) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("ru-RU") : "";
}

function paramIconName(param) {
  return resolveIconName(param);
}

// Remount on ?edit change so "add new" never inherits an unfinished edit.
export default function PartnerOnboardingPage() {
  const editId = useQueryParam("edit");
  useEffect(() => {
    // Edit mode used to live in localStorage; drop any leftover value.
    removeStorageItem(STORAGE_KEYS.workflow.editPlaceId);
  }, []);
  return <PartnerOnboarding key={editId || "new"} initialEditId={editId} />;
}

function PartnerOnboarding({ initialEditId = null }) {
  const account = useAccountRole();
  const { t, lang } = useOnboardingText();
  // Async callbacks read the current texts through a ref.
  const textRef = useRef(t);
  textRef.current = t;
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState(null);
  const [allParameters, setAllParameters] = useState([]);
  const [paramGroups, setParamGroups] = useState([]);
  const [objectType, setObjectType] = useState(null); // Category ID
  const [accessType, setAccessType] = useState(null); // SubCategory ID
  
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(41.2995);
  const [lng, setLng] = useState(69.2401);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  

  
  const [spaceTitle, setSpaceTitle] = useState("");
  const [descUz, setDescUz] = useState("");
  const [descRu, setDescRu] = useState("");
  const [descEn, setDescEn] = useState("");
  const [activeDescTab, setActiveDescTab] = useState("ru");
  
  const [capacity, setCapacity] = useState(10);
  const [area, setArea] = useState(50);
  const [customCounters, setCustomCounters] = useState({});
  const [customSelects, setCustomSelects] = useState({});
  const [amenities, setAmenities] = useState([]);
  
  const [prices, setPrices] = useState({ soatlik: "", kunlik: "", haftalik: "", oylik: "" });
  const [enabledPrices, setEnabledPrices] = useState({ soatlik: false, kunlik: false, haftalik: false, oylik: false });
  const [salePrice, setSalePrice] = useState("");
  const [dealType, setDealType] = useState("rent");
  
  const [photos, setPhotos] = useState([]);
  const [bookingType, setBookingType] = useState("request");
  const [opensAt, setOpensAt] = useState("09:00");
  const [closesAt, setClosesAt] = useState("18:00");
  const [selectedDiscountIds, setSelectedDiscountIds] = useState([]);
  const [apiDiscounts, setApiDiscounts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });
  const [stepErrors, setStepErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [editPlaceId, setEditPlaceId] = useState(initialEditId);
  const [originalPlaceStatus, setOriginalPlaceStatus] = useState(null);
  const [moderationConfirmOpen, setModerationConfirmOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(Boolean(initialEditId));
  const isEditing = Boolean(editPlaceId);

  const showToast = (message, type = "success") => {
    setToast({ open: true, message, type });
    setTimeout(() => setToast({ open: false, message: "", type: "success" }), 4000);
  };

  const screenRef = useRef(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      api.get("/api/auth/profile/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setProfile(res.data))
      .catch(err => showToast(getApiErrorMessage(err, textRef.current.profileError), "error"));
    }

    api.get("/api/categories/", { skipAuth: true })
      .then(res => {
         setCategories(res.data?.results || res.data || []);
         setCategoriesError(null);
      })
      .catch(err => {
         setCategoriesError(getApiErrorMessage(err, textRef.current.categoriesError));
      });
      
    api.get("/api/parameters/", { skipAuth: true })
      .then(res => setAllParameters(res.data?.results || res.data || []))
      .catch(err => console.log("No params endpoint, ignoring", err));
      
    api.get("/api/parameter-groups/", { skipAuth: true })
      .then(res => setParamGroups(res.data?.results || res.data || []))
      .catch(err => console.log("No param groups endpoint, ignoring", err));

    api.get("/api/discounts/", { skipAuth: true })
      .then(res => setApiDiscounts(res.data?.results || res.data || []))
      .catch(err => console.log("No discounts endpoint yet", err));
  }, []);

  useEffect(() => {
    const editId = editPlaceId;
    if (editId) {
      api.get(`/api/places/${editId}/`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      })
      .then(res => {
        const p = res.data;
        setOriginalPlaceStatus(p.status || null);
        setSpaceTitle(p.title || "");
        setDescRu(p.description_ru || "");
        setDescUz(p.description_uz || "");
        setDescEn(p.description_en || "");
        setAddress(p.location || "");
        setAddressConfirmed(Boolean(p.location));
        setLat(p.latitude || 41.311081);
        setLng(p.longitude || 69.240562);
        setCapacity(p.people || 0);
        setArea(p.area || 0);
        setBookingType(p.booking_type || "request");
        setOpensAt(String(p.opens_at || "09:00").slice(0, 5));
        setClosesAt(String(p.closes_at || "18:00").slice(0, 5));
        setAmenities(p.amenities || []);
        
        const counters = {};
        const selects = {};
        if (p.characteristics) {
          Object.keys(p.characteristics).forEach(k => {
            const val = p.characteristics[k];
            if (typeof val === 'number') {
              counters[k] = val;
            } else {
              selects[k] = val;
            }
          });
        }
        setCustomCounters(counters);
        setCustomSelects(selects);
        
        const loadedPrices = {
          soatlik: p.prices?.soatlik ?? p.price_hourly ?? "",
          kunlik: p.prices?.kunlik ?? p.price_daily ?? "",
          haftalik: p.prices?.haftalik ?? p.price_weekly ?? "",
          oylik: p.prices?.oylik ?? p.price_monthly ?? "",
        };
        setPrices(loadedPrices);
        setSalePrice(p.sale_price != null ? String(Math.round(Number(p.sale_price))) : "");
        setDealType(p.deal_type === "sale" ? "sale" : "rent");
        setEnabledPrices(Object.fromEntries(
          Object.entries(loadedPrices).map(([key, value]) => [key, value !== "" && value !== null]),
        ));
        
        const savedDiscountIds = p.discount_ids || p.discounts;
        if (Array.isArray(savedDiscountIds)) {
          setSelectedDiscountIds(savedDiscountIds.map(item => (
            typeof item === "object" && item !== null ? item.id : item
          )).filter(Boolean));
        }
        
        if (p.images) {
          setPhotos(p.images.map(img => ({
            id: Math.random().toString(36).substring(7),
            name: "Uploaded Image",
            url: img
          })));
        }
        
        if (p.subcategory_info) {
          const subcategoryCategory = p.subcategory_info.category;
          const categoryId = typeof subcategoryCategory === "object"
            ? subcategoryCategory?.id
            : subcategoryCategory;
          setObjectType(categoryId || null);
          setAccessType(p.subcategory_info.id || null);
        }
        
        setStep(1); // Skip introduction welcome step when editing
        setEditLoading(false);
      })
      .catch(err => {
        showToast(getApiErrorMessage(err, textRef.current.editLoadError), "error");
        const returnHash = getStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
        removeStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
        setEditPlaceId(null);
        setEditLoading(false);
        if (returnHash) {
          window.setTimeout(() => { navigate(returnHash); }, 1200);
        }
      });
    }
  }, [editPlaceId]);

  const selectedCategory = categories.find(c => c.id === objectType);
  // "both" categories let the owner pick; otherwise the category decides.
  const allowedDeals = selectedCategory?.deal_types === "both" ? ["rent", "sale"] : [selectedCategory?.deal_types || "rent"];
  const effectiveDeal = allowedDeals.includes(dealType) ? dealType : allowedDeals[0];
  const isSale = effectiveDeal === "sale";
  const wizardSteps = isSale ? SALE_WIZARD_STEPS : WIZARD_STEPS;
  const selectedSubCategory = selectedCategory?.subcategories?.find(s => s.id === accessType);
  
  
  const subCatParams = selectedSubCategory?.parameters || [];
  const counterParams = subCatParams.filter(p => p.type === 'counter');
  
  // Fallback to all parameters if subCatParams is empty (backend might not have linked them)
  const booleanParams = subCatParams.some(p => p.type === 'boolean') 
    ? subCatParams.filter(p => p.type === 'boolean') 
    : allParameters.filter(p => p.type === 'boolean');
    
  const selectParams = subCatParams.filter(p => p.type === 'select');

  const getFormData = () => ({
    objectType,
    accessType,
    address,
    lat,
    lng,
    addressConfirmed,
    photos,
    spaceTitle,
    descRu,
    descUz,
    descEn,
    capacity,
    area,
    customCounters,
    customSelects,
    amenities,
    prices,
    enabledPrices,
    isSale,
    dealType: effectiveDeal,
    salePrice,
    bookingType,
    opensAt,
    closesAt,
    selectedDiscountIds,
  });

  const focusDescriptionError = (errors) => {
    if (errors.some(item => item.field === "description_uz")) setActiveDescTab("uz");
    else if (errors.some(item => item.field === "description_en")) setActiveDescTab("en");
    else if (errors.some(item => item.field === "description_ru")) setActiveDescTab("ru");
  };

  const handleNext = () => {
    const errors = validateOnboardingStep(step, getFormData(), lang);
    if (errors.length > 0) {
      setStepErrors(prev => ({ ...prev, [step]: errors.map(item => item.message) }));
      focusDescriptionError(errors);
      showToast(errors[0].message, "error");
      return;
    }
    setStepErrors(prev => ({ ...prev, [step]: [] }));
    const index = wizardSteps.indexOf(step);
    setStep(wizardSteps[Math.min(wizardSteps.length - 1, index + 1)]);
  };

  useEffect(() => {
    if (!screenRef.current) return;
    gsap.fromTo(screenRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    const availableSlots = Math.max(0, 10 - photos.length);
    const acceptedFiles = files.slice(0, availableSlots);
    if (acceptedFiles.length < files.length) {
      showToast(t.tooManyPhotos, "error");
    }
    const newPhotos = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      url: URL.createObjectURL(file),
      file: file
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const isPrivilegedEditor = Boolean(
    profile?.role === "admin"
    || profile?.role === "moderator"
    || profile?.is_staff
    || profile?.is_superuser,
  );
  const requiresRemoderationConfirmation = Boolean(
    editPlaceId && originalPlaceStatus === "approved" && !isPrivilegedEditor,
  );

  const handleBooking = async ({ moderationConfirmed = false } = {}) => {
    const formData = getFormData();
    const validationErrors = validateOnboarding(formData, lang);
    if (validationErrors.length > 0) {
      const groupedErrors = groupOnboardingErrors(validationErrors);
      const firstStep = Math.min(...validationErrors.map(item => item.step));
      setStepErrors(groupedErrors);
      setStep(firstStep);
      focusDescriptionError(validationErrors.filter(item => item.step === firstStep));
      showToast(validationErrors[0].message, "error");
      return;
    }

    if (requiresRemoderationConfirmation && !moderationConfirmed) {
      setModerationConfirmOpen(true);
      return;
    }

    setModerationConfirmOpen(false);
    setSubmitting(true);
    try {
      showToast(t.uploading, "info");
      
      // 1. Upload images to backend
      const uploadedImageUrls = [];
      for (const photo of photos) {
        if (photo.file) {
          const formData = new FormData();
          formData.append("image", photo.file);
          const uploadRes = await api.post("/api/places/upload_image/", formData, withUploadTimeout({
            headers: {
              "Content-Type": "multipart/form-data"
            }
          }));
          if (uploadRes.data?.url) {
            uploadedImageUrls.push(uploadRes.data.url);
          }
        } else {
          uploadedImageUrls.push(photo.url);
        }
      }

      const payload = buildPlacePayload(formData, uploadedImageUrls);

      const token = getAccessToken();
      const editId = editPlaceId;
      
      let response;
      if (editId) {
        response = await api.put(`/api/places/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await api.post("/api/places/", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      const shouldBecomePending = !editId || !isPrivilegedEditor;
      if (shouldBecomePending && response.data?.status !== "pending") {
        throw new Error(t.badStatus);
      }

      if (editId) {
        setEditPlaceId(null);
        if (requiresRemoderationConfirmation) {
          showToast(t.sentRemoderation, "success");
        } else if (isPrivilegedEditor) {
          showToast(t.savedChanges, "success");
        } else {
          showToast(t.updatedModeration, "success");
        }
      } else {
        showToast(t.sentModeration, "success");
      }
      
      const returnHash = getStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
      removeStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
      setTimeout(() => {
        navigate(returnHash || "/host-listings");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("joyzone-place-saved", {
            detail: { id: response.data?.id, status: response.data?.status },
          }));
        }, 500);
      }, 2000);
    } catch(err) {
      const backendErrors = mapPlaceApiErrors(err.response?.data, lang);
      if (backendErrors.length > 0) {
        const groupedErrors = groupOnboardingErrors(backendErrors);
        const firstStep = Math.min(...backendErrors.map(item => item.step));
        setStepErrors(prev => ({ ...prev, ...groupedErrors }));
        setStep(firstStep);
        focusDescriptionError(backendErrors.filter(item => item.step === firstStep));
        showToast(backendErrors[0].message, "error");
      } else {
        showToast(t.publishError + getApiErrorMessage(err, t.saveFailed), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEditing = () => {
    const returnHash = getStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
    removeStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
    navigate(returnHash || "/host-listings");
  };

  const jumpToStep = (target) => {
    setStepErrors(prev => ({ ...prev, [step]: [] }));
    setStep(target);
  };

  const goBack = () => {
    const index = wizardSteps.indexOf(step);
    setStep(wizardSteps[Math.max(0, index - 1)]);
  };

  useEffect(() => {
    document.querySelector(".pe-nav-steps .is-active")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [step]);

  const saveLabel = isEditing
    ? (submitting ? t.saving : <>{t.save}<span className="pow-hide-mobile">{t.saveChanges}</span></>)
    : (submitting ? t.publishing : t.publish);

  const stepNumber = wizardSteps.indexOf(step);
  const stepMeta = (isSale && step === 11 ? t.salePrice : t.steps[step]) || {};
  const filledLangs = { ru: descRu.trim(), uz: descUz.trim(), en: descEn.trim() };
  const visibleDiscounts = apiDiscounts.filter(d => (
    d.is_active && (d.applicable_to === "all" || d.category_ids?.includes(objectType) || selectedDiscountIds.includes(d.id))
  ));
  const toggleDiscount = (id) => {
    setSelectedDiscountIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };
  const toggleAmenity = (slug) => {
    setAmenities(prev => (prev.includes(slug) ? prev.filter(a => a !== slug) : [...prev, slug]));
  };
  const makeCover = (id) => {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      return target ? [target, ...prev.filter(p => p.id !== id)] : prev;
    });
  };

  const renderCopy = () => (
    <div className="pow-copy">
      <span className="pow-eyebrow">{t.stepOf(stepNumber, wizardSteps.length - 1)} · {stepMeta.label}</span>
      <h1>{stepMeta.title}</h1>
      {stepMeta.hint ? <p>{stepMeta.hint}</p> : null}
      {stepErrors[step]?.length > 0 ? (
        <div className="pow-errors" role="alert">
          {stepErrors[step].map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}
        </div>
      ) : stepMeta.tip ? (
        <div className="pow-tip"><Icon name="spark" />{stepMeta.tip}</div>
      ) : null}
    </div>
  );

  const renderStepBody = () => {
    if (step === 1) {
      return (
        <div className="pow-choice-grid">
          {categories.length === 0 && !categoriesError ? <p className="pow-muted">{t.loading}</p> : null}
          {categoriesError ? <p className="pow-field-error">{t.errorPrefix}{categoriesError}</p> : null}
          {categories.map(c => (
            <SelectionCard
              key={c.id}
              item={c}
              hint={`${t.deals[c.deal_types] || t.deals.rent} · ${t.formatCount(c.subcategories?.length || 0)}`}
              active={objectType === c.id}
              onClick={() => { setObjectType(c.id); setAccessType(null); }}
            />
          ))}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="pow-stack">
        {allowedDeals.length > 1 ? (
          <div className="pow-deal-switch" role="radiogroup" aria-label={t.dealAria}>
            {[["rent", ...t.dealRent], ["sale", ...t.dealSale]].map(([value, title, text]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={effectiveDeal === value}
                data-testid={`onboarding-deal-${value}`}
                className={effectiveDeal === value ? "is-active" : ""}
                onClick={() => setDealType(value)}
              >
                <strong>{title}</strong>
                <small>{text}</small>
              </button>
            ))}
          </div>
        ) : null}
        <div className="pow-choice-grid">
          {!selectedCategory ? <p className="pow-muted">{t.pickTypeFirst}</p> : null}
          {selectedCategory?.subcategories?.map(s => (
            <SelectionCard
              key={s.id}
              item={s}
              hint={pickLocalized(selectedCategory, lang)}
              active={accessType === s.id}
              onClick={() => setAccessType(s.id)}
            />
          ))}
        </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <AddressStep address={address} setAddress={setAddress} lat={lat} setLat={setLat} lng={lng} setLng={setLng} confirmed={addressConfirmed} setConfirmed={setAddressConfirmed} />
      );
    }

    if (step === 5) {
      const missing = Math.max(0, MIN_PHOTOS - photos.length);
      return (
        <div className="pow-photos">
          <label
            className="pow-dropzone"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <input data-testid="onboarding-photos" type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <span className="pow-dropzone-icon"><Icon name="upload" /></span>
            <span>
              <strong>{t.addPhotos}</strong>
              <small>{t.addPhotosHint}</small>
            </span>
          </label>
          <div className="pow-photo-status">
            <div className="pow-meter"><i style={{ width: `${Math.min(100, (photos.length / MIN_PHOTOS) * 100)}%` }} /></div>
            <span className={missing ? "" : "is-done"}>
              {missing ? t.photosMissing(photos.length, MIN_PHOTOS, missing) : t.photosDone(photos.length)}
            </span>
          </div>
          <div className="pow-photo-grid">
            {photos.map((p, i) => (
              <figure key={p.id} className={i === 0 ? "is-cover" : ""}>
                <img src={p.url} alt="" />
                {i === 0 ? <figcaption>{t.cover}</figcaption> : (
                  <button type="button" className="pow-photo-cover" onClick={() => makeCover(p.id)}>{t.makeCover}</button>
                )}
                <button type="button" className="pow-photo-remove" aria-label={t.removePhoto} onClick={() => setPhotos(photos.filter(pt => pt.id !== p.id))}>×</button>
              </figure>
            ))}
            {Array.from({ length: Math.max(0, MIN_PHOTOS - photos.length) }).map((_, i) => (
              <div key={`slot-${i}`} className="pow-photo-slot"><Icon name="image" /></div>
            ))}
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="pow-stack">
          <label className="pow-field">
            <span>{t.titleLabel} <small>{spaceTitle.length}/50</small></span>
            <input
              data-testid="onboarding-title"
              className="pow-input is-large"
              value={spaceTitle}
              maxLength={50}
              placeholder={t.titlePh}
              onChange={e => setSpaceTitle(e.target.value)}
            />
          </label>
          <div className="pow-preview">
            <span className="pow-preview-label">{t.previewLabel}</span>
            <article>
              <div className="pow-preview-img">
                {photos[0] ? <img src={photos[0].url} alt="" /> : <Icon name="image" />}
              </div>
              <div>
                <strong>{spaceTitle || t.titleFallback}</strong>
                <small><Icon name="pin" />{address ? address.split(",").slice(0, 2).join(",") : t.noAddress}</small>
                <em>{pickLocalized(selectedSubCategory, lang) || pickLocalized(selectedCategory, lang) || t.categoryFallback}</em>
              </div>
            </article>
          </div>
        </div>
      );
    }

    if (step === 7) {
      const descValue = activeDescTab === "ru" ? descRu : activeDescTab === "uz" ? descUz : descEn;
      const setDesc = activeDescTab === "ru" ? setDescRu : activeDescTab === "uz" ? setDescUz : setDescEn;
      return (
        <div className="pow-stack">
          <div className="pow-tabs" role="tablist">
            {["uz", "ru", "en"].map(id => ({ id, label: t.descTabs[id] })).map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeDescTab === tab.id}
                data-testid={`onboarding-description-tab-${tab.id}`}
                className={activeDescTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveDescTab(tab.id)}
              >
                <i className={filledLangs[tab.id] ? "is-filled" : ""} aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>
          <label className="pow-field">
            <span>{t.descLabel} · {activeDescTab.toUpperCase()} <small>{descValue.length}/500</small></span>
            <textarea
              key={activeDescTab}
              data-testid={`onboarding-description-${activeDescTab}`}
              className="pow-input pow-textarea"
              rows={9}
              maxLength={500}
              value={descValue}
              placeholder={t.descPh}
              onChange={e => setDesc(e.target.value)}
            />
          </label>
        </div>
      );
    }

    if (step === 8) {
      return (
        <div className="pow-counter-grid">
          <div className="pow-counter-card">
            <span className="pow-counter-icon"><Icon name="users" /></span>
            <CounterRow label={t.capacity} value={Number(capacity) || 0} onChange={setCapacity} />
          </div>
          <div className="pow-counter-card">
            <span className="pow-counter-icon"><Icon name="area" /></span>
            <label className="pow-area">
              <span>{t.area}</span>
              <span className="pow-suffix-input">
                <input data-testid="onboarding-area" type="number" min="1" step="1" value={area} onChange={e => setArea(e.target.value)} placeholder="50" />
                <small>{t.sqm}</small>
              </span>
            </label>
          </div>
          {counterParams.map(p => (
            <div key={p.slug} className="pow-counter-card">
              <span className="pow-counter-icon"><Icon name={paramIconName(p)} /></span>
              <CounterRow label={pickLocalized(p, lang)} value={Number(customCounters[p.slug]) || 0} onChange={val => setCustomCounters({ ...customCounters, [p.slug]: val })} />
            </div>
          ))}
          {selectParams.map(p => (
            <div key={p.slug} className="pow-counter-card pow-select-card">
              <span>{pickLocalized(p, lang)}</span>
              <PowSelect
                ariaLabel={pickLocalized(p, lang)}
                value={customSelects[p.slug] || ""}
                onChange={val => setCustomSelects({ ...customSelects, [p.slug]: val })}
                options={[
                  { value: "", label: t.notSelected },
                  ...(p.config?.options || []).map(opt => ({ value: opt.slug, label: opt[lang] || opt.ru || opt.uz || opt.slug })),
                ]}
              />
            </div>
          ))}
        </div>
      );
    }

    if (step === 9) {
      return (
        <div className="pow-stack">
          <div className="pow-amenity-grid">
            {booleanParams.map(p => {
              const isSel = amenities.includes(p.slug);
              return (
                <button type="button" key={p.slug} className={`pow-amenity ${isSel ? "is-selected" : ""}`} aria-pressed={isSel} onClick={() => toggleAmenity(p.slug)}>
                  <span className="pow-amenity-icon"><Icon name={paramIconName(p)} /></span>
                  <strong>{pickLocalized(p, lang)}</strong>
                  <i aria-hidden="true" />
                </button>
              );
            })}
          </div>
          {booleanParams.length === 0 ? <p className="pow-muted">{t.noAmenities}</p> : (
            <p className="pow-muted">{t.amenitiesPicked(amenities.filter(a => booleanParams.some(p => p.slug === a)).length, booleanParams.length)}</p>
          )}
        </div>
      );
    }

    if (step === 10) {
      return (
        <div className="pow-stack">
          <div className="pow-mode-grid">
            {BOOKING_MODES.map(id => (
              <button key={id} type="button" className={`pow-mode ${bookingType === id ? "is-selected" : ""}`} onClick={() => setBookingType(id)}>
                <span className="pow-mode-icon"><Icon name={id} /></span>
                <strong>{t.bookingModes[id].title}</strong>
                <small>{t.bookingModes[id].text}</small>
              </button>
            ))}
          </div>
          <div className="pow-hours">
            <span className="pow-hours-title"><Icon name="clock" />{t.hours}</span>
            <div className="pow-hours-field">
              <span>{t.opens}</span>
              <PowSelect compact testId="onboarding-opens-at" ariaLabel={t.opens} value={opensAt} onChange={setOpensAt} options={TIME_OPTIONS.map(time => ({ value: time, label: time }))} />
            </div>
            <div className="pow-hours-field">
              <span>{t.closes}</span>
              <PowSelect compact testId="onboarding-closes-at" ariaLabel={t.closes} value={closesAt} onChange={setClosesAt} options={[...TIME_OPTIONS.slice(1), "23:59"].map(time => ({ value: time, label: time }))} />
            </div>
          </div>
          {closesAt <= opensAt ? <p className="pow-field-error">{t.hoursError}</p> : (
            <p className="pow-muted">{t.hoursHint}</p>
          )}
        </div>
      );
    }

    if (step === 11 && isSale) {
      const perMeter = Number(salePrice) > 0 && Number(area) > 0 ? Math.round(Number(salePrice) / Number(area)) : 0;
      return (
        <div className="pow-stack">
          <div className="pow-price is-on pow-sale-price">
            <span className="pow-sale-price-label">
              <strong>{t.objectPrice}</strong>
              <small>{t.fullSalePrice}</small>
            </span>
            <span className="pow-suffix-input">
              <input
                data-testid="onboarding-sale-price"
                inputMode="numeric"
                placeholder="1 500 000 000"
                value={groupDigits(salePrice)}
                onChange={e => setSalePrice(digitsOnly(e.target.value))}
                aria-label={t.salePriceAria}
              />
              <small>{t.currency}</small>
            </span>
          </div>
          {perMeter > 0 ? (
            <p className="pow-muted">{t.perMeter(groupDigits(String(perMeter)), area)}</p>
          ) : null}
        </div>
      );
    }

    if (step === 11) {
      return (
        <div className="pow-price-list">
          {PRICE_TIERS.map(tier => {
            const isActive = enabledPrices[tier.id];
            return (
              <div key={tier.id} className={`pow-price ${isActive ? "is-on" : ""}`}>
                <button
                  type="button"
                  data-testid={`onboarding-price-toggle-${tier.id}`}
                  className="pow-switch"
                  role="switch"
                  aria-checked={Boolean(isActive)}
                  onClick={() => setEnabledPrices({ ...enabledPrices, [tier.id]: !isActive })}
                >
                  <i aria-hidden="true" />
                  <span>
                    <strong>{t.priceTiers[tier.id].label}</strong>
                    <small>{t.priceTiers[tier.id].hint}</small>
                  </span>
                </button>
                <span className="pow-suffix-input">
                  <input
                    data-testid={`onboarding-price-${tier.id}`}
                    inputMode="numeric"
                    disabled={!isActive}
                    placeholder={isActive ? tier.placeholder : t.priceOff}
                    value={isActive ? groupDigits(prices[tier.id]) : ""}
                    onChange={e => setPrices({ ...prices, [tier.id]: digitsOnly(e.target.value) })}
                    aria-label={t.priceAria(t.priceTiers[tier.id].label)}
                  />
                  <small>{t.currency}</small>
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    if (step === 12) {
      return (
        <div className="pow-stack">
          {visibleDiscounts.length === 0 ? (
            <div className="pow-empty"><Icon name="tag" /><p>{t.noDiscounts}</p></div>
          ) : (
            <div className="pow-discount-list">
              {visibleDiscounts.map(discount => {
                const isActive = selectedDiscountIds.includes(discount.id);
                return (
                  <button key={discount.id} type="button" className={`pow-discount ${isActive ? "is-selected" : ""}`} aria-pressed={isActive} onClick={() => toggleDiscount(discount.id)}>
                    <b>−{discount.percent}%</b>
                    <span>
                      <strong>{pickLocalized(discount, lang)}</strong>
                      {pickLocalized(discount, lang, "description") ? <small>{pickLocalized(discount, lang, "description")}</small> : null}
                    </span>
                    <i aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
          <p className="pow-muted">{t.discountsHint}</p>
        </div>
      );
    }

    return null;
  };

  const isLastStep = step === wizardSteps[wizardSteps.length - 1];
  const isWelcome = step === 0 && !editLoading;
  // Only partners list places: guests log in first, clients fill the partner form.
  const startWizard = () => {
    if (!account.isAuthed) return loginThenReturn("/partner");
    if (!account.canListPlaces) return navigate(BECOME_PARTNER_PATH);
    window.scrollTo(0, 0);
    setStep(1);
  };

  return (
    <main className={`partner-onboarding-page pow${isEditing ? " is-editing" : ""}${isWelcome ? " is-welcome" : ""}`}>
      <Header profile={profile} />
      {isEditing && !editLoading ? (
        <nav className="pe-nav" aria-label={t.editSections}>
          <div className="pe-nav-title">
            <span>{t.editing}</span>
            <strong>{spaceTitle || t.listingFallback}</strong>
          </div>
          <div className="pe-nav-steps">
            {editSectionsFor(wizardSteps, t).map(item => (
              <button
                key={item.step}
                type="button"
                className={step === item.step ? "is-active" : ""}
                aria-current={step === item.step ? "step" : undefined}
                onClick={() => jumpToStep(item.step)}
              >
                {item.label}
                {stepErrors[item.step]?.length ? <i aria-label={t.hasErrors} /> : null}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      <section ref={screenRef} className={`pow-card screen-${step}`}>
        {editLoading && step === 0 ? (
          <div className="pe-loading" role="status">
            <span className="pe-spinner" aria-hidden="true" />
            {t.editLoading}
          </div>
        ) : step === 0 ? (
          <PartnerWelcome onStart={startWizard} />
        ) : (
          <div className={`pow-step pow-step-${step}`}>
            {renderCopy()}
            <div className="pow-body">{renderStepBody()}</div>
          </div>
        )}
      </section>

      {step > 0 && (
        <footer className="pow-footer">
          <div className="pow-progress" aria-hidden="true">
            <i style={{ width: `${(stepNumber / (wizardSteps.length - 1)) * 100}%` }} />
          </div>
          <div className="pow-footer-row">
            <div className="pow-footer-left">
              <button
                type="button"
                className="pow-btn is-ghost"
                disabled={submitting || (isEditing && stepNumber <= 1)}
                onClick={goBack}
              >
                <Icon name="chevronLeft" />{t.back}
              </button>
              {isEditing ? <button type="button" className="pow-btn is-link" disabled={submitting} onClick={cancelEditing}>{t.cancel}</button> : null}
            </div>
            <span className="pow-footer-step">{stepNumber} / {wizardSteps.length - 1}</span>
            <div className="pow-footer-right">
              {!isLastStep ? (
                <button data-testid="onboarding-next" type="button" className={`pow-btn ${isEditing ? "is-outline" : "is-primary"}`} disabled={submitting} onClick={handleNext}>
                  {t.next}<Icon name="chevronRight" />
                </button>
              ) : null}
              {isEditing || isLastStep ? (
                <button data-testid="onboarding-publish" type="button" className="pow-btn is-primary" disabled={submitting} onClick={() => handleBooking()}>
                  {saveLabel}
                </button>
              ) : null}
            </div>
          </div>
        </footer>
      )}

      {moderationConfirmOpen && (
        <div className="partner-moderation-confirm-overlay" onClick={() => setModerationConfirmOpen(false)}>
          <div
            className="partner-moderation-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-moderation-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="partner-moderation-confirm-icon" aria-hidden="true">!</div>
            <h2 id="partner-moderation-confirm-title">{t.confirmTitle}</h2>
            <p>{t.confirmText}</p>
            <div className="partner-moderation-confirm-actions">
              <button type="button" className="partner-back" onClick={() => setModerationConfirmOpen(false)}>
                {t.confirmCancel}
              </button>
              <button
                type="button"
                className="partner-next is-publish"
                onClick={() => handleBooking({ moderationConfirmed: true })}
              >
                {t.confirmSend}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast.open && (
        <div data-testid={`onboarding-toast-${toast.type}`} style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: toast.type === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${toast.type === 'error' ? '#f87171' : '#86efac'}`,
          padding: '16px 24px', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 9999, fontWeight: 500,
          animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          {toast.type === 'error' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          )}
          {toast.message}
          <style>{`
            @keyframes slideUpFade {
              from { opacity: 0; transform: translate(-50%, 20px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      )}
    </main>
  );
}
