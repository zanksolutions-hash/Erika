import { supabase, isSupabaseConfigured, ARTICLE_IMAGES_BUCKET } from "./supabase-client.js?v=20261006-3";

const configPanel = document.getElementById("configPanel");
const loginPanel = document.getElementById("loginPanel");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMessage = document.getElementById("loginMessage");
const adminApp = document.getElementById("adminApp");
const logoutButton = document.getElementById("logoutButton");
const sessionEmail = document.getElementById("sessionEmail");

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
const statusInput = document.getElementById("status");
const imagePreview = document.getElementById("imagePreview");
const list = document.getElementById("adminArticleList");
const message = document.getElementById("adminMessage");
const resetButton = document.getElementById("resetButton");

let articles = [];
let currentImageUrl = "";
let currentImagePath = "";

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

function showPreview(src) {
  if (!src) {
    imagePreview.hidden = true;
    imagePreview.innerHTML = "";
    return;
  }
  imagePreview.hidden = false;
  imagePreview.innerHTML = `<img src="${escapeHTML(src)}" alt="Aperçu de l'image">`;
}

function resetForm() {
  form.reset();
  idInput.value = "";
  currentImageUrl = "";
  currentImagePath = "";
  showPreview("");
  setToday();
  statusInput.value = "published";
  message.textContent = "";
}

function renderList() {
  if (!articles.length) {
    list.innerHTML = '<p class="admin-empty">Aucun article enregistré pour le moment.</p>';
    return;
  }

  list.innerHTML = articles.map(article => `
    <article class="admin-list-card">
      ${article.image_url ? `<img src="${escapeHTML(article.image_url)}" alt="">` : ""}
      <div>
        <p class="article-meta">
          ${escapeHTML(formatDate(article.publication_date))}
          · ${escapeHTML(article.category || "")}
          · ${article.status === "draft" ? "Brouillon" : "Publié"}
        </p>
        <h3>${escapeHTML(article.title)}</h3>
        <div class="admin-list-actions">
          <button type="button" data-edit="${article.id}">Modifier</button>
          ${article.status === "published"
            ? `<a href="article-dynamique.html?id=${encodeURIComponent(article.id)}" target="_blank" rel="noopener">Voir</a>`
            : ""}
          <button type="button" class="danger" data-delete="${article.id}">Supprimer</button>
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

async function loadArticles() {
  list.innerHTML = '<p class="admin-empty">Chargement…</p>';

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("publication_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="admin-empty">Impossible de charger les articles.</p>`;
    message.textContent = error.message;
    return;
  }

  articles = data || [];
  renderList();
}

function editArticle(id) {
  const article = articles.find(item => item.id === id);
  if (!article) return;

  idInput.value = article.id;
  titleInput.value = article.title || "";
  dateInput.value = article.publication_date || "";
  categoryInput.value = article.category || "";
  readingInput.value = article.reading_time || "";
  excerptInput.value = article.excerpt || "";
  bodyInput.value = article.body || "";
  sourceLabelInput.value = article.source_label || "";
  sourceUrlInput.value = article.source_url || "";
  imageAltInput.value = article.image_alt || "";
  statusInput.value = article.status || "published";

  currentImageUrl = article.image_url || "";
  currentImagePath = article.image_path || "";
  showPreview(currentImageUrl);

  window.scrollTo({ top: 0, behavior: "smooth" });
  message.textContent = "Article chargé pour modification.";
}

function safeFileName(name = "image") {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

async function uploadImage(file) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Session expirée.");

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const base = safeFileName(file.name.replace(/\.[^.]+$/, "")) || "article";
  const path = `${user.id}/${crypto.randomUUID()}-${base}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(ARTICLE_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(ARTICLE_IMAGES_BUCKET)
    .getPublicUrl(path);

  return {
    url: data.publicUrl,
    path
  };
}

async function removeImage(path) {
  if (!path) return;
  await supabase.storage.from(ARTICLE_IMAGES_BUCKET).remove([path]);
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) return;

  if (file.size > 8 * 1024 * 1024) {
    message.textContent = "L’image dépasse 8 Mo. Choisissez une image plus légère.";
    imageInput.value = "";
    return;
  }

  const localUrl = URL.createObjectURL(file);
  showPreview(localUrl);
});

async function deleteArticle(id) {
  const article = articles.find(item => item.id === id);
  if (!article) return;

  if (!confirm(`Supprimer « ${article.title} » ?`)) return;

  const { error } = await supabase.from("articles").delete().eq("id", id);

  if (error) {
    message.textContent = `Suppression impossible : ${error.message}`;
    return;
  }

  if (article.image_path) {
    await removeImage(article.image_path);
  }

  if (idInput.value === id) resetForm();
  message.textContent = "Article supprimé.";
  await loadArticles();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Enregistrement…";

  const existingId = idInput.value;
  const existing = articles.find(item => item.id === existingId);

  let imageUrl = currentImageUrl || existing?.image_url || "";
  let imagePath = currentImagePath || existing?.image_path || "";
  let newlyUploadedPath = "";

  try {
    const newImage = imageInput.files?.[0];

    if (newImage) {
      const uploaded = await uploadImage(newImage);
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
      newlyUploadedPath = uploaded.path;
    }

    const payload = {
      title: titleInput.value.trim(),
      publication_date: dateInput.value,
      category: categoryInput.value.trim(),
      reading_time: readingInput.value.trim() || null,
      excerpt: excerptInput.value.trim(),
      body: bodyInput.value.trim(),
      image_url: imageUrl || null,
      image_path: imagePath || null,
      image_alt: imageAltInput.value.trim() || null,
      source_label: sourceLabelInput.value.trim() || null,
      source_url: sourceUrlInput.value.trim() || null,
      status: statusInput.value,
      updated_at: new Date().toISOString()
    };

    let result;

    if (existingId) {
      result = await supabase
        .from("articles")
        .update(payload)
        .eq("id", existingId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("articles")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    if (newlyUploadedPath && existing?.image_path && existing.image_path !== newlyUploadedPath) {
      await removeImage(existing.image_path);
    }

    currentImageUrl = result.data.image_url || "";
    currentImagePath = result.data.image_path || "";
    idInput.value = result.data.id;

    message.textContent = existingId
      ? "Article mis à jour."
      : statusInput.value === "published"
        ? "Article publié. Il est visible immédiatement sur le site."
        : "Brouillon enregistré.";

    imageInput.value = "";
    showPreview(currentImageUrl);
    await loadArticles();
  } catch (error) {
    if (newlyUploadedPath) {
      await removeImage(newlyUploadedPath);
    }
    message.textContent = `Erreur : ${error?.message || "opération impossible"}`;
  }
});

resetButton.addEventListener("click", resetForm);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Connexion…";

  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value
  });

  if (error) {
    loginMessage.textContent = "Adresse e-mail ou mot de passe incorrect.";
    return;
  }

  loginPassword.value = "";
  loginMessage.textContent = "";
});

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

async function showSession(session) {
  const loggedIn = Boolean(session?.user);

  loginPanel.hidden = loggedIn;
  adminApp.hidden = !loggedIn;

  if (loggedIn) {
    sessionEmail.textContent = session.user.email || "Administrateur";
    setToday();
    await loadArticles();
  } else {
    articles = [];
    resetForm();
  }
}

async function init() {
  if (!isSupabaseConfigured) {
    configPanel.hidden = false;
    loginPanel.hidden = true;
    adminApp.hidden = true;
    return;
  }

  configPanel.hidden = true;

  const { data } = await supabase.auth.getSession();
  await showSession(data.session);

  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => showSession(session), 0);
  });
}

init();
