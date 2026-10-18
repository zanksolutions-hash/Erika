// Calendrier partagé par l'administration et la page publique.
// Le format v2 permet de personnaliser les heures de chaque séance.
// Les anciens calendriers v1 (dates uniquement) restent compatibles.
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
export const DEFAULT_COURSE_START = "14:00";
export const DEFAULT_COURSE_END = "16:00";
export const DEFAULT_COURSE_SESSIONS = Object.freeze(
  DEFAULT_COURSE_DATES.map(date => Object.freeze({
    date, start_time: DEFAULT_COURSE_START, end_time: DEFAULT_COURSE_END
  }))
);

export function isValidCourseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2025 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isValidCourseTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseCourseDates(payload) {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.dates)) return null;
  const dates = payload.dates;
  if (dates.length < 1 || dates.length > 20 || dates.some(date => !isValidCourseDate(date))) return null;
  if (new Set(dates).size !== dates.length) return null;
  return [...dates].sort();
}

export function parseCourseSchedule(payload) {
  if (!payload) return null;
  if (payload.version === 1) {
    const dates = parseCourseDates(payload);
    return dates ? dates.map(date => ({
      date, start_time: DEFAULT_COURSE_START, end_time: DEFAULT_COURSE_END
    })) : null;
  }
  if (payload.version !== 2 || !Array.isArray(payload.sessions)) return null;
  const sessions = payload.sessions;
  if (sessions.length < 1 || sessions.length > 20) return null;
  if (sessions.some(item =>
    !item || !isValidCourseDate(item.date) ||
    !isValidCourseTime(item.start_time) || !isValidCourseTime(item.end_time) ||
    item.start_time >= item.end_time
  )) return null;
  if (new Set(sessions.map(item => item.date)).size !== sessions.length) return null;
  return sessions.map(({date, start_time, end_time}) => ({date, start_time, end_time}))
    .sort((a, b) => a.date.localeCompare(b.date));
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

export function courseTimeLabel(value) {
  if (!isValidCourseTime(value)) return "";
  const [hours, minutes] = value.split(":").map(Number);
  return minutes ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} h`;
}

export function courseTimeRange(start, end) {
  return `${courseTimeLabel(start)} – ${courseTimeLabel(end)}`;
}

export function commonCourseWeekday(sessionsOrDates) {
  const weekdays = sessionsOrDates.map(item => courseDateParts(
    typeof item === "string" ? item : item.date
  ).weekday);
  return weekdays.length && weekdays.every(day => day === weekdays[0]) ? weekdays[0] : null;
}
