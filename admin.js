import { supabase, isSupabaseConfigured, ARTICLE_IMAGES_BUCKET } from "./supabase-client.js";

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
  imagePreview.innerHTML = `<img src="${escapeHTML(src)}" alt="AperÃ§u de l'image">`;
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
    list.innerHTML = '<p class="admin-empty">Aucun article enregistrÃ© pour le moment.</p>';
    return;
  }

  list.innerHTML = articles.map(article => `
    <article class="admin-list-card">
      ${article.image_url ? `<img src="${escapeHTML(article.image_url)}" alt="">` : ""}
      <div>
        <p class="article-meta">
          ${escapeHTML(formatDate(article.publication_date))}
          Â· ${escapeHTML(article.category || "")}
          Â· ${article.status === "draft" ? "Brouillon" : "PubliÃ©"}
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
  list.innerHTML = '<p class="admin-empty">Chargementâ€¦</p>';

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
  message.textContent = "Article chargÃ© pour modification.";
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
  if (!user) throw new Error("Session expirÃ©e.");

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
    message.textContent = "Lâ€™image dÃ©passe 8 Mo. Choisissez une image plus lÃ©gÃ¨re.";
    imageInput.value = "";
    return;
  }

  const localUrl = URL.createObjectURL(file);
  showPreview(localUrl);
});

async function deleteArticle(id) {
  const article = articles.find(item => item.id === id);
  if (!article) return;

  if (!confirm(`Suppresser Â« ${article.title} Â»È
JH™]\›Â‚ˆÛÛœİÈ\œ›ÜˆHH]ØZ]İ\X˜\ÙK™œ›ÛJ˜\XÛ\ÈŠK™[]J
K™\JšY‹Y
NÂ‚ˆYˆ
\œ›ÜŠHÂˆY\ÜØYÙK^ÛÛ[Hİ\™\ÜÚ[Ûˆ[\ÜÜÚX›Hˆ	Ù\œ›Ü‹›Y\ÜØYÙ_XÂˆ™]\›ÂˆB‚ˆYˆ
\XÛKš[XYÙWÜ]
HÂˆ]ØZ]™[[İ™R[XYÙJ\XÛKš[XYÙWÜ]
NÂˆB‚ˆYˆ
Y[œ]˜[YHOOHY
H™\Ù]›Ü›J
NÂˆY\ÜØYÙK^ÛÛ[H\XÛHİ\š[pêKˆÂˆ]ØZ]ØY\XÛ\Ê
NÂŸB‚™›Ü›K˜Y]™[\İ[™\ŠœİX›Z]‹\Ş[˜È
]™[
HOˆÂˆ]™[œ™]™[Y˜][

NÂˆY\ÜØYÙK^ÛÛ[H‘[œ™YÚ\İ™[Y[8 )ˆÂ‚ˆÛÛœİ^\İ[™ÒYHY[œ]˜[YNÂˆÛÛœİ^\İ[™ÈH\XÛ\Ë™š[™
][HOˆ][KšYOOH^\İ[™ÒY
NÂ‚ˆ][XYÙU\›Hİ\œ™[[XYÙU\›^\İ[™ÏËš[XYÙWİ\›ˆÂˆ][XYÙT]Hİ\œ™[[XYÙT]^\İ[™ÏËš[XYÙWÜ]ˆÂˆ]™]ÛU\ØYY]HˆÂ‚ˆHÂˆÛÛœİ™]Ò[XYÙHH[XYÙR[œ]™š[\ÏË–ÌNÂ‚ˆYˆ
™]Ò[XYÙJHÂˆÛÛœİ\ØYYH]ØZ]\ØY[XYÙJ™]Ò[XYÙJNÂˆ[XYÙU\›H\ØYY\›Âˆ[XYÙT]H\ØYYœ]Âˆ™]ÛU\ØYY]H\ØYYœ]ÂˆB‚ˆÛÛœİ^[ØYHÂˆ]Nˆ]R[œ]˜[YKš[J
KˆX›XØ][Û—Ù]Nˆ]R[œ]˜[YKˆØ]YÛÜNˆØ]YÛÜR[œ]˜[YKš[J
Kˆ™XY[™×İ[YNˆ™XY[™Ò[œ]˜[YKš[J
H[ˆ^Ù\œˆ^Ù\œ[œ]˜[YKš[J
Kˆ›ÙNˆ›ÙR[œ]˜[YKš[J
Kˆ[XYÙWİ\›ˆ[XYÙU\›[ˆ[XYÙWÜ]ˆ[XYÙT][ˆ[XYÙWØ[ˆ[XYÙP[[œ]˜[YKš[J
H[ˆÛİ\˜ÙWÛX™[ˆÛİ\˜ÙSX™[[œ]˜[YKš[J
H[ˆÛİ\˜ÙWİ\›ˆÛİ\˜ÙU\›[œ]˜[YKš[J
H[ˆİ]\Îˆİ]\Ò[œ]˜[YKˆ\]YØ]ˆ™]È]J
KÒTÓÔİš[™Ê
BˆNÂ‚ˆ]™\İ[Â‚ˆYˆ
^\İ[™ÒY
HÂˆ™\İ[H]ØZ]İ\X˜\ÙBˆ™œ›ÛJ˜\XÛ\ÈŠBˆ\]J^[ØY
Bˆ™\JšY‹^\İ[™ÒY
BˆœÙ[Xİ

BˆœÚ[™ÛJ
NÂˆH[ÙHÂˆ™\İ[H]ØZ]İ\X˜\ÙBˆ™œ›ÛJ˜\XÛ\ÈŠBˆš[œÙ\
^[ØY
BˆœÙ[Xİ

BˆœÚ[™ÛJ
NÂˆB‚ˆYˆ
™\İ[™\œ›ÜŠH›İÈ™\İ[™\œ›ÜÂ‚ˆYˆ
™]ÛU\ØYY]	‰ˆ^\İ[™ÏËš[XYÙWÜ]	‰ˆ^\İ[™Ëš[XYÙWÜ]OOH™]ÛU\ØYY]
HÂˆ]ØZ]™[[İ™R[XYÙJ^\İ[™Ëš[XYÙWÜ]
NÂˆB‚ˆİ\œ™[[XYÙU\›H™\İ[™]Kš[XYÙWİ\›ˆÂˆİ\œ™[[XYÙT]H™\İ[™]Kš[XYÙWÜ]ˆÂˆY[œ]˜[YHH™\İ[™]KšYÂ‚ˆY\ÜØYÙK^ÛÛ[H^\İ[™ÒYˆÈ\XÛHZ\È0è›İ\‹ˆ‚ˆˆİ]\Ò[œ]˜[YHOOHœX›\ÚY‚ˆÈ\XÛHX›pêKˆ[\İš\ÚX›H[[pêYX][Y[İ\ˆHÚ]Kˆ‚ˆˆœ›İZ[Ûˆ[œ™YÚ\İ°êKˆÂ‚ˆ[XYÙR[œ]˜[YHHˆÂˆÚİÔ™]šY]Êİ\œ™[[XYÙU\›
NÂˆ]ØZ]ØY\XÛ\Ê
NÂˆHØ]Ú
\œ›ÜŠHÂˆYˆ
™]ÛU\ØYY]
HÂˆ]ØZ]™[[İ™R[XYÙJ™]ÛU\ØYY]
NÂˆBˆY\ÜØYÙK^ÛÛ[H\œ™]\ˆˆ	Ù\œ›ÜË›Y\ÜØYÙH›Ü0ê\˜][Ûˆ[\ÜÜÚX›HŸXÂˆBŸJNÂ‚œ™\Ù]]Û‹˜Y]™[\İ[™\Š˜ÛXÚÈ‹™\Ù]›Ü›JNÂ‚›ÙÚ[‘›Ü›K˜Y]™[\İ[™\ŠœİX›Z]‹\Ş[˜È
]™[
HOˆÂˆ]™[œ™]™[Y˜][

NÂˆÙÚ[“Y\ÜØYÙK^ÛÛ[HÛÛ›™^[Û¸ )ˆÂ‚ˆÛÛœİÈ\œ›ÜˆHH]ØZ]İ\X˜\ÙK˜]]œÚYÛ’[•Ú]\ÜİÛÜ™
Âˆ[XZ[ˆÙÚ[‘[XZ[˜[YKš[J
Kˆ\ÜİÛÜ™ˆÙÚ[”\ÜİÛÜ™˜[YBˆJNÂ‚ˆYˆ
\œ›ÜŠHÂˆÙÚ[“Y\ÜØYÙK^ÛÛ[HY™\ÜÙHK[XZ[İH[İH\ÜÙH[˜ÛÜœ™XİˆÂˆ™]\›ÂˆB‚ˆÙÚ[”\ÜİÛÜ™˜[YHHˆÂˆÙÚ[“Y\ÜØYÙK^ÛÛ[HˆÂŸJNÂ‚›ÙÛİ]]Û‹˜Y]™[\İ[™\Š˜ÛXÚÈ‹\Ş[˜È

HOˆÂˆ]ØZ]İ\X˜\ÙK˜]]œÚYÛ“İ]

NÂŸJNÂ‚˜\Ş[˜È[˜İ[ÛˆÚİÔÙ\ÜÚ[ÛŠÙ\ÜÚ[ÛŠHÂˆÛÛœİÙÙÙY[ˆH›ÛÛX[ŠÙ\ÜÚ[ÛË\Ù\ŠNÂ‚ˆÙÚ[”[™[šY[ˆHÙÙÙY[ÂˆYZ[\šY[ˆH[ÙÙÙY[Â‚ˆYˆ
ÙÙÙY[ŠHÂˆÙ\ÜÚ[Û‘[XZ[^ÛÛ[HÙ\ÜÚ[Û‹\Ù\‹™[XZ[YZ[š\İ˜]]\ˆÂˆÙ]Ù^J
NÂˆ]ØZ]ØY\XÛ\Ê
NÂˆH[ÙHÂˆ\XÛ\ÈH×NÂˆ™\Ù]›Ü›J
NÂˆBŸB‚˜\Ş[˜È[˜İ[Ûˆ[š]

HÂˆYˆ
Z\Ôİ\X˜\ÙPÛÛ™šYİ\™Y
HÂˆÛÛ™šYÔ[™[šY[ˆH˜[ÙNÂˆÙÚ[”[™[šY[ˆHYNÂˆYZ[\šY[ˆHYNÂˆ™]\›ÂˆB‚ˆÛÛ™šYÔ[™[šY[ˆHYNÂ‚ˆÛÛœİÈ]HHH]ØZ]İ\X˜\ÙK˜]]™Ù]Ù\ÜÚ[ÛŠ
NÂˆ]ØZ]ÚİÔÙ\ÜÚ[ÛŠ]KœÙ\ÜÚ[ÛŠNÂ‚ˆİ\X˜\ÙK˜]]›Û]]İ]PÚ[™ÙJ
Ù]™[Ù\ÜÚ[ÛŠHOˆÂˆÙ][Y[İ]


HOˆÚİÔÙ\ÜÚ[ÛŠÙ\ÜÚ[ÛŠK
NÂˆJNÂŸB‚š[š]

NÂ