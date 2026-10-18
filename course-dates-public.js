import { supabase } from "./supabase-client.js";
import {
  COURSE_STORAGE_BUCKET,
  COURSE_STORAGE_PATH,
  parseCourseSchedule,
  courseDateParts,
  courseTimeRange,
  commonCourseWeekday
} from "./course-dates-config.js?v=20261018-sessions2";

const calendar = document.getElementById("courseDatesList");

function renderCourseDates(sessions) {
  if (!calendar) return;

  const fragment = document.createDocumentFragment();
  sessions.forEach(session => {
    const parts = courseDateParts(session.date);
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = session.date;
    time.className = "autism-course-date-inner";
    const hours = courseTimeRange(session.start_time, session.end_time);
    time.setAttribute("aria-label", `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}, ${hours}`);

    for (const [className, value] of [
      ["autism-course-date-weekday", parts.weekday],
      ["autism-course-date-day", parts.day],
      ["autism-course-date-month", parts.month],
      ["autism-course-date-year", parts.year],
      ["autism-course-date-hours", hours]
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
  if (title) title.textContent = sessions.length === 1
    ? "La date prévue"
    : `Les ${sessions.length} dates prévues`;

  const weekday = commonCourseWeekday(sessions);
  const sameHours = sessions.every(item =>
    item.start_time === sessions[0].start_time && item.end_time === sessions[0].end_time
  );
  const range = sameHours
    ? courseTimeRange(sessions[0].start_time, sessions[0].end_time)
    : null;
  const startHour = Number(sessions[0].start_time.slice(0, 2));
  const period = startHour < 12 ? "matin" : startHour < 18 ? "après-midi" : "soir";

  const dayLabel = document.getElementById("courseWeekdayLabel");
  const timeLabel = document.getElementById("courseCalendarTime");
  const headlineHours = document.getElementById("courseHeadlineHours");

  if (dayLabel) dayLabel.textContent = weekday && sameHours
    ? `${weekday[0].toUpperCase() + weekday.slice(1)} ${period}`
    : weekday ? `Séances le ${weekday}` : "Jours selon les séances";

  if (headlineHours) headlineHours.textContent = range || "Horaires selon les séances";

  if (timeLabel) {
    if (weekday && range) timeLabel.textContent = `Le ${weekday}, de ${range.replace(" – ", " à ")}`;
    else if (weekday) timeLabel.textContent = `Le ${weekday}, horaires selon les séances`;
    else if (range) timeLabel.textContent = `Selon les dates, de ${range.replace(" – ", " à ")}`;
    else timeLabel.textContent = "Jours et horaires selon les séances";
  }
}

async function loadPublicCourseDates() {
  if (!calendar) return;
  try {
    const { data } = supabase.storage.from(COURSE_STORAGE_BUCKET).getPublicUrl(COURSE_STORAGE_PATH);
    const url = new URL(data.publicUrl);
    // Ne pas conserver une ancienne version du calendrier en cache.
    url.searchParams.set("v", String(Date.now()));
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return; // Conserver les dates et horaires initiaux du HTML.
    const sessions = parseCourseSchedule(await response.json());
    if (sessions) renderCourseDates(sessions);
  } catch (error) {
    console.warn("Calendrier des cours collectifs indisponible, affichage des séances initiales.", error);
  }
}

loadPublicCourseDates();
