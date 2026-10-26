import { supabase, ARTICLE_IMAGES_BUCKET } from "./supabase-client.js";
import {
  COURSE_STORAGE_BUCKET,
  COURSE_STORAGE_PATH,
  DEFAULT_COURSE_SESSIONS,
  parseCourseSchedule
} from "./course-dates-config.js";

const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const formatDate = iso => iso ? new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00`)) : "";
const today = () => new Date().toISOString().slice(0, 10);

let toastTimer;
function toast(text, isError = false) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), isError ? 6000 : 3500);
}

/* ---------- Connexion ---------- */

$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  $("#login-msg").textContent = "Connexion…";
  const { error } = await supabase.auth.signInWithPassword({
    email: $("#login-email").value.trim(),
    password: $("#login-password").value
  });
  $("#login-msg").textContent = error ? "E-mail ou mot de passe incorrect." : "";
});

$("#forgot").addEventListener("click", async () => {
  const email = $("#login-email").value.trim();
  if (!email) { $("#login-msg").textContent = "Indiquez d'abord votre e-mail."; return; }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] });
  $("#login-msg").textContent = error ? `Envoi impossible : ${error.message}` : "Un e-mail de réinitialisation vient d'être envoyé.";
});

$("#logout").addEventListener("click", () => supabase.auth.signOut());

let started = false;
function showSession(session) {
  $("#login-view").hidden = !!session;
  $("#app-view").hidden = !session;
  if (session && !started) {
    started = true;
    Promise.all([loadArticles(), loadCourses()]).then(updateDashboard);
  }
  if (!session) started = false;
}

/* ---------- Navigation ---------- */

function show(panel) {
  document.querySelectorAll("[data-panel]").forEach(p => { p.hidden = p.dataset.panel !== panel; });
  const tab = panel === "editor" ? "articles" : panel;
  document.querySelectorAll(".tab").forEach(t => t.toggleAttribute("aria-current", t.dataset.tab === tab));
  if (panel === "dashboard") updateDashboard();
  window.scrollTo({ top: 0 });
}

document.addEventListener("click", event => {
  const target = event.target.closest("[data-tab], [data-go]");
  if (!target) return;
  const dest = target.dataset.tab || target.dataset.go;
  if (dest === "new-article") { openEditor(); return; }
  if (dest === "articles" && editorDirty && !confirm("Quitter sans enregistrer les modifications ?")) return;
  if (dest === "articles") editorDirty = false;
  show(dest);
});

/* ---------- Articles ---------- */

let articles = [];
let statusFilter = "all";

async function loadArticles() {
  const { data, error } = await supabase.from("articles").select("*").order("publication_date", { ascending: false });
  if (error) { toast(`Chargement des articles impossible : ${error.message}`, true); return; }
  articles = data || [];
  renderArticleList();
  $("#category-list").innerHTML = [...new Set(articles.map(a => a.category).filter(Boolean))]
    .map(c => `<option value="${escapeHTML(c)}">`).join("");
}

function renderArticleList() {
  const query = $("#article-search").value.trim().toLowerCase();
  const items = articles.filter(a =>
    (statusFilter === "all" || a.status === statusFilter) &&
    (!query || `${a.title} ${a.category}`.toLowerCase().includes(query)));
  $("#article-list").innerHTML = items.length ? items.map(a => `
    <li>
      <button class="row-main" data-edit="${a.id}">
        <span class="row-thumb">${a.image_url ? `<img src="${escapeHTML(a.image_url)}" alt="" loading="lazy">` : ""}</span>
        <span><b>${escapeHTML(a.title)}</b><small>${escapeHTML([formatDate(a.publication_date), a.category].filter(Boolean).join(" · "))}</small></span>
      </button>
      <span class="pill ${a.status}">${a.status === "draft" ? "Brouillon" : "Publié"}</span>
      ${a.status === "published" ? `<a class="link" href="article-dynamique.html?id=${encodeURIComponent(a.id)}" target="_blank" rel="noopener">Voir ↗</a>` : ""}
    </li>`).join("") : `<li class="empty">${articles.length ? "Aucun article ne correspond." : "Aucun article pour l'instant. Écrivez le premier !"}</li>`;
}

$("#article-search").addEventListener("input", renderArticleList);
document.querySelectorAll(".seg button").forEach(button => button.addEventListener("click", () => {
  statusFilter = button.dataset.status;
  document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
  renderArticleList();
}));
$("#article-list").addEventListener("click", event => {
  const button = event.target.closest("[data-edit]");
  if (button) openEditor(articles.find(a => a.id === button.dataset.edit));
});

/* ---------- Éditeur ---------- */

const fields = {
  id: $("#article-id"), title: $("#title"), category: $("#category"), date: $("#date"),
  excerpt: $("#excerpt"), body: $("#body"), imageAlt: $("#image-alt"),
  sourceLabel: $("#source-label"), sourceUrl: $("#source-url")
};
let pendingImage = null;      // nouveau fichier choisi
let removeCurrentImage = false;
let editorDirty = false;

function currentArticle() { return articles.find(a => a.id === fields.id.value); }

function openEditor(article = null) {
  fields.id.value = article?.id || "";
  fields.title.value = article?.title || "";
  fields.category.value = article?.category || "";
  fields.date.value = article?.publication_date || today();
  fields.excerpt.value = article?.excerpt || "";
  fields.body.value = article?.body || "";
  fields.imageAlt.value = article?.image_alt || "";
  fields.sourceLabel.value = article?.source_label || "";
  fields.sourceUrl.value = article?.source_url || "";
  pendingImage = null;
  removeCurrentImage = false;
  setImagePreview(article?.image_url || "");
  $("#editor-title").textContent = article ? "Modifier l'article" : "Nouvel article";
  $("#publish").textContent = article?.status === "published" ? "Mettre à jour" : "Publier";
  $("#delete-article").hidden = !article;
  editorDirty = false;
  updatePreview();
  show("editor");
  fields.title.focus();
}

function setImagePreview(url) {
  $("#image-preview").hidden = !url;
  $("#image-preview").src = url || "";
  $("#pv-img").hidden = !url;
  $("#pv-img").src = url || "";
  $("#drop-text").hidden = !!url;
  $("#image-remove").hidden = !url;
}

function readingMinutes() {
  const words = fields.body.value.trim().split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.round(words / 200)) : 0;
}

function updatePreview() {
  const minutes = readingMinutes();
  $("#reading-time").textContent = `Temps de lecture estimé : ${minutes ? `${minutes} min` : "–"}`;
  $("#pv-title").textContent = fields.title.value || "Titre de l'article";
  $("#pv-excerpt").textContent = fields.excerpt.value || "Le résumé apparaîtra ici.";
  $("#pv-meta").textContent = [formatDate(fields.date.value), fields.category.value, minutes ? `${minutes} min de lecture` : ""].filter(Boolean).join(" · ");
  const count = document.querySelector('[data-for="excerpt"]');
  count.textContent = `${fields.excerpt.value.length}/300`;
}

$("#article-form").addEventListener("input", () => { editorDirty = true; updatePreview(); });

// Photo : clic, glisser-déposer
const drop = $("#drop");
const fileInput = $("#image");
drop.addEventListener("click", event => { if (!event.target.closest("#image-remove")) fileInput.click(); });
drop.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.click(); } });
drop.addEventListener("dragover", event => { event.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", event => {
  event.preventDefault();
  drop.classList.remove("over");
  if (event.dataTransfer.files[0]) pickImage(event.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => fileInput.files[0] && pickImage(fileInput.files[0]));
$("#image-remove").addEventListener("click", () => {
  pendingImage = null;
  removeCurrentImage = true;
  fileInput.value = "";
  setImagePreview("");
  editorDirty = true;
});

function pickImage(file) {
  if (!file.type.startsWith("image/")) { toast("Ce fichier n'est pas une image.", true); return; }
  if (file.size > 8 * 1024 * 1024) { toast("L'image dépasse 8 Mo. Choisissez une image plus légère.", true); return; }
  pendingImage = file;
  removeCurrentImage = false;
  setImagePreview(URL.createObjectURL(file));
  if (!fields.imageAlt.value) fields.imageAlt.value = fields.title.value;
  editorDirty = true;
}

function safeFileName(name = "image") {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
}

async function uploadImage(file) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Session expirée, reconnectez-vous.");
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const base = safeFileName(file.name.replace(/\.[^.]+$/, "")) || "article";
  const path = `${userData.user.id}/${crypto.randomUUID()}-${base}.${ext}`;
  const { error } = await supabase.storage.from(ARTICLE_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || undefined
  });
  if (error) throw error;
  return { url: supabase.storage.from(ARTICLE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl, path };
}

const removeImage = path => path ? supabase.storage.from(ARTICLE_IMAGES_BUCKET).remove([path]) : null;

async function saveArticle(status) {
  if (!fields.title.value.trim()) { toast("Ajoutez un titre.", true); fields.title.focus(); return; }
  if (!fields.category.value.trim()) { toast("Choisissez ou tapez un thème.", true); fields.category.focus(); return; }
  if (status === "published" && !fields.body.value.trim()) { toast("Le texte de l'article est vide.", true); fields.body.focus(); return; }

  const existing = currentArticle();
  let imageUrl = removeCurrentImage ? "" : existing?.image_url || "";
  let imagePath = removeCurrentImage ? "" : existing?.image_path || "";
  let uploadedPath = "";
  const buttons = [$("#publish"), $("#save-draft")];
  buttons.forEach(b => { b.disabled = true; });
  toast("Enregistrement…");

  try {
    if (pendingImage) {
      const uploaded = await uploadImage(pendingImage);
      ({ url: imageUrl, path: imagePath } = uploaded);
      uploadedPath = uploaded.path;
    }
    const minutes = readingMinutes();
    const payload = {
      title: fields.title.value.trim(),
      publication_date: fields.date.value || today(),
      category: fields.category.value.trim(),
      reading_time: minutes ? `${minutes} min de lecture` : null,
      excerpt: fields.excerpt.value.trim(),
      body: fields.body.value.trim(),
      image_url: imageUrl || null,
      image_path: imagePath || null,
      image_alt: fields.imageAlt.value.trim() || null,
      source_label: fields.sourceLabel.value.trim() || null,
      source_url: fields.sourceUrl.value.trim() || null,
      status,
      updated_at: new Date().toISOString()
    };
    const result = existing
      ? await supabase.from("articles").update(payload).eq("id", existing.id).select().single()
      : await supabase.from("articles").insert(payload).select().single();
    if (result.error) throw result.error;

    if (existing?.image_path && existing.image_path !== imagePath) await removeImage(existing.image_path);
    await loadArticles();
    openEditor(result.data);
    toast(status === "published" ? "Article publié sur le site ✓" : "Brouillon enregistré ✓");
  } catch (error) {
    if (uploadedPath) await removeImage(uploadedPath);
    const denied = /row-level security|permission|not allowed/i.test(error?.message || "");
    toast(denied ? "Ce compte n'a pas le droit de modifier le site." : `Erreur : ${error?.message || "opération impossible"}`, true);
  } finally {
    buttons.forEach(b => { b.disabled = false; });
  }
}

$("#publish").addEventListener("click", () => saveArticle("published"));
$("#save-draft").addEventListener("click", () => saveArticle("draft"));

$("#delete-article").addEventListener("click", async () => {
  const article = currentArticle();
  if (!article || !confirm(`Supprimer définitivement « ${article.title} » ?`)) return;
  const { error } = await supabase.from("articles").delete().eq("id", article.id);
  if (error) { toast(`Suppression impossible : ${error.message}`, true); return; }
  await removeImage(article.image_path);
  editorDirty = false;
  await loadArticles();
  show("articles");
  toast("Article supprimé.");
});

addEventListener("beforeunload", event => { if (editorDirty || coursesDirty) event.preventDefault(); });

/* ---------- Cours collectifs ---------- */

let sessions = [];
let coursesDirty = false;

async function loadCourses() {
  sessions = DEFAULT_COURSE_SESSIONS.map(s => ({ ...s }));
  try {
    const { data } = supabase.storage.from(COURSE_STORAGE_BUCKET).getPublicUrl(COURSE_STORAGE_PATH);
    const response = await fetch(`${data.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (response.ok) sessions = parseCourseSchedule(await response.json()) || sessions;
  } catch { /* calendrier par défaut */ }
  renderSessions();
}

function renderSessions() {
  const now = today();
  $("#sessions").innerHTML = sessions.map((s, i) => {
    const weekday = s.date ? new Date(`${s.date}T12:00:00`).toLocaleDateString("fr-BE", { weekday: "long" }) : "";
    return `<li class="${s.date && s.date < now ? "past" : ""}">
      <span class="num">${i + 1}</span>
      <label>Date<input type="date" value="${s.date}" data-i="${i}" data-k="date"></label>
      <span class="weekday">${weekday}</span>
      <label>Début<input type="time" value="${s.start_time}" data-i="${i}" data-k="start_time"></label>
      <label>Fin<input type="time" value="${s.end_time}" data-i="${i}" data-k="end_time"></label>
      <button class="icon-btn" data-remove="${i}" aria-label="Supprimer la séance ${i + 1}">✕</button>
    </li>`;
  }).join("") || `<li class="empty">Aucune séance. Ajoutez-en une.</li>`;
}

$("#sessions").addEventListener("change", event => {
  const input = event.target.closest("[data-k]");
  if (!input) return;
  sessions[input.dataset.i][input.dataset.k] = input.value;
  coursesDirty = true;
  if (input.dataset.k === "date") renderSessions();
});
$("#sessions").addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  sessions.splice(Number(button.dataset.remove), 1);
  coursesDirty = true;
  renderSessions();
});
$("#add-session").addEventListener("click", () => {
  const last = sessions.at(-1);
  const next = last?.date ? new Date(`${last.date}T12:00:00`) : new Date();
  next.setDate(next.getDate() + 7);
  sessions.push({
    date: next.toISOString().slice(0, 10),
    start_time: last?.start_time || $("#bulk-start").value,
    end_time: last?.end_time || $("#bulk-end").value
  });
  coursesDirty = true;
  renderSessions();
});
$("#apply-bulk").addEventListener("click", () => {
  sessions.forEach(s => { s.start_time = $("#bulk-start").value; s.end_time = $("#bulk-end").value; });
  coursesDirty = true;
  renderSessions();
});

$("#save-courses").addEventListener("click", async () => {
  if (!sessions.length) { toast("Ajoutez au moins une séance.", true); return; }
  if (sessions.some(s => s.start_time >= s.end_time)) { toast("Pour chaque séance, l'heure de fin doit être après l'heure de début.", true); return; }
  const sorted = parseCourseSchedule({ version: 2, sessions });
  if (!sorted) { toast("Une date est invalide ou en double. Vérifiez le calendrier.", true); return; }

  const blob = new Blob([JSON.stringify({ version: 2, sessions: sorted, updated_at: new Date().toISOString() })], { type: "application/json" });
  $("#save-courses").disabled = true;
  const { error } = await supabase.storage.from(COURSE_STORAGE_BUCKET)
    .upload(COURSE_STORAGE_PATH, blob, { upsert: true, contentType: "application/json", cacheControl: "60" });
  $("#save-courses").disabled = false;
  if (error) { toast(`Enregistrement impossible : ${error.message}`, true); return; }
  sessions = sorted.map(s => ({ ...s }));
  coursesDirty = false;
  renderSessions();
  updateDashboard();
  toast("Dates enregistrées ✓ Elles sont en ligne.");
});

/* ---------- Tableau de bord ---------- */

function updateDashboard() {
  $("#stat-published").textContent = articles.filter(a => a.status === "published").length;
  $("#stat-drafts").textContent = articles.filter(a => a.status === "draft").length;
  const next = sessions.find(s => s.date >= today());
  $("#stat-next").textContent = next
    ? new Date(`${next.date}T12:00:00`).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })
    : "—";
}

/* ---------- Démarrage ---------- */

const { data } = await supabase.auth.getSession();
showSession(data.session);
supabase.auth.onAuthStateChange((_event, session) => setTimeout(() => showSession(session), 0));
