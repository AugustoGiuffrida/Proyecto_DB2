// =============================================================================
// 02 · Carga masiva de datos generados
//
// Genera datos ficticios pero coherentes, en volumen suficiente para medir
// el impacto de los índices:
//   people  ->  media (referencia a people y genres)
//   users   (watchlist referencia a media)
//   reviews (referencia a media y users, una por par usuario-título)
//   views   (serie temporal de reproducciones de los últimos N días)
//
// Las cantidades se configuran en db/config.js. El generador usa una semilla
// fija: dos corridas producen los mismos datos (solo cambian los _id).
//
// Requiere haber corrido antes 00_crear_db.js y 01_datos_semilla.js.
// Uso:  mongosh db/02_datos_masivos.js
// =============================================================================

if (typeof CONFIG === "undefined") load(__dirname + "/config.js");
if (typeof titulo === "undefined") load(__dirname + "/lib/utilidades.js");

// Bloque propio: setup.js carga todos los scripts en el mismo contexto y así
// las constantes de un script no chocan con las de otro.
{

db = db.getSiblingDB(CONFIG.dbName);
const N = CONFIG.cantidades;
const HOY = CONFIG.hoy;
const azar = crearAzar(CONFIG.semilla);
const DIA = 24 * 3600 * 1000;
const fmt = (n) => n.toLocaleString("es-AR");

titulo("Carga masiva");

// =============================================================================
// Listas de palabras para generar textos
// =============================================================================
const NOMBRES = ["Sofía", "Mateo", "Valentina", "Santiago", "Martina", "Benjamín", "Catalina", "Joaquín", "Lucía", "Tomás",
  "Camila", "Lautaro", "Julieta", "Thiago", "Agustina", "Facundo", "Florencia", "Nicolás", "Micaela", "Franco",
  "Carolina", "Ignacio", "Victoria", "Bruno", "Paula", "Gonzalo", "Antonella", "Federico", "Rocío", "Matías",
  "Elena", "Diego", "Clara", "Pablo", "Inés", "Andrés", "Lara", "Martín", "Emma", "Javier",
  "Ana", "Marcos", "Laura", "Hernán", "Natalia", "Sebastián", "Mariana", "Emiliano", "Daniela", "Rodrigo",
  "Akira", "Yuki", "Hans", "Greta", "Liam", "Olivia", "Noah", "Chloe", "Luca", "Giulia",
  "Pierre", "Amélie", "Jonas", "Ingrid", "Omar", "Leila", "Ravi", "Priya", "Min-jun", "Seo-yeon"];
const APELLIDOS = ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "García", "Sánchez",
  "Romero", "Sosa", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez", "Medina",
  "Herrera", "Suárez", "Aguirre", "Giménez", "Molina", "Castro", "Ortiz", "Silva", "Núñez", "Luna",
  "Rojas", "Morales", "Ríos", "Cabrera", "Domínguez", "Vega", "Peralta", "Ferreyra", "Godoy", "Paz",
  "Quiroga", "Ledesma", "Mansilla", "Ponce", "Videla", "Aráoz", "Lucero", "Ibáñez", "Correa", "Bustos",
  "Tanaka", "Weber", "Rossi", "Dubois", "Novak", "Larsen", "Kim", "Park", "Singh", "Haddad",
  "Smith", "Walker", "Moreau", "Bianchi", "Schmidt", "Andersen", "O'Brien", "Kowalski", "Costa", "Ferrari"];
const PAISES = azar.ponderado(
  ["Argentina", "Estados Unidos", "España", "México", "Reino Unido", "Francia", "Chile", "Corea del Sur", "Alemania", "Japón", "Italia", "Uruguay", "Brasil", "Canadá"],
  [30, 20, 9, 7, 6, 5, 4, 4, 4, 3, 3, 2, 2, 1]);
const PAISES_USUARIOS = azar.ponderado(
  ["Argentina", "Chile", "Uruguay", "México", "España", "Colombia", "Perú", "Paraguay"],
  [55, 10, 8, 9, 7, 6, 3, 2]);

// Sustantivos con género gramatical para que los títulos concuerden
const SUST_M = ["silencio", "invierno", "camino", "secreto", "regreso", "eco", "viaje", "pacto", "refugio", "horizonte",
  "juego", "laberinto", "espejo", "río", "desierto", "faro", "reino", "código", "abismo", "círculo",
  "umbral", "archivo", "legado", "tiempo", "sueño", "enigma", "invitado", "testigo", "mapa", "jardín"];
const SUST_F = ["noche", "ciudad", "frontera", "herida", "sombra", "casa", "isla", "promesa", "marea", "huella",
  "memoria", "tormenta", "ruta", "señal", "llave", "distancia", "estación", "máscara", "raíz", "grieta",
  "partida", "fuga", "verdad", "mentira", "carta", "costa", "deuda", "guerra", "luz", "colmena"];
const ADJ = [["oscuro", "oscura"], ["eterno", "eterna"], ["perdido", "perdida"], ["silencioso", "silenciosa"], ["roto", "rota"],
  ["infinito", "infinita"], ["olvidado", "olvidada"], ["salvaje", "salvaje"], ["invisible", "invisible"], ["rojo", "roja"],
  ["helado", "helada"], ["prohibido", "prohibida"], ["lejano", "lejana"], ["final", "final"], ["dorado", "dorada"],
  ["profundo", "profunda"], ["ajeno", "ajena"], ["blanco", "blanca"], ["dormido", "dormida"], ["quieto", "quieta"]];
const PRE = [["último", "última"], ["otro", "otra"], ["primer", "primera"], ["nuevo", "nueva"], ["gran", "gran"]];
const LUGARES = ["Mendoza", "Buenos Aires", "Valparaíso", "Montevideo", "Lisboa", "Berlín", "Tokio", "Marte", "Ushuaia",
  "Córdoba", "la Patagonia", "Rosario", "Nápoles", "la Luna", "Salta", "Bariloche", "Estambul", "Oslo", "La Habana", "los Andes"];
const CLAVES = ["Cóndor", "Fénix", "Aurora", "Atlas", "Quimera", "Medianoche", "Zafiro", "Andes", "Tormenta", "Eclipse", "Orión", "Vértigo"];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sustantivo = function () {
  const fem = azar.prob(0.5);
  return { w: azar.elegir(fem ? SUST_F : SUST_M), f: fem };
}
const art = (s) => (s.f ? "La" : "El");
const generarTitulo = function () {
  const s = sustantivo();
  switch (azar.entero(1, 7)) {
    case 1: return `${art(s)} ${s.w} ${azar.elegir(ADJ)[s.f ? 1 : 0]}`;
    case 2: return `${art(s)} ${s.w} de ${azar.elegir(LUGARES)}`;
    case 3: return `${art(s)} ${azar.elegir(PRE)[s.f ? 1 : 0]} ${s.w}`;
    case 4: return `${azar.elegir(["Operación", "Proyecto", "Expediente", "Código"])} ${azar.elegir(CLAVES)}`;
    case 5: return cap(s.w);
    case 6: return `${cap(s.w)} ${azar.elegir(ADJ)[s.f ? 1 : 0]}`;
    default: return `Después de ${art(s).toLowerCase()} ${s.w}`;
  }
}

const PERSONAJES = ["Una detective retirada", "Un joven músico", "Dos hermanas", "Un grupo de científicos", "Una familia de inmigrantes",
  "Un ex boxeador", "Una periodista", "Un piloto de carreras", "Una astronauta", "Un profesor de historia",
  "Tres amigos de la infancia", "Una abogada", "Un ladrón de guante blanco", "Una médica rural", "Un adolescente solitario"];
const CONTEXTOS = ["en un pueblo de montaña", "en el Buenos Aires de los años 70", "en una estación espacial", "en una ciudad costera",
  "durante una tormenta que no termina", "en la frontera entre dos países", "en un futuro cercano", "en una isla aislada",
  "en plena crisis económica", "en un hotel abandonado", "en una ciudad que nunca duerme", "en un viñedo de Mendoza"];
const ACCIONES = ["descubre un secreto que cambia su vida", "intenta resolver una desaparición", "debe enfrentar su pasado",
  "busca venganza", "recibe una herencia inesperada", "no puede escapar de un ciclo que se repite", "planea el golpe perfecto",
  "se enamora de la persona equivocada", "encuentra una señal que nadie puede explicar", "tiene una última oportunidad de redimirse"];
const CIERRES = ["Nada volverá a ser como antes.", "Pero no todos dicen la verdad.", "El tiempo se acaba.",
  "Y el precio puede ser demasiado alto.", "Lo que encuentra lo cambia todo.", "Nadie sale igual de esa experiencia."];
const generarSinopsis = () => `${azar.elegir(PERSONAJES)} ${azar.elegir(CONTEXTOS)} ${azar.elegir(ACCIONES)}. ${azar.elegir(CIERRES)}`;

const RESENA = {
  alta: ["Excelente de principio a fin.", "Una obra maestra, la volvería a ver mañana.", "Las actuaciones son impresionantes.",
    "Me atrapó desde el primer minuto.", "La fotografía es una belleza.", "De lo mejor que vi este año.", "El final me dejó sin palabras."],
  media: ["Entretenida, aunque se hace un poco larga.", "Buena idea, pero le falta desarrollo.", "Tiene momentos muy buenos y otros flojos.",
    "Cumple, sin sorprender.", "Las actuaciones sostienen una historia previsible.", "Para pasar el rato está bien."],
  baja: ["No me terminó de convencer.", "Muy lenta y sin rumbo.", "Esperaba mucho más.", "El guion tiene demasiados agujeros.",
    "La abandoné a la mitad.", "Ni las actuaciones la salvan."],
};
const comentario = function (rating) {
  const banda = rating >= 8 ? "alta" : rating >= 5 ? "media" : "baja";
  return azar.varios(RESENA[banda], azar.entero(1, 2)).join(" ");
}

// =============================================================================
// Datos existentes (semilla) que se reutilizan
// =============================================================================
const GENEROS = db.genres.find({}, { _id: 1 }).toArray().map((g) => g._id);
const pesoGenero = { drama: 10, comedia: 8, accion: 8, thriller: 7, crimen: 5, "ciencia-ficcion": 5, aventura: 5, misterio: 4, romance: 4, terror: 4, animacion: 2, documental: 2 };
const elegirGenero = azar.ponderado(GENEROS, GENEROS.map((g) => pesoGenero[g] ?? 3));

// =============================================================================
// 1. people
// =============================================================================
let t = cronometro();
// Las personas semilla (reales) solo aparecen en sus títulos reales: los títulos
// generados usan únicamente personas generadas.
const actores = [];
const directores = [];

const r1 = insertarEnLotes(db.people, N.people, () => {
  const name = `${azar.elegir(NOMBRES)} ${azar.elegir(APELLIDOS)}`;
  const esDirector = azar.prob(0.15);
  const doc = {
    _id: new ObjectId(),
    name,
    known_for: esDirector ? "Dirección" : "Actuación",
    birth_date: azar.fecha(new Date("1935-01-01"), new Date("2006-12-31")),
    country: PAISES(),
    bio: `${esDirector ? "Director" : "Intérprete"} con una carrera que combina cine y televisión. ${azar.elegir(["Conocido por sus personajes intensos.", "Ganó varios premios en festivales internacionales.", "Debutó muy joven en el teatro independiente.", "Trabaja tanto en producciones nacionales como extranjeras."])}`,
    photo: `people/${slug(name)}.jpg`,
  };
  (esDirector ? directores : actores).push({ person_id: doc._id, name });
  return doc;
});
paso(`people: ${fmt(r1.insertados)} en ${t()}`);

// Algunas personas trabajan mucho más que otras (distribución de Zipf)
const zipf = (n, s) => Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, s));
const elegirActor = azar.ponderado(actores, zipf(actores.length, 0.3));
const elegirDirector = azar.ponderado(directores, zipf(directores.length, 0.3));

// =============================================================================
// 2. media
// =============================================================================
t = cronometro();
// Información en memoria de cada título para generar reseñas y vistas
const titulos = db.media.find({}, { type: 1, runtime_min: 1, seasons: 1, created_at: 1, rating: 1 }).toArray().map((m) => ({
  _id: m._id, type: m.type, runtime: m.runtime_min, created_at: m.created_at,
  temporadas: m.seasons ? m.seasons.map((s) => s.episodes.map((e) => e.runtime_min)) : null,
  calidad: m.rating.avg, semilla: true,
}));

const r2 = insertarEnLotes(db.media, N.media, () => {
  const type = azar.prob(0.7) ? "movie" : "series";
  const created_at = azar.fecha(new Date("2023-01-01"), new Date(HOY.getTime() - DIA));
  const maxAnio = created_at.getUTCFullYear();
  const release_year = azar.prob(0.7) ? azar.entero(2000, maxAnio) : azar.entero(type === "series" ? 1990 : 1960, 1999);
  const genre_ids = [elegirGenero()];
  while (genre_ids.length < azar.entero(1, 3)) { const g = elegirGenero(); if (!genre_ids.includes(g)) genre_ids.push(g); }
  const title = generarTitulo() + (azar.prob(0.04) ? azar.elegir([" II", " III", ": el regreso"]) : "");

  const reparto = new Map();
  const cantReparto = azar.entero(2, 8);
  while (reparto.size < cantReparto) { const a = elegirActor(); reparto.set(a.person_id.toHexString(), a); }
  const dirs = new Map();
  const cantDirs = azar.prob(0.1) ? 2 : 1;
  while (dirs.size < cantDirs) { const d = elegirDirector(); dirs.set(d.person_id.toHexString(), d); }

  const doc = {
    _id: new ObjectId(),
    title,
    type,
    release_year,
    plot: generarSinopsis(),
    poster: `posters/${slug(title)}.jpg`,
    backdrop: `backdrops/${slug(title)}.jpg`,
    genre_ids,
    rating: { avg: 0, count: 0 },          // se calcula en 03_ratings.js
    is_featured: false,
    created_at,
    directors: [...dirs.values()],
    cast: [...reparto.values()].map((a) => ({ ...a, character: `${azar.elegir(NOMBRES)} ${azar.elegir(APELLIDOS)}` })),
  };

  if (type === "movie") {
    doc.runtime_min = azar.entero(80, 175);
  } else {
    const corta = genre_ids.includes("comedia") || genre_ids.includes("animacion");
    const duracion = corta ? azar.entero(22, 30) : azar.entero(40, 62);
    const cantTemporadas = Math.min(maxAnio - release_year + 1, azar.elegir([1, 1, 1, 2, 2, 3, 4, 5, 6]));
    doc.seasons = Array.from({ length: cantTemporadas }, (_, i) => ({
      number: i + 1,
      year: release_year + i,
      episodes: Array.from({ length: azar.entero(6, 12) }, (_, j) => ({
        number: j + 1,
        title: generarTitulo(),
        runtime_min: duracion + azar.entero(-3, 3),
      })),
    }));
  }

  titulos.push({
    _id: doc._id, type, runtime: doc.runtime_min, created_at,
    temporadas: doc.seasons ? doc.seasons.map((s) => s.episodes.map((e) => e.runtime_min)) : null,
    calidad: Math.max(2, Math.min(9.6, azar.normal(6.8, 1.2))),
  });
  return doc;
});
paso(`media: ${fmt(r2.insertados)} en ${t()}`);

// Popularidad: Zipf sobre un orden aleatorio. Los títulos semilla se ubican
// entre los más populares para que aparezcan en tendencias y rankings.
const orden = azar.varios(titulos.filter((x) => !x.semilla), titulos.length);
const ordenPopularidad = [...titulos.filter((x) => x.semilla), ...orden];
const pesosPop = zipf(ordenPopularidad.length, 0.9);
const elegirTitulo = azar.ponderado(ordenPopularidad, pesosPop);
// Para las vistas pesan también los estrenos recientes en el catálogo
const pesosVistas = ordenPopularidad.map((m, i) => {
  const dias = (HOY - m.created_at) / DIA;
  return pesosPop[i] * (dias < 60 ? 4 : dias < 180 ? 2 : 1);
});
const elegirTituloVista = azar.ponderado(ordenPopularidad, pesosVistas);

// =============================================================================
// 3. users
// =============================================================================
t = cronometro();
const usuarios = db.users.find({}, { username: 1, avatar: 1, created_at: 1 }).toArray()
  .map((u) => ({ _id: u._id, username: u.username, avatar: u.avatar, created_at: u.created_at }));
const usados = new Set(usuarios.map((u) => u.username.toLowerCase()));
const caracteresHash = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const r3 = insertarEnLotes(db.users, N.users, () => {
  const nombre = slug(azar.elegir(NOMBRES)).replace(/-/g, "");
  const apellido = slug(azar.elegir(APELLIDOS)).replace(/-/g, "");
  let username = azar.elegir([`${nombre}.${apellido}`, `${nombre}_${apellido}`, `${nombre}${apellido.slice(0, 3)}`, `${apellido}.${nombre}`]);
  if (azar.prob(0.5)) username += azar.entero(1, 99);
  while (usados.has(username)) username += azar.entero(0, 9);
  usados.add(username);

  const created_at = azar.fecha(new Date("2020-01-01"), new Date(HOY.getTime() - DIA));
  const billing = azar.prob(0.7) ? "mensual" : "anual";
  const email = `${username}@${azar.elegir(["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "mail.com"])}`;
  const metodos = [];
  for (let i = 0, cant = azar.prob(0.8) ? 1 : 2; i < cant; i++) {
    const tipo = azar.ponderado(["card", "mercadopago", "paypal"], [6, 3, 1])();
    metodos.push(tipo === "card"
      ? { type: "card", brand: azar.elegir(["Visa", "Mastercard", "Amex"]), last4: String(azar.entero(0, 9999)).padStart(4, "0"),
          expiry: `${String(azar.entero(1, 12)).padStart(2, "0")}/${azar.entero(27, 31)}`, is_default: i === 0 }
      : { type: tipo, email, is_default: i === 0 });
  }
  const watchlist = new Map();
  const cantLista = azar.entero(0, 25);
  while (watchlist.size < cantLista) { const m = elegirTitulo(); watchlist.set(m._id.toHexString(), m._id); }
  const favoritos = [elegirGenero()];
  while (favoritos.length < azar.entero(1, 3)) { const g = elegirGenero(); if (!favoritos.includes(g)) favoritos.push(g); }

  const doc = {
    _id: new ObjectId(),
    username,
    email,
    password_hash: "$2b$12$" + Array.from({ length: 53 }, () => azar.elegir(caracteresHash.split(""))).join(""),
    avatar: `avatars/${username}.jpg`,
    birth_date: azar.fecha(new Date("1950-01-01"), new Date("2009-12-31")),
    country: PAISES_USUARIOS(),
    created_at,
    favorite_genre_ids: favoritos,
    subscription: {
      plan: azar.ponderado(["Básico", "Estándar", "Premium"], [35, 40, 25])(),
      billing,
      renewal_date: new Date(HOY.getTime() + azar.entero(1, billing === "mensual" ? 30 : 365) * DIA),
    },
    payment_methods: metodos,
    watchlist: [...watchlist.values()],
  };
  usuarios.push({ _id: doc._id, username, avatar: doc.avatar, created_at });
  return doc;
});
paso(`users: ${fmt(r3.insertados)} en ${t()}`);

// Algunos usuarios son mucho más activos que otros
const elegirUsuario = azar.ponderado(usuarios, usuarios.map(() => Math.exp(azar.normal(0, 1))));

// =============================================================================
// 4. reviews — a lo sumo una reseña por par (título, usuario)
// =============================================================================
t = cronometro();
const indiceTitulo = new Map(titulos.map((m, i) => [m._id.toHexString(), i]));
const indiceUsuario = new Map(usuarios.map((u, i) => [u._id.toHexString(), i]));
const pares = new Set();
db.reviews.find({}, { media_id: 1, user_id: 1 }).forEach((r) =>
  pares.add(indiceTitulo.get(r.media_id.toHexString()) * 1e6 + indiceUsuario.get(r.user_id.toHexString())));

const r4 = insertarEnLotes(db.reviews, N.reviews, () => {
  for (;;) {
    const m = elegirTitulo();
    const u = elegirUsuario();
    const clave = indiceTitulo.get(m._id.toHexString()) * 1e6 + indiceUsuario.get(u._id.toHexString());
    if (pares.has(clave)) continue;
    const desde = Math.max(m.created_at.getTime(), u.created_at.getTime());
    if (desde >= HOY.getTime()) continue;
    pares.add(clave);
    const rating = Math.round(Math.max(1, Math.min(10, azar.normal(m.calidad, 1.6))));
    const doc = {
      media_id: m._id,
      user_id: u._id,
      user: { username: u.username, avatar: u.avatar },
      rating,
      created_at: new Date(desde + azar.num() * (HOY.getTime() - desde)),
    };
    if (azar.prob(0.85)) doc.comment = comentario(rating);   // algunas reseñas son solo puntaje
    return doc;
  }
});
paso(`reviews: ${fmt(r4.insertados)} en ${t()}`);

// =============================================================================
// 5. views — serie temporal
// Se generan día por día y se insertan en orden cronológico, como llegarían
// en la realidad. Insertar en orden permite que MongoDB vaya completando
// los buckets abiertos en lugar de crear buckets nuevos para datos "viejos".
// =============================================================================
t = cronometro();
const hoyMs = HOY.getTime();
const primerDia = Date.UTC(HOY.getUTCFullYear(), HOY.getUTCMonth(), HOY.getUTCDate()) - (CONFIG.diasDeViews - 1) * DIA;
// Hora local (Argentina, UTC-3) con más reproducciones a la noche
const elegirHora = azar.ponderado(
  Array.from({ length: 24 }, (_, h) => h),
  [3, 2, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 3, 3, 4, 5, 6, 8, 10, 12, 11, 7]);

const generarVista = (inicioDia) => {
  for (;;) {
    const m = elegirTituloVista();
    const u = elegirUsuario();
    const ts = new Date(inicioDia + (elegirHora() + 3) * 3600000 + azar.entero(0, 59) * 60000);
    // no puede ser futura ni anterior al alta del título o del usuario
    if (ts.getTime() > hoyMs || ts < m.created_at || ts < u.created_at) continue;

    const doc = { ts, meta: { user_id: u._id }, media_id: m._id };
    let duracion = m.runtime;
    if (m.type === "series") {
      // los primeros episodios se ven más que los últimos
      const season = Math.min(m.temporadas.length, 1 + Math.floor(Math.pow(azar.num(), 1.6) * m.temporadas.length));
      const eps = m.temporadas[season - 1];
      const number = Math.min(eps.length, 1 + Math.floor(Math.pow(azar.num(), 1.3) * eps.length));
      duracion = eps[number - 1];
      doc.episode = { season, number };
    }
    const completed = azar.prob(0.6);
    doc.minutes = completed ? duracion : azar.entero(1, Math.max(1, duracion - 1));
    doc.completed = completed;
    return doc;
  }
};

let insertadas = 0;
let pendientes = [];
const porDia = Math.floor(N.views / CONFIG.diasDeViews);
for (let d = 0; d < CONFIG.diasDeViews; d++) {
  const cantidad = porDia + (d < N.views % CONFIG.diasDeViews ? 1 : 0);
  const delDia = Array.from({ length: cantidad }, () => generarVista(primerDia + d * DIA));
  delDia.sort((a, b) => a.ts - b.ts);
  pendientes.push(...delDia);
  if (pendientes.length >= CONFIG.lote || d === CONFIG.diasDeViews - 1) {
    db.views.insertMany(pendientes, { ordered: false });
    insertadas += pendientes.length;
    pendientes = [];
    print(`    views: ${fmt(insertadas)} / ${fmt(N.views)}`);
  }
}
paso(`views: ${fmt(insertadas)} en ${t()}`);
}
