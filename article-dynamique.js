const STORAGE_KEY = "erikaCasaArticles";
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

const id = new URLSearchParams(location.search).get("id");
let articles = [];

try {
  articles = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
} catch {
  articles = [];
}

const article = articles.find(item => item.id === id && item.status === "published");

if (!article) {
  container.innerHTML = `
    <a class="article-back" href="index.html#articles">← Retour aux articles</a>
    <h1>Article introuvable</h1>
    <p class="article-intro">
      Cet article n’existe pas dans ce navigateur ou a été supprimé.
    </p>
  `;
} else {
  document.title = `${article.title} | Erika Casa`;

  const meta = [
    formatDate(article.date),
    article.category,
    article.readingTime
  ].filter(Boolean).join(" · ");

  const image = article.image
    ? `<img class="article-hero-image" src="${article.image}" alt="${escapeHTML(article.imageAlt || article.title)}">`
    : "";

  const source = article.sourceUrl
    ? `
      <div class="dynamic-source">
        <strong>Source</strong>
        <a href="${escapeHTML(article.sourceUrl)}" target="_blank" rel="noopener">
          ${escapeHTML(article.sourceLabel || article.sourceUrl)}
        </a>
      </div>
    `
    : "";

  container.innerHTML = `
    <a class="article-back" href="index.html#articles">← Retour aux articles</a>
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
