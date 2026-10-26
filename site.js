import { supabase } from "./supabase-client.js";
import {
  COURSE_STORAGE_BUCKET,
  COURSE_STORAGE_PATH,
  DEFAULT_COURSE_SESSIONS,
  parseCourseSchedule,
  courseTimeRange
} from "./course-dates-config.js";

const CONTACT_EMAIL = "erika.casa.pro@hotmail.com";

// Articles écrits en HTML, affichés avec ceux de l'administration.
const STATIC_ARTICLES = [
  { title: "Un diagnostic, pas une définition", category: "Autisme", excerpt: "Recevoir un diagnostic d'autisme à l'âge adulte : comprendre son fonctionnement, ses besoins, ses forces et sa place dans le monde professionnel.", image_url: "assets/diagnostic-autisme-adulte.jpg", href: "articles/diagnostic-autisme-adulte.html" },
  { title: "Burnout : reconnaître les signes d'épuisement", category: "Burnout", reading_time: "2 min de lecture", excerpt: "Un état de fatigue physique, émotionnelle et mentale intense lié à un stress prolongé, souvent professionnel.", image_url: "assets/burnout.jpeg", href: "articles/burnout.html" },
  { title: "Faire le point sur son avenir professionnel", category: "Réorientation", reading_time: "2 min de lecture", excerpt: "Une période de doute ou de transition peut être l'occasion de réfléchir à ses besoins et à la suite de son parcours.", image_url: "assets/reorientation.jpeg", href: "articles/reorientation.html" },
  { title: "Autisme : comprendre, respecter et favoriser l'inclusion", category: "Autisme", excerpt: "Quelques repères pour mieux comprendre l'autisme et rappeler l'importance de l'inclusion.", image_url: "assets/autisme.jpeg", href: "articles/autisme.html" }
];

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const formatDate = iso => iso ? new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00`)) : "";

// Navigation
const header = document.querySelector(".site-header");
const toggle = document.querySelector(".menu-toggle");
toggle?.addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  toggle.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll(".nav-links a").forEach(link => link.addEventListener("click", () => {
  document.body.classList.remove("menu-open");
  toggle?.setAttribute("aria-expanded", "false");
}));
const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 10);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Apparition au défilement
const observer = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
    }), { threshold: .12 })
  : null;
document.querySelectorAll(".reveal").forEach(el => observer ? observer.observe(el) : el.classList.add("in"));

// Demande de rendez-vous : ouvre le logiciel de messagerie avec un message prérempli.
const form = document.querySelector("#rdv-form");
form?.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(form);
  const moments = data.getAll("moment").join(", ") || "indifférent";
  const lines = [
    "Bonjour Madame Casa,",
    "",
    `Je souhaiterais prendre rendez-vous (${data.get("motif")}).`,
    "",
    data.get("message") ? `${data.get("message")}\n` : "",
    `Disponibilités : ${moments}`,
    "",
    `${data.get("nom")}`,
    `${data.get("telephone") || ""}`,
    `${data.get("email") || ""}`
  ];
  const subject = `Demande de rendez-vous – ${data.get("nom")}`;
  location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  form.querySelector(".form-status").textContent = "Votre messagerie s'ouvre avec la demande préremplie. Il ne reste qu'à l'envoyer.";
});

// Articles
function articleCard(article) {
  const href = article.href || `article-dynamique.html?id=${encodeURIComponent(article.id)}`;
  const meta = [formatDate(article.publication_date), article.category, article.reading_time].filter(Boolean).join(" · ");
  const img = article.image_url
    ? `<img src="${escapeHTML(article.image_url)}" alt="${escapeHTML(article.image_alt || "")}" loading="lazy">`
    : "";
  return `<a class="article-card reveal in" href="${escapeHTML(href)}" data-category="${escapeHTML(article.category || "")}">
    <div class="thumb">${img}</div>
    <div class="body">
      <span class="meta">${escapeHTML(meta || article.category || "")}</span>
      <h3>${escapeHTML(article.title)}</h3>
      <p>${escapeHTML(article.excerpt || "")}</p>
    </div>
  </a>`;
}

async function loadArticles() {
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,publication_date,category,reading_time,excerpt,image_url,image_alt")
    .eq("status", "published")
    .order("publication_date", { ascending: false });
  return [...(error ? [] : data || []), ...STATIC_ARTICLES];
}

const articleGrid = document.querySelector("[data-articles]");
if (articleGrid) {
  const limit = Number(articleGrid.dataset.articles) || Infinity;
  const all = await loadArticles();
  articleGrid.innerHTML = all.slice(0, limit).map(articleCard).join("");

  const filters = document.querySelector("[data-filters]");
  if (filters) {
    const categories = ["Tous", ...new Set(all.map(a => a.category).filter(Boolean))];
    filters.innerHTML = categories.map((c, i) => `<button type="button" aria-pressed="${i === 0}">${escapeHTML(c)}</button>`).join("");
    filters.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      filters.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
      const value = button.textContent;
      articleGrid.querySelectorAll(".article-card").forEach(card => {
        card.hidden = value !== "Tous" && card.dataset.category !== value;
      });
    });
  }
}

// Article dynamique
const articleRoot = document.querySelector("[data-article]");
if (articleRoot) {
  const id = new URLSearchParams(location.search).get("id");
  const { data: article } = id
    ? await supabase.from("articles").select("*").eq("id", id).eq("status", "published").maybeSingle()
    : { data: null };
  if (!article) {
    articleRoot.innerHTML = `<h1>Article introuvable</h1><p>Cet article n'existe plus ou n'est pas encore publié.</p><a class="btn btn-primary" href="articles.html">Voir tous les articles</a>`;
  } else {
    document.title = `${article.title} | Erika Casa`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", article.excerpt || "");
    const paragraphs = String(article.body || "").split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
      .map(b => `<p>${escapeHTML(b).replace(/\n/g, "<br>")}</p>`).join("");
    const source = article.source_url
      ? `<p><small>Source : <a href="${escapeHTML(article.source_url)}" target="_blank" rel="noopener">${escapeHTML(article.source_label || article.source_url)}</a></small></p>`
      : "";
    articleRoot.innerHTML = `
      <a class="back" href="articles.html">← Tous les articles</a>
      <span class="eyebrow">${escapeHTML(article.category || "Article")}</span>
      <h1>${escapeHTML(article.title)}</h1>
      <p class="lead">${escapeHTML([formatDate(article.publication_date), article.reading_time].filter(Boolean).join(" · "))}</p>
      ${article.image_url ? `<img class="cover" src="${escapeHTML(article.image_url)}" alt="${escapeHTML(article.image_alt || "")}">` : ""}
      ${paragraphs}${source}`;
  }
}

// Dates des cours collectifs
const courseList = document.querySelector("[data-courses]");
if (courseList) {
  let sessions = DEFAULT_COURSE_SESSIONS;
  try {
    const { data } = supabase.storage.from(COURSE_STORAGE_BUCKET).getPublicUrl(COURSE_STORAGE_PATH);
    const response = await fetch(`${data.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (response.ok) sessions = parseCourseSchedule(await response.json()) || sessions;
  } catch { /* calendrier par défaut */ }

  const today = new Date().toISOString().slice(0, 10);
  const limit = Number(courseList.dataset.courses) || Infinity;
  const upcoming = sessions.filter(s => s.date >= today);
  const shown = (courseList.dataset.showPast ? sessions : upcoming).slice(0, limit);
  courseList.innerHTML = shown.length ? shown.map(s => {
    const d = new Date(`${s.date}T12:00:00`);
    const weekday = d.toLocaleDateString("fr-BE", { weekday: "long" });
    const month = d.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
    return `<li class="${s.date < today ? "past" : ""}">
      <span class="day"><b>${d.getDate()}</b><small>${d.toLocaleDateString("fr-BE", { month: "short" })}</small></span>
      <span class="when">${weekday[0].toUpperCase()}${weekday.slice(1)} ${d.getDate()} ${month}<small>${courseTimeRange(s.start_time, s.end_time)}</small></span>
    </li>`;
  }).join("") : `<li>Les prochaines dates seront bientôt annoncées.</li>`;

  const next = upcoming[0];
  document.querySelectorAll("[data-next-course]").forEach(el => {
    el.textContent = next
      ? new Date(`${next.date}T12:00:00`).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
      : "dates bientôt annoncées";
  });
}

document.querySelectorAll("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });
