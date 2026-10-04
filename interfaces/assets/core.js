/* ==========================================================================
   Núcleo del prototipo: acceso a datos, helpers de render, modo "Ver modelo"
   ========================================================================== */

/* ------------------------------------------------------------ acceso a datos */
const byId = (col) => Object.fromEntries(DB[col].map((d) => [d._id, d]));
const MEDIA = byId("media");
const PEOPLE = byId("people");
const GENRES = byId("genres");
const ME = DB.users.find((u) => u._id === DB.currentUserId);
const params = new URLSearchParams(location.search);

/* ----------------------------------------------------------------- formato */
const nf = new Intl.NumberFormat("es-AR");
const df = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });
const fmtDate = (iso) => df.format(new Date(iso));
const fmtRuntime = (min) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const initials = (name) => {
  const words = name.split(/[\s._-]+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const caps = name.match(/[A-ZÁÉÍÓÚÑ]/g) ?? []; // "CineFan88" -> "CF"
  return (caps.length > 1 ? caps.slice(0, 2).join("") : name.slice(0, 2)).toUpperCase();
};
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const hue = (s) => hash(s) % 360;

function mediaMeta(m) {
  const parts = [m.release_year];
  if (m.type === "movie") parts.push(fmtRuntime(m.runtime_min));
  else parts.push(`${m.seasons.length} ${m.seasons.length === 1 ? "temporada" : "temporadas"}`);
  return parts;
}
const typeLabel = (m) => (m.type === "movie" ? "Película" : "Serie");

/* --------------------------------------------------- arte generado (mockup) */
// [color 1, color 2, motivo, tipografía]. Solo existe para dibujar el prototipo:
// en la base, media.poster / media.backdrop guardan la ruta de la imagen real.
const ART = {
  1: ["#3a6ea5", "#c9a227", "grid", "display"],
  2: ["#f2d49b", "#1b2a4a", "ring", "sans"],
  3: ["#ff6a3d", "#1a2130", "lines", "display"],
  4: ["#c58b5a", "#3b2a4a", "orb", "serif"],
  5: ["#ff3d6b", "#ffc53d", "split", "serif"],
  6: ["#ff9a3d", "#7a3b1d", "dune", "display"],
  7: ["#9fb3c8", "#2c3e50", "orb", "sans"],
  8: ["#4cc38a", "#2b2b36", "split", "sans"],
  9: ["#ff7a1a", "#2bd4e0", "dune", "display"],
  10: ["#8fb4ff", "#1b2440", "snow", "display"],
  11: ["#ffc53d", "#0f2a26", "ring", "serif"],
  12: ["#7bd88f", "#d9a441", "grid", "display"],
  13: ["#5ec2e8", "#24323a", "lines", "sans"],
  14: ["#e0b04c", "#5b1f2b", "orb", "serif"],
  15: ["#ffb23d", "#ff3d1f", "orb", "display"],
  16: ["#e8b468", "#5a3a20", "dune", "display"],
};
function artVars(m) {
  const [c1, c2, motif, font] = ART[parseInt(m._id.slice(-4), 10)];
  return { style: `--c1:${c1};--c2:${c2}`, motif, font };
}
function poster(m, size = "") {
  const a = artVars(m);
  return `<div class="poster art ${size}" style="${a.style}" data-motif="${a.motif}" data-font="${a.font}" role="img" aria-label="Póster de ${esc(m.title)}">
    <div class="poster-title">${esc(m.title)}</div>
    ${size === "sm" ? "" : `<div class="poster-year">${m.release_year}</div>`}
  </div>`;
}
function backdrop(m, cls = "hero-bg") {
  const a = artVars(m);
  return `<div class="${cls} art" style="${a.style};--x1:75%;--y1:25%;--x2:20%;--y2:90%" data-motif="${a.motif}"></div>`;
}
function portrait(name, extra = "") {
  const h = hue(name);
  return `<div class="portrait" style="background:radial-gradient(circle at 30% 25%, hsl(${h} 60% 62%), hsl(${(h + 40) % 360} 55% 28%) 75%);${extra}">${initials(name)}</div>`;
}
function avatar(username, size) {
  const h = hue(username);
  const s = size ? `width:${size}px;height:${size}px;font-size:${size * 0.38}px;` : "";
  return `<div class="avatar" style="${s}background:hsl(${h} 75% 68%)">${initials(username)}</div>`;
}
const stars = (v) => `<span class="score">★ ${v.toFixed(1)}</span>`;
const genreChip = (slug) => {
  const g = GENRES[slug];
  return `<a class="chip" href="genero.html?id=${g._id}" style="--g:${g.color}">${esc(g.name)}</a>`;
};
function mediaCard(m, { sub } = {}) {
  return `<a class="card" href="detalle.html?id=${m._id}">
    ${poster(m)}
    <div class="card-info">
      <div class="card-title">${esc(m.title)}</div>
      <div class="card-meta">${stars(m.rating.avg)}<span>${sub ?? `${m.release_year} · ${typeLabel(m)}`}</span></div>
    </div>
  </a>`;
}

/* --------------------------------------------------------------- iconos */
const ICON = {
  play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5" stroke-linecap="round"/></svg>',
  search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  pen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

/* -------------------------------------------------------------------- nav */
function renderNav(active) {
  const link = (href, label, key) => `<a href="${href}" class="${active === key ? "active" : ""}">${label}</a>`;
  document.getElementById("nav").innerHTML = `
    <nav class="nav" id="navbar">
      <a class="brand" href="index.html"><span class="brand-mark"></span>FOTOGRAMA</a>
      <div class="nav-links">
        ${link("index.html", "Inicio", "home")}
        ${link("genero.html?type=movie", "Películas", "movie")}
        ${link("genero.html?type=series", "Series", "series")}
        ${link("perfil.html", "Mi lista", "profile")}
      </div>
      <div class="nav-right">
        <label class="search" ${ann({ col: "media", title: "Barra de búsqueda", short: 'find({ $text: { $search: "…" } })',
          q: `db.media.find(
  { $text: { $search: "eternauta" } },
  { score: { $meta: "textScore" }, title: 1, poster: 1, release_year: 1 }
).sort({ score: { $meta: "textScore" } }).limit(8)`,
          why: "Búsqueda por título usando el índice de texto sobre title y original_title. Se proyectan solo los campos que muestra el desplegable de resultados.",
          docs: () => [] }).attr}>
          ${ICON.search}<input placeholder="Títulos, personas, géneros" aria-label="Buscar">
        </label>
        <a class="nav-avatar" href="perfil.html" aria-label="Mi perfil">${avatar(ME.username, 30)}</a>
      </div>
    </nav>`;
  const bar = document.getElementById("navbar");
  const onScroll = () => bar.classList.toggle("solid", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ------------------------------------------------------ modo "Ver modelo" */
// Cada sección de la interfaz se registra con la colección y la consulta
// que la alimenta. Al activar el modo se ve el contorno + la consulta;
// al hacer click se abre un panel con la consulta completa y documentos de ejemplo.
const ANN = [];
function ann(spec) {
  const i = ANN.push(spec) - 1;
  return { attr: `data-col="${[].concat(spec.col)[0]}" data-ann="${i}"` };
}
// Inserta la etiqueta (colección + consulta) dentro de cada elemento anotado.
// Se vuelve a llamar después de re-renderizar una parte de la página.
function decorate(root = document) {
  root.querySelectorAll("[data-ann]").forEach((el) => {
    if (el.querySelector(":scope > .q-tag")) return;
    const spec = ANN[el.dataset.ann];
    el.insertAdjacentHTML("afterbegin",
      `<button class="q-tag" data-open="${el.dataset.ann}" type="button"><b>${[].concat(spec.col).join(" + ")}</b><span>${esc(spec.short)}</span></button>`);
  });
}

function highlightQuery(src) {
  return esc(src).replace(
    /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\$[a-zA-Z]+)|\b(ObjectId|ISODate|db)\b|(\b\d+(?:\.\d+)?\b)/gm,
    (m, c, s, op, fn, n) => (c ? `<span class="c">${c}</span>` : s ? `<span class="s">${s}</span>` : op ? `<span class="k">${op}</span>` : fn ? `<span class="f">${fn}</span>` : `<span class="n">${n}</span>`)
  );
}

// Muestra un documento como lo imprimiría mongosh
function shell(v, ind = "") {
  const pad = ind + "  ";
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    const simple = v.every((x) => typeof x !== "object" || x === null);
    const items = v.map((x) => shell(x, pad));
    return simple && items.join(", ").length < 70 ? `[ ${items.join(", ")} ]` : `[\n${items.map((x) => pad + x).join(",\n")}\n${ind}]`;
  }
  if (v && typeof v === "object") {
    const entries = Object.entries(v).map(([k, x]) => `${pad}<span class="k">${k}</span>: ${shell(x, pad)}`);
    return `{\n${entries.join(",\n")}\n${ind}}`;
  }
  if (typeof v === "string") {
    if (/^[0-9a-f]{24}$/.test(v)) return `<span class="f">ObjectId</span>(<span class="s">"${v}"</span>)`;
    if (/^\d{4}-\d\d-\d\dT/.test(v)) return `<span class="f">ISODate</span>(<span class="s">"${v}"</span>)`;
    return `<span class="s">"${esc(v)}"</span>`;
  }
  return `<span class="n">${v}</span>`;
}

function openDrawer(i) {
  const spec = ANN[i];
  const cols = [].concat(spec.col);
  const docs = spec.docs ? spec.docs() : [];
  const shown = docs.slice(0, spec.maxDocs ?? 2);
  document.getElementById("drawer-title").textContent = spec.title;
  document.getElementById("drawer-body").innerHTML = `
    <div>${cols.map((c) => `<span class="col-pill" data-col="${c}" style="outline:none">${c}</span>`).join(" ")}</div>
    ${spec.why ? `<p class="why">${spec.why}</p>` : ""}
    <div><div class="label">Consulta</div><pre class="code">${highlightQuery(spec.q)}</pre></div>
    ${shown.length ? `<div><div class="label">${spec.docsLabel ?? "Documento de ejemplo"}</div><pre class="code">${shown.map((d) => shell(d)).join("\n\n")}${docs.length > shown.length ? `\n\n<span class="c">// … y ${docs.length - shown.length} documentos más</span>` : ""}</pre></div>` : ""}`;
  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawer-backdrop").classList.add("open");
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawer-backdrop").classList.remove("open");
}

function setupModelMode() {
  document.body.insertAdjacentHTML("beforeend", `
    <button class="model-toggle" id="model-toggle" type="button" aria-pressed="false"><span class="sw"></span>Ver modelo de datos</button>
    <aside class="drawer" id="drawer" aria-label="Detalle de la consulta">
      <header><h3 id="drawer-title"></h3><button type="button" id="drawer-close" aria-label="Cerrar">×</button></header>
      <div class="body" id="drawer-body"></div>
    </aside>
    <div class="drawer-backdrop" id="drawer-backdrop"></div>`);

  decorate();

  const toggle = document.getElementById("model-toggle");
  const set = (on) => {
    document.body.classList.toggle("model", on);
    toggle.setAttribute("aria-pressed", on);
    try { localStorage.setItem("fotograma-model", on ? "1" : "0"); } catch (e) { /* sin storage */ }
  };
  toggle.onclick = () => set(!document.body.classList.contains("model"));
  try { set(localStorage.getItem("fotograma-model") === "1"); } catch (e) { set(false); }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open]");
    if (t) { e.preventDefault(); e.stopPropagation(); openDrawer(+t.dataset.open); }
  }, true);
  document.getElementById("drawer-close").onclick = closeDrawer;
  document.getElementById("drawer-backdrop").onclick = closeDrawer;
  addEventListener("keydown", (e) => e.key === "Escape" && closeDrawer());
}
/* -------------------------------------------------------------- arranque */
function boot(active, render) {
  renderNav(active);
  render(document.getElementById("app"));
  setupModelMode();
}
