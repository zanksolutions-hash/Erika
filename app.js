import { supabase, isSupabaseConfigured } from "./supabase-client.js";

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

async function renderHomeArticles() {
  const container = document.getElementById("homeDynamicArticles");
  if (!container) return;

  if (!isSupabaseConfigured) {
    container.remove();
    return;
  }

  const { data, error } = await supabase
    .from("articles")
    .select("id,title")
    .eq("status", "published")
    .order("publication_date", { ascending: false })
    .limit(3);

  if (error || !data?.length) {
    container.remove();
    return;
  }

  container.innerHTML = data.map(article => `
    <a class="simple-article-link"
       href="article-dynamique.html?id=${encodeURIComponent(article.id)}">
      <span>${escapeHTML(article.title)}</span>
      <span class="simple-arrow" aria-hidden="true"><i class="ti ti-arrow-right"></i></span>
    </a>
  `).join("");
}

renderHomeArticles();
