const STORAGE_KEY = "erikaCasaArticles";
const container = document.getElementById("dynamicArticlesPage");
const menuButton = document.getElementById("menuButton");
const nav = document.getElementById("nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
}

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

function getArticles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter(article => article && article.status === "published")
      : [];
  } catch {
    return [];
  }
}

const articles = getArticles()
  .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

if (!articles.length) {
  container.remove();
} else {
  container.innerHTML = articles.map(article => {
    const image = article.image || "assets/logo-psychologie-transparent.png";
    const meta = [formatDate(article.date), article.category, article.readingTime]
      .filter(Boolean)
      .join(" · ");

    return `
      <a class="article-card article-card-link"
         href="article-dynamique.html?id=${encodeURIComponent(article.id)}">
        <img src="${image}" alt="${escapeHTML(article.imageAlt || article.title)}">
        <div>
          <p class="article-meta">${escapeHTML(meta)}</p>
          <h3>${escapeHTML(article.title)}</h3>
          <p>${escapeHTML(article.excerpt || "")}</p>
          <span class="article-link">Lire l’article →</span>
        </div>
      </a>
    `;
  }).join("");
}
