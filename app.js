/* =========
   Router: #/home, #/alcoholimpiadas, #/ryder, #/arbol
   ========= */

const pages = Array.from(document.querySelectorAll(".page"));
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

function setActivePage(pageKey) {
  pages.forEach((p) => p.classList.toggle("is-active", p.dataset.page === pageKey));
  mainNav?.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
}

function parseRoute() {
  const hash = window.location.hash || "#/home";
  const route = hash.replace("#/", "").trim().toLowerCase();
  const allowed = new Set(["home", "alcoholimpiadas", "ryder", "historia"]);
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

if (tabButtons.length && tabPanels.length) {
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });
  const initial = tabButtons.find((b) => b.classList.contains("is-active"))?.dataset.tab || tabButtons[0].dataset.tab;
  setActiveTab(initial);
}
/* =========
   Tabs Historia de la familia
   ========= */
const hTabButtons = Array.from(document.querySelectorAll('[data-htab]'));

function setActiveHistoryTab(tabId) {
  hTabButtons.forEach((b) => {
    const active = b.dataset.htab === tabId;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", String(active));
  });

  const panels = ["historia-intro", "historia-blason", "historia-arbol", "historia-crono", "historia-docs"];
  panels.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("is-active", id === tabId);
  });
}

if (hTabButtons.length) {
  hTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveHistoryTab(btn.dataset.htab));
  });
  const initial = hTabButtons.find((b) => b.classList.contains("is-active"))?.dataset.htab || hTabButtons[0].dataset.htab;
  setActiveHistoryTab(initial);
}

/* =========
   Utilidades comunes
   ========= */

function safeText(s) {
  return (s || "").toString().trim();
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

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function nowISO() {
  return new Date().toISOString();
}

/* =========
   Muro / Posts (Supabase compartido)
   ========= */

// 1) Config Supabase
const SUPABASE_URL = "https://aerzemnrqgzxhzxkqnfa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlcnplbW5ycWd6eGh6eGtxbmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjkxNzIsImV4cCI6MjA4MzE0NTE3Mn0.6V0vE5oVD4TewWbEQA-K5zc0I8Lw8G5g_ENKosIc4hE";

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function renderFeed(container, posts) {
  if (!container) return;

  if (!posts.length) {
    container.innerHTML = `<div class="placeholder"><p class="muted">Aún no hay publicaciones.</p></div>`;
    return;
  }

  container.innerHTML = posts
    .map((p) => {
      const title = safeText(p.title);
      const body = safeText(p.body);
      const img = safeText(p.image_url || "");
      const meta = formatDate(p.created_at || nowISO());

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

function setFormMessage(formEl, msg, type = "muted") {
  if (!formEl) return;
  let el = formEl.querySelector(".form-msg");
  if (!el) {
    el = document.createElement("p");
    el.className = "tiny form-msg muted";
    formEl.appendChild(el);
  }
  el.classList.remove("muted", "error");
  el.classList.add(type);
  el.textContent = msg;
}

async function loadPosts(scope) {
  const { data, error } = await supa
    .from("posts")
    .select("id, created_at, scope, title, body, image_url")
    .eq("scope", scope)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

async function createPostWithKey({ familyKey, scope, title, body, imageUrl }) {
  const { data, error } = await supa.rpc("create_post_with_key", {
    p_key: familyKey,
    p_scope: scope,
    p_title: title,
    p_body: body,
    p_image_url: imageUrl || null,
  });

  if (error) throw error;
  return data;
}

/* =========
   Home feed (Supabase)
   ========= */
const homeFeed = document.getElementById("homeFeed");
const homeForm = document.getElementById("homePostForm");

async function refreshHome() {
  try {
    const posts = await loadPosts("home");
    renderFeed(homeFeed, posts);
  } catch (e) {
    console.error("Error cargando home posts:", e);
    renderFeed(homeFeed, []);
  }
}

homeForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(homeForm);
  const title = safeText(fd.get("title"));
  const body = safeText(fd.get("body"));
  const imageUrl = safeText(fd.get("imageUrl"));
  const familyKey = safeText(fd.get("familyKey"));

  if (!familyKey) {
    setFormMessage(homeForm, "Introduce la clave familiar.", "error");
    return;
  }

  try {
    setFormMessage(homeForm, "Publicando…", "muted");
    await createPostWithKey({ familyKey, scope: "home", title, body, imageUrl });
    homeForm.reset();
    setFormMessage(homeForm, "Publicado.", "muted");
    await refreshHome();
  } catch (err) {
    console.error("Error publicando home:", err);
    setFormMessage(homeForm, "Clave incorrecta o error de conexión.", "error");
  }
});

/* =========
   Ryder feed (Supabase)
   ========= */
const ryderFeed = document.getElementById("ryderFeed");
const ryderForm = document.getElementById("ryderPostForm");

async function refreshRyder() {
  try {
    const posts = await loadPosts("ryder");
    renderFeed(ryderFeed, posts);
  } catch (e) {
    console.error("Error cargando ryder posts:", e);
    renderFeed(ryderFeed, []);
  }
}

ryderForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(ryderForm);
  const title = safeText(fd.get("title"));
  const body = safeText(fd.get("body"));
  const imageUrl = safeText(fd.get("imageUrl"));
  const familyKey = safeText(fd.get("familyKey"));

  if (!familyKey) {
    setFormMessage(ryderForm, "Introduce la clave familiar.", "error");
    return;
  }

  try {
    setFormMessage(ryderForm, "Publicando…", "muted");
    await createPostWithKey({ familyKey, scope: "ryder", title, body, imageUrl });
    ryderForm.reset();
    setFormMessage(ryderForm, "Publicado.", "muted");
    await refreshRyder();
  } catch (err) {
    console.error("Error publicando ryder:", err);
    setFormMessage(ryderForm, "Clave incorrecta o error de conexión.", "error");
  }
});

// Cargar feeds al iniciar
refreshHome();
refreshRyder();

/* =========
   Clasificación general (tabla) - sigue en local por ahora
   ========= */

function loadJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Jugadores en la clasificación (incluye quienes no juegan en Winter 2026)
 */
const PLAYERS = [
  "Rafa",
  "Juanito",
  "Borja",
  "Larkin",
  "Jimmy",
  "Tomás",
  "Gonzalo",
  "Fesser",
  "Peri",
  "Sebas",
  "Richi",
  "Chono",
  "James",
  "Alfon",
  "Blanca",
  "Teresa Zubiria",
  "Asís",
];

/**
 * Datos futuros (por ahora vacíos):
 * - matches: resultados de partidos (por Ryder)
 * - ryderWinners: ganador por edición
 *
 * Más adelante lo pasaremos a Supabase también.
 */
const MATCHES_KEY = "ssm_matches_v1";
const RYDER_WINNERS_KEY = "ssm_ryder_winners_v1";

const standingsBody = document.getElementById("standingsBody");

function initStandingsState() {
  const matches = loadJSON(MATCHES_KEY, []);
  const winners = loadJSON(RYDER_WINNERS_KEY, {});
  if (!localStorage.getItem(MATCHES_KEY)) saveJSON(MATCHES_KEY, matches);
  if (!localStorage.getItem(RYDER_WINNERS_KEY)) saveJSON(RYDER_WINNERS_KEY, winners);
}

function computeStandings(players, matches, ryderWinners) {
  const base = new Map(
    players.map((name) => [
      name,
      {
        player: name,
        wins: 0,
        ties: 0,
        losses: 0,
        played: 0,
        rydersWon: 0,
        rydersPlayed: 0,
        points: 0,
        scratchCount: 0,
        scratchSum: 0,
        scratchBest: null,
        scratchWorst: null,
      },
    ])
  );

  for (const m of matches) {
    const a = base.get(m.a);
    const b = base.get(m.b);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;

    const pA = typeof m.pointsA === "number" ? m.pointsA : (m.result === "A" ? 1 : m.result === "T" ? 0.5 : 0);
    const pB = typeof m.pointsB === "number" ? m.pointsB : (m.result === "B" ? 1 : m.result === "T" ? 0.5 : 0);

    a.points += pA;
    b.points += pB;

    if (m.result === "A") {
      a.wins += 1;
      b.losses += 1;
    } else if (m.result === "B") {
      b.wins += 1;
      a.losses += 1;
    } else {
      a.ties += 1;
      b.ties += 1;
    }

    if (typeof m.scratchA === "number") {
      a.scratchCount += 1;
      a.scratchSum += m.scratchA;
      a.scratchBest = a.scratchBest === null ? m.scratchA : Math.min(a.scratchBest, m.scratchA);
      a.scratchWorst = a.scratchWorst === null ? m.scratchA : Math.max(a.scratchWorst, m.scratchA);
    }
    if (typeof m.scratchB === "number") {
      b.scratchCount += 1;
      b.scratchSum += m.scratchB;
      b.scratchBest = b.scratchBest === null ? m.scratchB : Math.min(b.scratchBest, m.scratchB);
      b.scratchWorst = b.scratchWorst === null ? m.scratchB : Math.max(b.scratchWorst, m.scratchB);
    }
  }

  for (const [ryderId, info] of Object.entries(ryderWinners || {})) {
    if (!info || !info.participants || !info.winnerTeam) continue;
    for (const [playerName, team] of Object.entries(info.participants)) {
      const row = base.get(playerName);
      if (!row) continue;
      row.rydersPlayed += 1;
      if (team === info.winnerTeam) row.rydersWon += 1;
    }
  }

  const rows = Array.from(base.values());

  rows.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (y.rydersWon !== x.rydersWon) return y.rydersWon - x.rydersWon;
    return x.player.localeCompare(y.player, "es");
  });

  rows.forEach((r, idx) => (r.pos = idx + 1));
  return rows;
}

function fmtDash(n) {
  return n === 0 ? "—" : String(n);
}

function fmtPoints(n, played) {
  if (!played) return "—";
  return Number.isFinite(n) ? (Math.round(n * 100) / 100).toString() : "—";
}

function fmtPointsPerMatch(points, played) {
  if (!played) return "—";
  const v = points / played;
  return Number.isFinite(v) ? (Math.round(v * 100) / 100).toString() : "—";
}

function fmtScratch(row) {
  if (!row.scratchCount) return "— | — | —";
  const avg = row.scratchSum / row.scratchCount;
  const a = Math.round(avg * 10) / 10;
  return `${a} | ${row.scratchBest} | ${row.scratchWorst}`;
}

function renderStandingsTable() {
  const body = document.getElementById("standingsBody");
  if (!body) {
    console.warn("No se encuentra #standingsBody. Revisa el id en index.html.");
    return;
  }

  const matches = loadJSON(MATCHES_KEY, []);
  const winners = loadJSON(RYDER_WINNERS_KEY, {});
  const rows = computeStandings(PLAYERS, matches, winners);

  // Si por lo que sea rows viene vacío (no debería), al menos pinta todos los jugadores
  const rowsSafe = rows.length
    ? rows
    : PLAYERS.map((name, i) => ({
        pos: i + 1,
        player: name,
        wins: 0,
        ties: 0,
        losses: 0,
        played: 0,
        rydersWon: 0,
        rydersPlayed: 0,
        points: 0,
        scratchCount: 0,
        scratchSum: 0,
        scratchBest: null,
        scratchWorst: null,
      }));

  body.innerHTML = rowsSafe
    .map((r) => {
      return `
        <tr>
          <td>${r.pos}</td>
          <td><strong>${escapeHtml(r.player)}</strong></td>
          <td>${fmtDash(r.wins)}</td>
          <td>${fmtDash(r.ties)}</td>
          <td>${fmtDash(r.losses)}</td>
          <td>${fmtDash(r.played)}</td>
          <td>${fmtDash(r.rydersWon)}</td>
          <td>${fmtDash(r.rydersPlayed)}</td>
          <td>${fmtPoints(r.points, r.played)}</td>
          <td>${fmtPointsPerMatch(r.points, r.played)}</td>
          <td>${escapeHtml(fmtScratch(r))}</td>
        </tr>
      `;
    })
    .join("");
}
initStandingsState();
renderStandingsTable();

// ===== Tabs: Historia de la familia (data-htab) =====
(function () {
  const tabsWrap = document.querySelector(".tabs--historia");
  if (!tabsWrap) return;

  const buttons = Array.from(tabsWrap.querySelectorAll(".tab[data-htab]"));

  function activate(panelId) {
    // Botones
    buttons.forEach((b) => {
      const on = b.getAttribute("data-htab") === panelId;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });

    // Paneles (solo dentro de la página Historia)
    const historiaPage = document.querySelector('.page[data-page="historia"]');
    if (!historiaPage) return;

    const panels = Array.from(historiaPage.querySelectorAll(".tab-panel"));
    panels.forEach((p) => p.classList.remove("is-active"));

    const target = historiaPage.querySelector(`#${panelId}`);
    if (target) target.classList.add("is-active");
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => activate(btn.getAttribute("data-htab")));
  });

  // Estado inicial: si no hay ninguno activo, activa el Resumen
  const initial = buttons.find((b) => b.classList.contains("is-active"))?.getAttribute("data-htab") || "historia-intro";
  activate(initial);
})();
