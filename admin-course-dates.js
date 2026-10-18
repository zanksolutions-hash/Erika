import {
  COURSE_STORAGE_BUCKET,
  COURSE_STORAGE_PATH,
  DEFAULT_COURSE_DATES,
  isValidCourseDate,
  parseCourseDates
} from "./course-dates-config.js";

// Onglet indépendant : ne modifie pas le fonctionnement de l'éditeur d'articles.
export function setupCourseDateAdmin(supabase) {
  const articlesTab = document.getElementById("articlesTab");
  const coursesTab = document.getElementById("coursesTab");
  const articlesPanel = document.getElementById("articlesPanel");
  const coursesPanel = document.getElementById("coursesPanel");
  const form = document.getElementById("courseDatesForm");
  const rows = document.getElementById("courseDatesRows");
  const addButton = document.getElementById("courseAddDate");
  const reloadButton = document.getElementById("courseReloadDates");
  const saveButton = document.getElementById("courseSaveDates");
  const message = document.getElementById("courseDatesMessage");
  if (!articlesTab || !coursesTab || !form || !rows) {
    return { onLogout() {} };
  }

  let loaded = false;
  let dirty = false;

  function setMessage(text) {
    message.textContent = text;
  }

  function setTab(tab) {
    const coursesActive = tab === "courses";
    articlesTab.setAttribute("aria-selected", String(!coursesActive));
    coursesTab.setAttribute("aria-selected", String(coursesActive));
    articlesTab.tabIndex = coursesActive ? -1 : 0;
    coursesTab.tabIndex = coursesActive ? 0 : -1;
    articlesPanel.hidden = coursesActive;
    coursesPanel.hidden = !coursesActive;
    if (coursesActive && !loaded) loadDates();
  }

  articlesTab.addEventListener("click", () => setTab("articles"));
  coursesTab.addEventListener("click", () => setTab("courses"));
  [articlesTab, coursesTab].forEach((tab, index, tabs) => {
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0
        : event.key === "End" ? tabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      const next = tabs[nextIndex];
      next.focus();
      setTab(next === coursesTab ? "courses" : "articles");
    });
  });

  function refreshRemoveButtons() {
    const buttons = rows.querySelectorAll(".admin-course-remove");
    buttons.forEach(button => {
      button.disabled = buttons.length <= 1;
    });
    addButton.disabled = rows.children.length >= 20;
  }

  function renumberRows() {
    rows.querySelectorAll(".admin-course-row").forEach((row, index) => {
      const label = row.querySelector(".admin-course-label");
      if (label) label.textContent = `Date ${index + 1}`;
    });
    refreshRemoveButtons();
  }

  function addRow(value = "") {
    const row = document.createElement("div");
    row.className = "admin-course-row";
    const label = document.createElement("label");
    const labelText = document.createElement("span");
    labelText.className = "admin-course-label";
    labelText.textContent = "Date";
    const input = document.createElement("input");
    input.type = "date";
    input.className = "admin-course-date-input";
    input.min = "2025-01-01";
    input.max = "2100-12-31";
    input.required = true;
    input.value = value;
    input.addEventListener("input", () => { dirty = true; });
    label.append(labelText, input);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-course-remove";
    remove.textContent = "Retirer";
    remove.setAttribute("aria-label", "Retirer cette date");
    remove.addEventListener("click", () => {
      if (rows.children.length <= 1) return;
      row.remove();
      dirty = true;
      renumberRows();
    });
    row.append(label, remove);
    rows.appendChild(row);
    renumberRows();
    return input;
  }

  function renderRows(dates) {
    rows.replaceChildren();
    dates.forEach(date => addRow(date));
    dirty = false;
  }

  async function readSavedDates() {
    const { data } = supabase.storage.from(COURSE_STORAGE_BUCKET).getPublicUrl(COURSE_STORAGE_PATH);
    const url = new URL(data.publicUrl);
    url.searchParams.set("v", String(Date.now()));
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (response.status === 404) return { dates: [...DEFAULT_COURSE_DATES], initial: true };
    if (!response.ok) throw new Error(`Lecture impossible (HTTP ${response.status}).`);
    const dates = parseCourseDates(await response.json());
    if (!dates) throw new Error("Les dates enregistrées ne sont pas valides.");
    return { dates, initial: false };
  }

  async function loadDates() {
    setMessage("Chargement des dates…");
    saveButton.disabled = true;
    addButton.disabled = true;
    reloadButton.disabled = true;
    try {
      const { dates, initial } = await readSavedDates();
      renderRows(dates);
      loaded = true;
      setMessage(initial
        ? "Dates actuellement affichées sur le site. Vous pouvez les modifier et enregistrer."
        : "Calendrier enregistré chargé. Vous pouvez modifier les dates.");
      saveButton.disabled = false;
    } catch (error) {
      loaded = false;
      setMessage(`Impossible de charger le calendrier : ${error.message}. Réessayez avant d'enregistrer.`);
    } finally {
      reloadButton.disabled = false;
      if (loaded) refreshRemoveButtons();
    }
  }

  addButton.addEventListener("click", () => {
    if (!loaded || rows.children.length >= 20) return;
    const input = addRow();
    dirty = true;
    input.focus();
  });

  reloadButton.addEventListener("click", () => {
    if (dirty && !confirm("Abandonner les dates non enregistrées ?")) return;
    loadDates();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loaded || !form.reportValidity()) return;
    const dates = [...rows.querySelectorAll(".admin-course-date-input")].map(input => input.value);
    if (dates.length < 1 || dates.length > 20 || dates.some(date => !isValidCourseDate(date))) {
      setMessage("Saisissez entre 1 et 20 dates valides.");
      return;
    }
    if (new Set(dates).size !== dates.length) {
      setMessage("Une même date apparaît plusieurs fois. Corrigez les doublons.");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setMessage("Session expirée. Reconnectez-vous pour enregistrer.");
      return;
    }

    const sorted = dates.sort();
    const payload = JSON.stringify({
      version: 1,
      dates: sorted,
      updated_at: new Date().toISOString()
    });
    const blob = new Blob([payload], { type: "application/json" });
    saveButton.disabled = true;
    setMessage("Enregistrement des dates…");
    try {
      const { error } = await supabase.storage
        .from(COURSE_STORAGE_BUCKET)
        .upload(COURSE_STORAGE_PATH, blob, {
          upsert: true,
          contentType: "application/json",
          cacheControl: "60"
        });
      if (error) throw error;
      renderRows(sorted);
      setMessage("Dates enregistrées ! Elles seront visibles sur la page Cours collectifs après actualisation.");
    } catch (error) {
      setMessage(`Enregistrement impossible : ${error.message}. Les dates publiques n'ont pas été modifiées.`);
    } finally {
      saveButton.disabled = false;
    }
  });

  return {
    onLogout() {
      loaded = false;
      dirty = false;
      rows.replaceChildren();
      setMessage("");
      setTab("articles");
    }
  };
}
