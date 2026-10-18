// Données partagées entre le calendrier public et l'administration.
// Les dates par défaut restent visibles tant qu'aucun calendrier n'a été enregistré.
export const COURSE_STORAGE_BUCKET = "article-images";
export const COURSE_STORAGE_PATH = "site/course-dates.json";
export const DEFAULT_COURSE_DATES = Object.freeze([
  "2026-11-25",
  "2026-12-02",
  "2026-12-09",
  "2026-12-16",
  "2027-01-06",
  "2027-01-13"
]);

export function isValidCourseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2025 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseCourseDates(payload) {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.dates)) return null;
  const dates = payload.dates;
  if (dates.length < 1 || dates.length > 20 || dates.some(date => !isValidCourseDate(date))) return null;
  if (new Set(dates).size !== dates.length) return null;
  return [...dates].sort();
}

export function courseDateParts(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return {
    day: String(day).padStart(2, "0"),
    month: new Intl.DateTimeFormat("fr-BE", { month: "long" }).format(date),
    year: String(year),
    weekday: new Intl.DateTimeFormat("fr-BE", { weekday: "long" }).format(date)
  };
}

export function commonCourseWeekday(dates) {
  const weekdays = dates.map(date => courseDateParts(date).weekday);
  return weekdays.length && weekdays.every(day => day === weekdays[0]) ? weekdays[0] : null;
}
