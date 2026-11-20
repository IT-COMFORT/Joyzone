// Dates in the site's languages. Browsers ship no Uzbek month names (they print
// "2026 M11"), so Uzbek is formatted by hand and the other languages by Intl.

const INTL_LOCALES = { ru: "ru-RU", en: "en-GB" };
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
const UZ_WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];

function intl(date, lang, options) {
  return new Intl.DateTimeFormat(INTL_LOCALES[lang] || INTL_LOCALES.ru, options).format(date);
}

function clock(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "noyabr 2026" */
export function formatMonthYear(date, lang) {
  if (lang !== "uz") return intl(date, lang, { month: "long", year: "numeric" });
  return `${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "6-noyabr" */
export function formatDayMonth(date, lang) {
  if (lang !== "uz") return intl(date, lang, { day: "numeric", month: "long" });
  return `${date.getDate()}-${UZ_MONTHS[date.getMonth()]}`;
}

/** "6-noy" */
export function formatDayMonthShort(date, lang) {
  if (lang !== "uz") return intl(date, lang, { day: "numeric", month: "short" });
  return `${date.getDate()}-${UZ_MONTHS_SHORT[date.getMonth()]}`;
}

/** "juma, 6-noyabr" */
export function formatWeekdayDayMonth(date, lang) {
  if (lang !== "uz") return intl(date, lang, { weekday: "long", day: "numeric", month: "long" });
  return `${UZ_WEEKDAYS[date.getDay()]}, ${formatDayMonth(date, lang)}`;
}

/** "6-noyabr 2026" */
export function formatFullDate(date, lang) {
  if (lang !== "uz") return intl(date, lang, { day: "numeric", month: "long", year: "numeric" });
  return `${formatDayMonth(date, lang)} ${date.getFullYear()}`;
}

/** "6-noy, 14:30" */
export function formatDayTime(date, lang) {
  return `${formatDayMonthShort(date, lang)}, ${clock(date)}`;
}
