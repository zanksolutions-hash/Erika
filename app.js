const menuButton = document.getElementById("menuButton");
const nav = document.getElementById("nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
}

const STORAGE_KEY = "erikaCasaArticles";

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPublishedArticles() {
  try {
    const articles = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(articles)
      ? articles.filter(article => article && article.status === "published")
      : [];
  } catch {
    return [];
  }
}

const container = document.getElementById("homeDynamicArticles");
if (container) {
  const articles = getPublishedArticles()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 3);

  if (!articles.length) {
    container.remove();
  } else {
    container.innerHTML = articles.map(article => `
      <a class="simple-article-link"
         href="article-dynamique.html?id=${encodeURIComponent(article.id)}">
        <span>${escapeHTML(article.title)}</span>
        <span class="simple-arrow">→</span>
      </a>
    `).join("");
  }
}
