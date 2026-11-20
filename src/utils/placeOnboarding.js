const PRICE_DEFINITIONS = [
  { key: "soatlik", field: "price_hourly" },
  { key: "kunlik", field: "price_daily" },
  { key: "haftalik", field: "price_weekly" },
  { key: "oylik", field: "price_monthly" },
];

const FIELD_STEPS = {
  category: 1,
  subcategory: 2,
  location: 3,
  latitude: 3,
  longitude: 3,
  address: 3,
  street: 4,
  images: 5,
  title: 6,
  description_ru: 7,
  description_uz: 7,
  description_en: 7,
  area: 8,
  people: 8,
  characteristics: 8,
  amenities: 9,
  booking_type: 10,
  opens_at: 10,
  closes_at: 10,
  price: 11,
  prices: 11,
  price_hourly: 11,
  price_daily: 11,
  price_weekly: 11,
  price_monthly: 11,
  sale_price: 11,
  currency: 11,
  discounts: 12,
  discount_ids: 12,
};

// Validation texts in three languages; Uzbek is the fallback.
const MESSAGES = {
  uz: {
    category: "Obyekt turini tanlang.",
    subcategory: "Obyekt formatini tanlang.",
    address: "Obyekt manzilini kiriting.",
    addressConfirm: "Manzilni xaritadagi nuqta bilan tasdiqlang.",
    latitude: "Kenglikni aniqlab bo'lmadi.",
    longitude: "Uzunlikni aniqlab bo'lmadi.",
    photosMin: "Kamida 4 ta rasm yuklang.",
    photosMax: "10 tadan ortiq rasm yuklab bo'lmaydi.",
    title: "Obyekt nomini kiriting.",
    descRu: "Rus tilidagi tavsifni to'ldiring.",
    descUz: "O'zbek tilidagi tavsifni to'ldiring.",
    descEn: "Ingliz tilidagi tavsifni to'ldiring.",
    area: "Maydon noldan katta butun son bo'lishi kerak.",
    people: "Sig'im noldan katta butun son bo'lishi kerak.",
    amenities: "Qulayliklar ro'yxat bo'lishi kerak.",
    booking: "Bron formatini tanlang.",
    salePrice: "Noldan katta sotish narxini kiriting.",
    priceTooBig: "Narx ruxsat etilgan qiymatdan oshib ketdi.",
    pricesNone: "Kamida bitta to'lov formatini yoqing.",
    pricePositive: "Noldan katta narx kiriting.",
    discounts: "Tanlangan chegirmalarni o'qib bo'lmadi.",
  },
  ru: {
    category: "Выберите тип объекта.",
    subcategory: "Выберите подкатегорию объекта.",
    address: "Укажите адрес объекта.",
    addressConfirm: "Подтвердите адрес точкой на карте.",
    latitude: "Не удалось определить широту.",
    longitude: "Не удалось определить долготу.",
    photosMin: "Загрузите минимум 4 фотографии.",
    photosMax: "Можно загрузить не более 10 фотографий.",
    title: "Укажите название объекта.",
    descRu: "Заполните описание на русском языке.",
    descUz: "Заполните описание на узбекском языке.",
    descEn: "Заполните описание на английском языке.",
    area: "Площадь должна быть целым числом больше нуля.",
    people: "Вместимость должна быть целым числом больше нуля.",
    amenities: "Удобства должны быть списком.",
    booking: "Выберите формат бронирования.",
    salePrice: "Укажите цену продажи больше нуля.",
    priceTooBig: "Цена превышает допустимое значение.",
    pricesNone: "Включите хотя бы один формат оплаты.",
    pricePositive: "Укажите цену больше нуля.",
    discounts: "Не удалось прочитать выбранные скидки.",
  },
  en: {
    category: "Choose the type of place.",
    subcategory: "Choose the format of the place.",
    address: "Enter the address of the place.",
    addressConfirm: "Confirm the address with a pin on the map.",
    latitude: "Could not detect the latitude.",
    longitude: "Could not detect the longitude.",
    photosMin: "Upload at least 4 photos.",
    photosMax: "You can upload at most 10 photos.",
    title: "Enter the title of the place.",
    descRu: "Fill in the description in Russian.",
    descUz: "Fill in the description in Uzbek.",
    descEn: "Fill in the description in English.",
    area: "Area must be a whole number above zero.",
    people: "Capacity must be a whole number above zero.",
    amenities: "Amenities must be a list.",
    booking: "Choose the booking format.",
    salePrice: "Enter a sale price above zero.",
    priceTooBig: "The price is above the allowed value.",
    pricesNone: "Turn on at least one payment format.",
    pricePositive: "Enter a price above zero.",
    discounts: "Could not read the selected discounts.",
  },
};

const FIELD_LABELS = {
  uz: {
    category: "Kategoriya", subcategory: "Format", location: "Manzil", latitude: "Kenglik", longitude: "Uzunlik",
    street: "Ko'cha va uy", images: "Rasmlar", title: "Nomi", description_ru: "Rus tilidagi tavsif",
    description_uz: "O'zbek tilidagi tavsif", description_en: "Ingliz tilidagi tavsif", area: "Maydon", people: "Sig'im",
    characteristics: "Xususiyatlar", amenities: "Qulayliklar", booking_type: "Bron formati", opens_at: "Ochilish vaqti",
    closes_at: "Yopilish vaqti", price: "Narx", prices: "Narxlar", price_hourly: "Soatlik narx", price_daily: "Kunlik narx",
    price_weekly: "Haftalik narx", price_monthly: "Oylik narx", sale_price: "Sotish narxi", discounts: "Chegirmalar",
    non_field_errors: "Obyekt ma'lumotlari", detail: "Joylashtirish",
  },
  ru: {
    category: "Категория", subcategory: "Подкатегория", location: "Адрес", latitude: "Широта", longitude: "Долгота",
    street: "Улица и дом", images: "Фотографии", title: "Название", description_ru: "Описание на русском",
    description_uz: "Описание на узбекском", description_en: "Описание на английском", area: "Площадь", people: "Вместимость",
    characteristics: "Характеристики", amenities: "Удобства", booking_type: "Формат бронирования", opens_at: "Время открытия",
    closes_at: "Время закрытия", price: "Цена", prices: "Цены", price_hourly: "Почасовая цена", price_daily: "Посуточная цена",
    price_weekly: "Недельная цена", price_monthly: "Месячная цена", sale_price: "Цена продажи", discounts: "Скидки",
    non_field_errors: "Данные объекта", detail: "Публикация",
  },
  en: {
    category: "Category", subcategory: "Format", location: "Address", latitude: "Latitude", longitude: "Longitude",
    street: "Street and building", images: "Photos", title: "Title", description_ru: "Description in Russian",
    description_uz: "Description in Uzbek", description_en: "Description in English", area: "Area", people: "Capacity",
    characteristics: "Details", amenities: "Amenities", booking_type: "Booking format", opens_at: "Opening time",
    closes_at: "Closing time", price: "Price", prices: "Prices", price_hourly: "Hourly price", price_daily: "Daily price",
    price_weekly: "Weekly price", price_monthly: "Monthly price", sale_price: "Sale price", discounts: "Discounts",
    non_field_errors: "Place data", detail: "Publishing",
  },
};

function error(field, message, step = FIELD_STEPS[field] || 12) {
  return { field, message, step };
}

export function parsePositiveNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = typeof value === "string"
    ? value.replace(/\s+/g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeOnboardingPrices(prices = {}, enabledPrices = {}) {
  return PRICE_DEFINITIONS.reduce((result, { key }) => {
    if (!enabledPrices[key]) return result;
    const value = parsePositiveNumber(prices[key]);
    if (value !== null) result[key] = value;
    return result;
  }, {});
}

export function validateOnboardingStep(step, data, lang = "uz") {
  const m = MESSAGES[lang] || MESSAGES.uz;
  const errors = [];
  const value = (input) => String(input ?? "").trim();

  if (step === 1 && !data.objectType) {
    errors.push(error("category", m.category));
  }

  if (step === 2 && !data.accessType) {
    errors.push(error("subcategory", m.subcategory));
  }

  if (step === 3) {
    if (!value(data.address)) errors.push(error("location", m.address));
    if (!data.addressConfirmed) errors.push(error("location", m.addressConfirm));
    if (!Number.isFinite(Number(data.lat))) errors.push(error("latitude", m.latitude));
    if (!Number.isFinite(Number(data.lng))) errors.push(error("longitude", m.longitude));
  }

  if (step === 5) {
    const count = Array.isArray(data.photos) ? data.photos.length : 0;
    if (count < 4) errors.push(error("images", m.photosMin));
    if (count > 10) errors.push(error("images", m.photosMax));
  }

  if (step === 6 && !value(data.spaceTitle)) {
    errors.push(error("title", m.title));
  }

  if (step === 7) {
    if (!value(data.descRu)) errors.push(error("description_ru", m.descRu));
    if (!value(data.descUz)) errors.push(error("description_uz", m.descUz));
    if (!value(data.descEn)) errors.push(error("description_en", m.descEn));
  }

  if (step === 8) {
    if (!Number.isInteger(Number(data.area)) || Number(data.area) <= 0) {
      errors.push(error("area", m.area));
    }
    if (!Number.isInteger(Number(data.capacity)) || Number(data.capacity) <= 0) {
      errors.push(error("people", m.people));
    }
  }

  if (step === 9 && !Array.isArray(data.amenities)) {
    errors.push(error("amenities", m.amenities));
  }

  if (step === 10 && !data.isSale && !["instant", "request"].includes(data.bookingType)) {
    errors.push(error("booking_type", m.booking));
  }

  if (step === 11 && data.isSale) {
    const amount = parsePositiveNumber(data.salePrice);
    if (amount === null) {
      errors.push(error("sale_price", m.salePrice));
    } else if (amount >= 1e14) {
      errors.push(error("sale_price", m.priceTooBig));
    }
  } else if (step === 11) {
    const enabled = PRICE_DEFINITIONS.filter(({ key }) => data.enabledPrices?.[key]);
    if (enabled.length === 0) {
      errors.push(error("prices", m.pricesNone));
    }
    enabled.forEach(({ key, field }) => {
      const amount = parsePositiveNumber(data.prices?.[key]);
      if (amount === null) {
        errors.push(error(field, m.pricePositive));
      } else if (amount > 9999999999.99) {
        errors.push(error(field, m.priceTooBig));
      }
    });
  }

  if (step === 12 && !data.isSale && !Array.isArray(data.selectedDiscountIds)) {
    errors.push(error("discounts", m.discounts));
  }

  return errors;
}

export function validateOnboarding(data, lang = "uz") {
  return Array.from({ length: 12 }, (_, index) => index + 1)
    .flatMap((step) => validateOnboardingStep(step, data, lang));
}

export function buildPlacePayload(data, uploadedImageUrls) {
  const normalizedPrices = normalizeOnboardingPrices(data.prices, data.enabledPrices);
  const primaryPrice = normalizedPrices.kunlik
    ?? normalizedPrices.soatlik
    ?? normalizedPrices.haftalik
    ?? normalizedPrices.oylik;
  const characteristics = { ...data.customCounters, ...data.customSelects };

  Object.keys(characteristics).forEach((key) => {
    const current = characteristics[key];
    if (current === "" || current === null || current === undefined) {
      delete characteristics[key];
    } else if (Object.prototype.hasOwnProperty.call(data.customCounters || {}, key)) {
      characteristics[key] = Number(current);
    }
  });

  const numericPrices = Object.fromEntries(
    PRICE_DEFINITIONS.map(({ key, field }) => [field, normalizedPrices[key] ?? null]),
  );
  // A sale listing sends only its sale price; the server ignores the rest.
  const sale = data.isSale
    ? { sale_price: parsePositiveNumber(data.salePrice), price_hourly: null, price_daily: null, price_weekly: null, price_monthly: null, prices: {}, discounts: [] }
    : { sale_price: null };
  sale.deal_type = data.isSale ? "sale" : "rent";

  return {
    title: String(data.spaceTitle).trim(),
    description_uz: String(data.descUz).trim(),
    description_ru: String(data.descRu).trim(),
    description_en: String(data.descEn).trim(),
    subcategory: Number(data.accessType),
    location: String(data.address).trim(),
    latitude: Number(data.lat).toFixed(7),
    longitude: Number(data.lng).toFixed(7),
    people: Number(data.capacity),
    area: Number(data.area),
    price: `${primaryPrice} UZS`,
    prices: normalizedPrices,
    ...numericPrices,
    currency: "UZS",
    discounts: [...new Set((data.selectedDiscountIds || []).map(Number).filter(Number.isInteger))],
    booking_type: data.bookingType,
    opens_at: data.opensAt || "09:00",
    closes_at: data.closesAt || "18:00",
    amenities: [...new Set((data.amenities || []).filter((item) => typeof item === "string"))],
    characteristics,
    images: (uploadedImageUrls || []).filter((url) => typeof url === "string" && url.trim()),
    ...sale,
  };
}

function flattenApiErrors(value, labels, field = "__root__", result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenApiErrors(item, labels, field, result));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      const nestedField = field === "__root__" ? key : `${field}.${key}`;
      flattenApiErrors(item, labels, nestedField, result);
    });
  } else if (value !== null && value !== undefined) {
    const rootField = field === "__root__" ? "non_field_errors" : field.split(".")[0];
    const label = labels[rootField] || rootField;
    result.push(error(rootField, `${label}: ${String(value)}`, FIELD_STEPS[rootField] || 12));
  }
  return result;
}

export function mapPlaceApiErrors(responseData, lang = "uz") {
  return flattenApiErrors(responseData, FIELD_LABELS[lang] || FIELD_LABELS.uz);
}

export function groupOnboardingErrors(errors) {
  return errors.reduce((groups, item) => {
    groups[item.step] = [...(groups[item.step] || []), item.message];
    return groups;
  }, {});
}
