import {
  COURSE_STORAGE_BUCKET,
  COURSE_STORAGE_PATH,
  DEFAULT_COURSE_SESSIONS,
  DEFAULT_COURSE_START,
  DEFAULT_COURSE_END,
  isValidCourseDate,
  isValidCourseTime,
  parseCourseSchedule,
  courseDateParts
} from "./course-dates-config.js?v=20261018-sessions2";

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
  const bulkStart = document.getElementById("courseBulkStartTime");
  const bulkEnd = document.getElementById("courseBulkEndTime");
  const applyHours = document.getElementById("courseApplyHours");
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

  function addRow(session = {}) {
    const row = document.createElement("div");
    row.className = "admin-course-row";

    const dateLabel = document.createElement("label");
    dateLabel.className = "admin-course-date-field";
    const dateText = document.createElement("span");
    dateText.className = "admin-course-label";
    dateText.textContent = "Date de la séance";
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "admin-course-date-input";
    dateInput.min = "2025-01-01";
    dateInput.max = "2100-12-31";
    dateInput.required = true;
    dateInput.value = session.date || "";
    const weekday = document.createElement("span");
    weekday.className = "admin-course-weekday";
    const updateWeekday = () => {
      weekday.textContent = isValidCourseDate(dateInput.value)
        ? courseDateParts(dateInput.value).weekday.replace(/^./, letter => letter.toUpperCase())
        : "Choisissez une date pour définir le jour";
    };
    dateInput.addEventListener("input", () => { dirty = true; updateWeekday(); });
    dateLabel.append(dateText, dateInput, weekday);
    updateWeekday();

    function timeField(text, className, value) {
      const label = document.createElement("label");
      const caption = document.createElement("span");
      caption.textContent = text;
      const input = document.createElement("input");
      input.type = "time";
      input.className = className;
      input.required = true;
      input.step = "300";
      input.value = value;
      input.addEventListener("input", () => { dirty = true; });
      label.append(caption, input);
      return label;
    }
    const startLabel = timeField("Début", "admin-course-start-input", session.start_time || DEFAULT_COURSE_START);
    const endLabel = timeField("Fin", "admin-course-end-input", session.end_time || DEFAULT_COURSE_END);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-course-remove";
    remove.textContent = "Retirer";
    remove.setAttribute("aria-label", "Retirer cette séance");
    remove.addEventListener("click", () => {
      if (rows.children.length <= 1) return;
      row.remove();
      dirty = true;
      renumberRows();
    });
    row.append(dateLabel, startLabel, endLabel, remove);
    rows.appendChild(row);
    renumberRows();
    return dateInput;
  }

  function renderRows(sessions) {
    rows.replaceChildren();
    sessions.forEach(session => addRow(session));
    dirty = false;
  }

  async function readSavedDates() {
    const storage = supabase.storage.from(COURSE_STORAGE_BUCKET);
    const { data: publicData } = storage.getPublicUrl(COURSE_STORAGE_PATH);
    if (!publicData?.publicUrl) {
      throw new Error("Impossible d'obtenir l'adresse du calendrier dans Supabase Storage.");
    }

    const url = new URL(publicData.publicUrl);
    url.searchParams.set("v", String(Date.now()));
    let response;
    try {
      response = await fetch(url.toString(), { cache: "no-store" });
    } catch {
      throw new Error("Connexion à Supabase impossible. Vérifiez votre connexion et réessayez.");
    }

    if (response.ok) {
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error("Le calendrier Supabase contient un fichier JSON illisible.");
      }
      const sessions = parseCourseSchedule(payload);
      if (!sessions) throw new Error("Le calendrier enregistré dans Supabase est invalide.");
      return { sessions, initial: false };
    }

    // Supabase Storage peut renvoyer HTTP 400 (« Object not found »)
    // ou 404 pour un fichier absent. Vérifier le dossier dans Storage
    // plutôt que de considérer toute erreur 400 comme une absence.
    if (response.status === 400 || response.status === 404) {
      const { data: objects, error: listError } = await storage.list("site", {
        limit: 100,
        search: "course-dates.json"
      });
      if (listError) {
        throw new Error(
          "Impossible de vérifier le calendrier dans Supabase Storage : " +
          listError.message + ". Vérifiez le bucket public « article-images » et ses permissions."
        );
      }
      if (!Array.isArray(objects)) {
        throw new Error("Supabase n'a pas renvoyé la liste des fichiers du calendrier.");
      }
      if (!objects.some(object => object.name === "course-dates.json")) {
        return { sessions: DEFAULT_COURSE_SESSIONS.map(item => ({ ...item })), initial: true };
      }
      // Le fichier existe, mais le lien public ne fonctionne pas :
      // ne pas remplacer silencieusement les dates déjà enregistrées.
      throw new Error(
        "Le calendrier existe dans Supabase, mais sa lecture publique est bloquée. " +
        "Vérifiez que le bucket « article-images » est public."
      );
    }

    throw new Error(
      "Lecture du calendrier impossible (HTTP " + response.status +
      "). Vérifiez les permissions du stockage Supabase."
    );
  }

  async function loadDates() {
    setMessage("Chargement des dates…");
    saveButton.disabled = true;
    addButton.disabled = true;
    reloadButton.disabled = true;
    try {
      const { sessions, initial } = await readSavedDates();
      renderRows(sessions);
      loaded = true;
      setMessage(initial
        ? "Séances initiales chargées : modifiez les dates, les jours ou les heures puis enregistrez."
        : "Calendrier chargé depuis Supabase : vous pouvez modifier les dates et les horaires.");
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
    const last = rows.lastElementChild;
    const input = addRow({
      start_time: last?.querySelector(".admin-course-start-input")?.value || DEFAULT_COURSE_START,
      end_time: last?.querySelector(".admin-course-end-input")?.value || DEFAULT_COURSE_END
    });
    dirty = true;
    input.focus();
  });

  reloadButton.addEventListener("click", () => {
    if (dirty && !confirm("Abandonner les dates non enregistrées ?")) return;
    loadDates();
  });

  applyHours?.addEventListener("click", () => {
    if (!loaded) return;
    if (!isValidCourseTime(bulkStart.value) || !isValidCourseTime(bulkEnd.value) ||
        bulkStart.value >= bulkEnd.value) {
      setMessage("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }
    rows.querySelectorAll(".admin-course-row").forEach(row => {
      row.querySelector(".admin-course-start-input").value = bulkStart.value;
      row.querySelector(".admin-course-end-input").value = bulkEnd.value;
    });
    dirty = true;
    setMessage("Horaire appliqué à toutes les séances. Cliquez sur « Enregistrer » pour publier.");
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loaded || !form.reportValidity()) return;
    const sessions = [...rows.querySelectorAll(".admin-course-row")].map(row => ({
      date: row.querySelector(".admin-course-date-input").value,
      start_time: row.querySelector(".admin-course-start-input").value,
      end_time: row.querySelector(".admin-course-end-input").value
    }));
    if (sessions.length < 1 || sessions.length > 20 ||
        sessions.some(item => !isValidCourseDate(item.date) ||
          !isValidCourseTime(item.start_time) || !isValidCourseTime(item.end_time))) {
      setMessage("Renseignez entre 1 et 20 séances avec une date et des heures valides.");
      return;
    }
    if (new Set(sessions.map(item => item.date)).size !== sessions.length) {
      setMessage("Une même date apparaît plusieurs fois. Corrigez les doublons.");
      return;
    }
    if (sessions.some(item => item.start_time >= item.end_time)) {
      setMessage("Pour chaque séance, l'heure de fin doit être après l'heure de début.");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setMessage("Session expirée. Reconnectez-vous pour enregistrer.");
      return;
    }

    const sorted = parseCourseSchedule({ version: 2, sessions });
    if (!sorted) {
      setMessage("Le calendrier contient une erreur. Vérifiez les dates et les heures.");
      return;
    }
    const payload = JSON.stringify({
      version: 2,
      sessions: sorted,
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
      setMessage("Dates, jours et horaires enregistrés ! Ils apparaîtront sur la page Cours collectifs après actualisation.");
    } catch (error) {
      setMessage(`Enregistrement impossible : ${error.message}. Le calendrier public n'a pas été modifié.`);
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
