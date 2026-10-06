import { supabase, isSupabaseConfigured } from "./supabase-client.js";

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

async function renderArticles() {
  if (!container) return;

  if (!isSupabaseConfigured) {
    container.remove();
    return;
  }

  const { data, error } = await supabase
    .from("articles")
    .select("id,title,publication_date,category")
    .eq("status", "published")
    .order("publication_date", { ascending: false });

  if (error || !data?.length) {
    container.remove();
    return;
  }

  container.innerHTML = data.map(article => {
    const meta = [formatDate(article.publication_date), article.category]
      .filter(Boolean)
      .join(" · ");

    return `
      <a class="simple-article-link"
         href="article-dynamique.html?id=${encodeURIComponent(article.id)}">
        <div>
          <p class="article-meta">${escapeHTML(meta)}</p>
          <span>${escapeHTML(article.title)}</span>
        </div>
        <span class="simple-arrow">→</span>
      </a>
    `;
  }).join("");
}

renderArticles();
