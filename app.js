/* =========
   Router por hash: #/home, #/alcoholimpiadas, #/ryder, #/arbol
   ========= */

const pages = Array.from(document.querySelectorAll(".page"));
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

function setActivePage(pageKey) {
  pages.forEach((p) => p.classList.toggle("is-active", p.dataset.page === pageKey));

  // Cierra menú móvil al navegar
  if (mainNav) mainNav.classList.remove("is-open");
  if (navToggle) navToggle.setAttribute("aria-expanded", "false");
}

function parseRoute() {
  const hash = window.location.hash || "#/home";
  const route = hash.replace("#/", "").trim().toLowerCase();

  const allowed = new Set(["home", "alcoholimpiadas", "ryder", "arbol"]);
  return allowed.has(route) ? route : "home";
}

window.addEventListener("hashchange", () => setActivePage(parseRoute()));
setActivePage(parseRoute());

/* =========
   Menú móvil
   ========= */
navToggle?.addEventListener("click", () => {
  const isOpen = mainNav?.classList.toggle("is-open") ?? false;
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

/* =========
   Tabs Ryder
   ========= */
const tabButtons = Array.from(document.querySelectorAll(".tab"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

function setActiveTab(tabId) {
  tabButtons.forEach((b) => {
    const active = b.dataset.tab === tabId;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", String(active));
  });
  tabPanels.forEach((p) => p.classList.toggle("is-active", p.id === tabId));
}

// Solo activa tabs si existen (en la página Ryder)
if (tabButtons.length && tabPanels.length) {
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // Garantiza un tab inicial válido
  const initial = tabButtons.find((b) => b.classList.contains("is-active"))?.dataset.tab || tabButtons[0].dataset.tab;
  setActiveTab(initial);
}

/* =========
   Muro / Posts (localStorage)
   ========= */

function nowISO() {
  return new Date().toISOString();
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function safeText(s) {
  return (s || "").toString().trim();
}

function loadPosts(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePosts(storageKey, posts) {
  localStorage.setItem(storageKey, JSON.stringify(posts));
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function renderFeed(container, posts) {
  if (!container) return;

  if (!posts.length) {
    container.innerHTML = `<div class="placeholder"><p class="muted">Aún no hay publicaciones.</p></div>`;
    return;
  }

  container.innerHTML = posts
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((p) => {
      const title = safeText(p.title);
      const body = safeText(p.body);
      const img = safeText(p.imageUrl);
      const meta = formatDate(p.createdAt);

      return `
        <article class="post">
          <div class="post__head">
            <div class="post__title">${escapeHtml(title)}</div>
            <div class="post__meta">${escapeHtml(meta)}</div>
          </div>
          <p class="post__body">${escapeHtml(body).replace(/\n/g, "<br/>")}</p>
          ${
            img
              ? `<img class="post__img" src="${escapeAttr(img)}" alt="Imagen publicada" loading="lazy" />`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function addPost(storageKey, post) {
  const posts = loadPosts(storageKey);
  posts.push(post);
  savePosts(storageKey, posts);
  return posts;
}

/* =========
   Home feed
   ========= */
const HOME_KEY = "ssm_home_posts_v1";
const homeFeed = document.getElementById("homeFeed");
const homeForm = document.getElementById("homePostForm");

(function seedHome() {
  const posts = loadPosts(HOME_KEY);
  if (posts.length) return;

  addPost(HOME_KEY, {
    title: "Bienvenidos a SSM",
    body: "Este es el tablón de anuncios familiar. Aquí se irán publicando noticias, fotos y recordatorios.",
    imageUrl: "",
    createdAt: nowISO(),
  });

  addPost(HOME_KEY, {
    title: "Winter Ryder 2026",
    body: "La Ryder es el sábado 10 de enero de 2026. Detalles completos en: Ryder SSM → Winter Ryder 2026.",
    imageUrl: "",
    createdAt: nowISO(),
  });
})();

renderFeed(homeFeed, loadPosts(HOME_KEY));

homeForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(homeForm);
  const title = safeText(fd.get("title"));
  const body = safeText(fd.get("body"));
  const imageUrl = safeText(fd.get("imageUrl"));

  const posts = addPost(HOME_KEY, { title, body, imageUrl, createdAt: nowISO() });
  renderFeed(homeFeed, posts);
  homeForm.reset();
});

/* =========
   Ryder feed
   ========= */
const RYDER_KEY = "ssm_ryder_posts_v1";
const ryderFeed = document.getElementById("ryderFeed");
const ryderForm = document.getElementById("ryderPostForm");

(function seedRyder() {
  const posts = loadPosts(RYDER_KEY);
  if (posts.length) return;

  addPost(RYDER_KEY, {
    title: "Winter Ryder 2026",
    body: "Recordatorio: la Ryder es el sábado 10 de enero de 2026. Ver equipos y enfrentamientos en la pestaña Winter Ryder 2026.",
    imageUrl: "",
    createdAt: nowISO(),
  });
})();

renderFeed(ryderFeed, loadPosts(RYDER_KEY));

ryderForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(ryderForm);
  const title = safeText(fd.get("title"));
  const body = safeText(fd.get("body"));
  const imageUrl = safeText(fd.get("imageUrl"));

  const posts = addPost(RYDER_KEY, { title, body, imageUrl, createdAt: nowISO() });
  renderFeed(ryderFeed, posts);
  ryderForm.reset();
});
