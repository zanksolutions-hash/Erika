import { supabase } from "./supabase-client.js";
import {
  COURSE_STORAGE_BUCKET,
  COURSE_STORAGE_PATH,
  parseCourseDates,
  courseDateParts,
  commonCourseWeekday
} from "./course-dates-config.js";

const calendar = document.getElementById("courseDatesList");

function renderCourseDates(dates) {
  if (!calendar) return;

  const fragment = document.createDocumentFragment();
  dates.forEach(iso => {
    const parts = courseDateParts(iso);
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = iso;
    time.className = "autism-course-date-inner";
    time.setAttribute("aria-label", `${parts.day} ${parts.month} ${parts.year}`);

    for (const [className, value] of [
      ["autism-course-date-day", parts.day],
      ["autism-course-date-month", parts.month],
      ["autism-course-date-year", parts.year]
    ]) {
      const span = document.createElement("span");
      span.className = className;
      span.textContent = value;
      time.appendChild(span);
    }
    li.appendChild(time);
    fragment.appendChild(li);
  });

  calendar.replaceChildren(fragment);

  const title = document.getElementById("autism-course-calendar-title");
  if (title) title.textContent = dates.length === 1 ? "La date prévue" : `Les ${dates.length} dates prévues`;

  const weekday = commonCourseWeekday(dates);
  const dayLabel = document.getElementById("courseWeekdayLabel");
  const timeLabel = document.getElementById("courseCalendarTime");
  if (dayLabel) dayLabel.textContent = weekday ? `${weekday[0].toUpperCase() + weekday.slice(1)} après-midi` : "Séances en après-midi";
  if (timeLabel) timeLabel.textContent = weekday ? `Le ${weekday}, de 14 h à 16 h` : "Séances de 14 h à 16 h";
}

async function loadPublicCourseDates() {
  if (!calendar) return;
  try {
    const { data } = supabase.storage.from(COURSE_STORAGE_BUCKET).getPublicUrl(COURSE_STORAGE_PATH);
    const url = new URL(data.publicUrl);
    // L'adresse unique évite de montrer un ancien calendrier après une modification.
    url.searchParams.set("v", String(Date.now()));
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return; // Conserver les dates initiales affichées dans le HTML.
    const dates = parseCourseDates(await response.json());
    if (dates) renderCourseDates(dates);
  } catch (error) {
    console.warn("Calendrier des cours collectifs indisponible, affichage des dates initiales.", error);
  }
}

loadPublicCourseDates();
