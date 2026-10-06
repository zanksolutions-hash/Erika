import { supabase, isSupabaseConfigured } from "./supabase-client.js";

const container = document.getElementById("dynamicArticle");

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString + "T12:00:00");
  return new Intl.DateTimeFormat("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(d);
}

function textToHTML(text = "") {
  const blocks = text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);

  return blocks.map(block => {
    if (block.startsWith("## ")) {
      return `<h2>${escapeHTML(block.slice(3))}</h2>`;
    }

    return `<p>${escapeHTML(block).replaceAll("\n", "<br>")}</p>`;
  }).join("");
}

async function renderArticle() {
  const id = new URLSearchParams(location.search).get("id");

  if (!id || !isSupabaseConfigured) {
    showNotFound();
    return;
  }

  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !article) {
    showNotFound();
    return;
  }

  document.title = `${article.title} | Erika Casa`;

  const meta = [
    formatDate(article.publication_date),
    article.category,
    article.reading_time
  ].filter(Boolean).join(" · ");

  const image = article.image_url
    ? `<img class="article-hero-image" src="${escapeHTML(article.image_url)}"
            alt="${escapeHTML(article.image_alt || article.title)}">`
    : "";

  const source = article.source_url
    ? `
      <div class="dynamic-source">
        <strong>Source</strong>
        <a href="${escapeHTML(article.source_url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHTML(article.source_label || article.source_url)}
        </a>
      </div>
    `
    : "";

  container.innerHTML = `
    <a class="article-back" href="articles.html">← Retour aux articles</a>
    <p class="eyebrow">${escapeHTML(meta)}</p>
    <h1>${escapeHTML(article.title)}</h1>
    <p class="article-intro">${escapeHTML(article.excerpt || "")}</p>
    ${image}
    <div class="article-body">
      ${textToHTML(article.body)}
      ${source}
    </div>
  `;
}

function showNotFound() {
  container.innerHTML = `
    <a class="article-back" href="articles.html">← Retour aux articles</a>
    <h1>Article introuvable</h1>
    <p class="article-intro">
      Cet article n’existe pas ou n’est plus publié.
    </p>
  `;
}

renderArticle();
