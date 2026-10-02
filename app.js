const menuButton = document.getElementById("menuButton");
const nav = document.getElementById("nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    nav.classList.toggle("open");
  });

  nav.querySelectorAll("a").forEach((link) => {
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

function getPublishedArticles() {
  try {
    const raw = localStorage.getItem("erikaCasaArticles");
    const articles = raw ? JSON.parse(raw) : [];
    return Array.isArray(articles)
      ? articles.filter(article => article && article.status === "published")
      : [];
  } catch {
    return [];
  }
}

function renderDynamicArticles() {
  const container = document.getElementById("dynamicArticles");
  if (!container) return;

  const articles = getPublishedArticles()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  if (!articles.length) {
    container.remove();
    return;
  }

  container.innerHTML = articles.map(article => {
    const image = article.image || "assets/logo-psychologie.jpeg";
    const date = formatDate(article.date);
    const meta = [date, article.category, article.readingTime]
      .filter(Boolean)
      .join(" · ");

    return `
      <a class="article-card article-card-link dynamic-article-card"
         href="article-dynamique.html?id=${encodeURIComponent(article.id)}">
        <img src="${image}" alt="${escapeHTML(article.imageAlt || article.title || "Article Erika Casa")}">
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

renderDynamicArticles();
