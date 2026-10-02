const STORAGE_KEY = "erikaCasaArticles";

const form = document.getElementById("articleForm");
const idInput = document.getElementById("articleId");
const titleInput = document.getElementById("title");
const dateInput = document.getElementById("date");
const categoryInput = document.getElementById("category");
const readingInput = document.getElementById("readingTime");
const excerptInput = document.getElementById("excerpt");
const imageInput = document.getElementById("image");
const imageAltInput = document.getElementById("imageAlt");
const bodyInput = document.getElementById("body");
const sourceLabelInput = document.getElementById("sourceLabel");
const sourceUrlInput = document.getElementById("sourceUrl");
const imagePreview = document.getElementById("imagePreview");
const list = document.getElementById("adminArticleList");
const message = document.getElementById("adminMessage");
const resetButton = document.getElementById("resetButton");

let currentImage = "";

function getArticles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveArticles(articles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

function setToday() {
  if (!dateInput.value) {
    const now = new Date();
    dateInput.value = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  }
}

function resizeImage(file, maxWidth = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showPreview(src) {
  if (!src) {
    imagePreview.hidden = true;
    imagePreview.innerHTML = "";
    return;
  }

  imagePreview.hidden = false;
  imagePreview.innerHTML = `<img src="${src}" alt="Aperçu de l'image">`;
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  if (!file) return;

  message.textContent = "Préparation de l’image…";

  try {
    currentImage = await resizeImage(file);
    showPreview(currentImage);
    message.textContent = "";
  } catch {
    message.textContent = "Impossible de préparer cette image.";
  }
});

function resetForm() {
  form.reset();
  idInput.value = "";
  currentImage = "";
  showPreview("");
  setToday();
  message.textContent = "";
}

function renderList() {
  const articles = getArticles()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  if (!articles.length) {
    list.innerHTML = '<p class="admin-empty">Aucun article créé pour le moment.</p>';
    return;
  }

  list.innerHTML = articles.map(article => `
    <article class="admin-list-card">
      ${article.image ? `<img src="${article.image}" alt="">` : ""}
      <div>
        <p class="article-meta">${escapeHTML(formatDate(article.date))} · ${escapeHTML(article.category || "")}</p>
        <h3>${escapeHTML(article.title)}</h3>
        <div class="admin-list-actions">
          <button type="button" data-edit="${escapeHTML(article.id)}">Modifier</button>
          <a href="article-dynamique.html?id=${encodeURIComponent(article.id)}" target="_blank">Voir</a>
          <button type="button" class="danger" data-delete="${escapeHTML(article.id)}">Supprimer</button>
        </div>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => editArticle(button.dataset.edit));
  });

  list.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => deleteArticle(button.dataset.delete));
  });
}

function editArticle(id) {
  const article = getArticles().find(item => item.id === id);
  if (!article) return;

  idInput.value = article.id;
  titleInput.value = article.title || "";
  dateInput.value = article.date || "";
  categoryInput.value = article.category || "";
  readingInput.value = article.readingTime || "";
  excerptInput.value = article.excerpt || "";
  bodyInput.value = article.body || "";
  sourceLabelInput.value = article.sourceLabel || "";
  sourceUrlInput.value = article.sourceUrl || "";
  imageAltInput.value = article.imageAlt || "";
  currentImage = article.image || "";
  showPreview(currentImage);

  window.scrollTo({ top: 0, behavior: "smooth" });
  message.textContent = "Article chargé pour modification.";
}

function deleteArticle(id) {
  const article = getArticles().find(item => item.id === id);
  if (!article) return;

  if (!confirm(`Supprimer « ${article.title} » ?`)) return;

  saveArticles(getArticles().filter(item => item.id !== id));
  renderList();

  if (idInput.value === id) resetForm();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const articles = getArticles();
  const existingId = idInput.value;
  const existing = articles.find(item => item.id === existingId);

  const article = {
    id: existingId || uid(),
    title: titleInput.value.trim(),
    date: dateInput.value,
    category: categoryInput.value.trim(),
    readingTime: readingInput.value.trim(),
    excerpt: excerptInput.value.trim(),
    image: currentImage || existing?.image || "",
    imageAlt: imageAltInput.value.trim(),
    body: bodyInput.value.trim(),
    sourceLabel: sourceLabelInput.value.trim(),
    sourceUrl: sourceUrlInput.value.trim(),
    status: "published",
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    const index = articles.findIndex(item => item.id === existingId);
    articles[index] = article;
  } else {
    articles.push(article);
  }

  try {
    saveArticles(articles);
    message.textContent = existing
      ? "Article mis à jour. Les changements sont visibles immédiatement."
      : "Article publié. Il apparaît maintenant dans la page Articles.";
    renderList();
    idInput.value = article.id;
  } catch {
    message.textContent = "L’image est probablement trop lourde pour le stockage du navigateur.";
  }
});

resetButton.addEventListener("click", resetForm);

setToday();
renderList();
