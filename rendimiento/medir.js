// =============================================================================
// Medición de rendimiento: cada consulta SIN índice y CON índice
//
// Para cada caso:
//   1. se eliminan los índices de la colección (dropIndex), salvo _id
//   2. se mide la consulta con explain("executionStats")
//   3. se crea SOLO el índice que corresponde (createIndex)
//   4. se vuelve a medir
// Antes de empezar se guarda la lista de índices de cada colección con
// getIndexes(), y al terminar se vuelven a crear todos con createIndex.
//
// Además mide el costo de los índices: cuánto ocupan y cuánto encarecen
// las inserciones.
//
// Uso:  mongosh rendimiento/medir.js
// ATENCIÓN: elimina y recrea índices de la base "fotograma".
// =============================================================================

load(__dirname + "/../db/config.js");

db = db.getSiblingDB(CONFIG.dbName);

const YO = ObjectId("665f0c000000000000000001");
const ETERNAUTA = ObjectId("665f0a000000000000000010");
const DARIN = ObjectId("665f0b000000000000000010");
const haceDias = (n) => new Date(CONFIG.hoy.getTime() - n * 24 * 3600 * 1000);
const REPETICIONES = 20;

// --- Índices -----------------------------------------------------------------
// Copia de los índices de cada colección, tomada con getIndexes() antes de tocar nada
const ORIGINALES = {};
for (const c of ["media", "users", "reviews", "views"]) {
  ORIGINALES[c] = db.getCollection(c).getIndexes().filter((i) => i.name !== "_id_");
}
// Índices que no están en el modelo y se prueban para ver si convendría agregarlos
const PRUEBA = {
  views_ts: { key: { ts: -1 }, name: "views_ts" },
};
const crearDesdeCopia = function (coleccion, i) {
  const opciones = { name: i.name };
  if (i.unique) opciones.unique = true;
  db.getCollection(coleccion).createIndex(i.key, opciones);
};
const quitarIndices = function (coleccion) {
  for (const i of db.getCollection(coleccion).getIndexes()) {
    if (i.name !== "_id_") db.getCollection(coleccion).dropIndex(i.name);
  }
};
const crearIndice = function (coleccion, nombre) {
  crearDesdeCopia(coleccion, ORIGINALES[coleccion].find((i) => i.name === nombre) ?? PRUEBA[nombre]);
};
const restaurarIndices = function () {
  for (const [coleccion, indices] of Object.entries(ORIGINALES)) {
    quitarIndices(coleccion);
    for (const i of indices) crearDesdeCopia(coleccion, i);
  }
};

// --- Métricas de un explain ---------------------------------------------------
// Etapas del plan ganador, desde la primera que lee datos hasta la última
const etapas = function (plan) {
  const lista = [];
  const recorrer = (nodo) => {
    if (!nodo || typeof nodo !== "object") return;
    if (typeof nodo.stage === "string") lista.push(nodo.stage);
    for (const k of ["queryPlan", "inputStage", "inputStages", "outerStage", "innerStage"]) {
      if (Array.isArray(nodo[k])) nodo[k].forEach(recorrer); else recorrer(nodo[k]);
    }
  };
  recorrer(plan);
  return lista.reverse().join(" → ");
};
const metricas = function (ex) {
  const cursor = ex.stages?.[0]?.$cursor;               // formato de las series temporales
  const stats = ex.executionStats ?? cursor.executionStats;
  const planner = ex.queryPlanner ?? cursor.queryPlanner;
  return {
    plan: etapas(planner.winningPlan),
    docs: stats.totalDocsExamined,
    claves: stats.totalKeysExamined,
    devueltos: stats.nReturned,
    ms: stats.executionTimeMillis,
  };
};

// Ejecuta la consulta varias veces y devuelve el tiempo promedio (ms)
const promedio = function (caso) {
  caso.ejecutar();   // una ejecución previa para que los datos estén en memoria
  const t0 = Date.now();
  for (let i = 0; i < REPETICIONES; i++) caso.ejecutar();
  return (Date.now() - t0) / REPETICIONES;
};

// --- Casos -------------------------------------------------------------------
// find:      consulta(): devuelve el cursor (se usa .explain() y .toArray())
// aggregate: pipeline:   se usa explain("executionStats").aggregate(pipeline)
const CASOS = [
  { id: "1.1", nombre: "Título destacado", coleccion: "media", indice: "media_destacado",
    consulta: () => db.media.find({ is_featured: true }).limit(1) },
  { id: "1.5", nombre: "Recién agregadas", coleccion: "media", indice: "media_recientes",
    consulta: () => db.media.find({}, { title: 1 }).sort({ created_at: -1 }).limit(12) },
  { id: "1.7", nombre: "Series mejor valoradas", coleccion: "media", indice: "media_tipo_rating",
    consulta: () => db.media.find({ type: "series" }, { title: 1 }).sort({ "rating.avg": -1 }).limit(12) },
  { id: "4.2", nombre: "Películas de un género por rating", coleccion: "media", indice: "media_genero_tipo_rating",
    consulta: () => db.media.find({ genre_ids: "ciencia-ficcion", type: "movie" }, { title: 1 }).sort({ "rating.avg": -1 }).limit(24) },
  { id: "3.2", nombre: "Filmografía (cast.person_id)", coleccion: "media", indice: "media_reparto",
    consulta: () => db.media.find({ "cast.person_id": DARIN }, { title: 1 }).sort({ release_year: -1 }) },
  { id: "1.8", nombre: "Búsqueda /noche/i (contiene)", coleccion: "media", indice: "media_titulo",
    consulta: () => db.media.find({ title: /noche/i }, { title: 1 }).limit(8) },
  { id: "1.8b", nombre: "Búsqueda /^Noche/ (empieza con)", coleccion: "media", indice: "media_titulo",
    consulta: () => db.media.find({ title: /^Noche/ }, { title: 1 }).limit(8) },
  { id: "login", nombre: "Usuario por email (login)", coleccion: "users", indice: "users_email_unico",
    consulta: () => db.users.find({ email: "cinefan@email.com" }) },
  { id: "2.2", nombre: "Reseñas de un título", coleccion: "reviews", indice: "reviews_por_titulo",
    consulta: () => db.reviews.find({ media_id: ETERNAUTA }).sort({ created_at: -1 }).limit(10) },
  { id: "5.5", nombre: "Mis reseñas (+ $lookup)", coleccion: "reviews", indice: "reviews_por_usuario",
    pipeline: [
      { $match: { user_id: YO } },
      { $sort: { created_at: -1 } },
      { $lookup: { from: "media", localField: "media_id", foreignField: "_id", as: "media" } },
    ] },
  { id: "5.3", nombre: "Historial de un usuario", coleccion: "views", indice: "meta_1_ts_1",
    consulta: () => db.views.find({ meta: { user_id: YO }, ts: { $gte: haceDias(30) } }).sort({ ts: -1 }) },
  { id: "1.4", nombre: "Top 10 de la semana (índice nuevo en ts)", coleccion: "views", indice: "views_ts",
    pipeline: [
      { $match: { ts: { $gte: haceDias(7) } } },
      { $group: { _id: "$media_id", reproducciones: { $sum: 1 } } },
      { $sort: { reproducciones: -1 } },
      { $limit: 10 },
    ] },
];

for (const c of CASOS) {
  if (c.pipeline) {
    c.explicar = () => db.getCollection(c.coleccion).explain("executionStats").aggregate(c.pipeline);
    c.ejecutar = () => db.getCollection(c.coleccion).aggregate(c.pipeline).toArray();
  } else {
    c.explicar = () => c.consulta().explain("executionStats");
    c.ejecutar = () => c.consulta().toArray();
  }
}

// --- Medición ------------------------------------------------------------------
const fmt = (n) => (typeof n === "number" ? n.toLocaleString("es-AR") : n);
const resultados = [];
try {
  for (const c of CASOS) {
    quitarIndices(c.coleccion);
    const sin = { ...metricas(c.explicar()), promedio: promedio(c) };
    crearIndice(c.coleccion, c.indice);
    const con = { ...metricas(c.explicar()), promedio: promedio(c) };
    resultados.push({ caso: c, sin, con });
    print(`\n${c.id}  ${c.nombre}   [${c.coleccion}, índice ${c.indice}]`);
    for (const [etiqueta, m] of [["sin índice", sin], ["con índice", con]]) {
      print(`   ${etiqueta.padEnd(11)} ${m.plan.padEnd(34)} docs ${fmt(m.docs).padStart(9)}  claves ${fmt(m.claves).padStart(7)}  ` +
            `devueltos ${fmt(m.devueltos).padStart(5)}  executionTimeMillis ${String(m.ms).padStart(4)}  promedio ${m.promedio.toFixed(2).padStart(7)} ms`);
    }
  }
} finally {
  restaurarIndices();
  print("\nÍndices restaurados.");
}

// --- Con TODOS los índices: ¿cuál elige MongoDB? -------------------------------
// En la base real conviven todos los índices; el planificador de consultas
// prueba los candidatos y se queda con el mejor. Se verifica que sea el esperado.
const indicesUsados = function (plan) {
  const nombres = [];
  const recorrer = (nodo) => {
    if (!nodo || typeof nodo !== "object") return;
    if (nodo.indexName && nodo.stage !== "EQ_LOOKUP") nombres.push(nodo.indexName);
    for (const v of Object.values(nodo)) if (typeof v === "object") recorrer(v);
  };
  recorrer(plan);
  return nombres;
};
print("\n=== Con todos los índices creados, ¿qué índice elige MongoDB?");
for (const c of CASOS) {
  if (PRUEBA[c.indice]) continue;   // los índices de prueba no quedan en la base
  const ex = c.explicar();
  const usados = indicesUsados((ex.queryPlanner ?? ex.stages[0].$cursor.queryPlanner).winningPlan);
  const ok = usados.includes(c.indice);
  print(`   ${ok ? "✓" : "✗"} ${c.id.padEnd(6)} ${c.nombre.padEnd(36)} usa: ${usados.join(", ") || "ninguno"}`);
}

// --- Tabla en Markdown para rendimiento.md -------------------------------------
print("\n\n| # | Consulta | Índice | Plan sin índice | Plan con índice | Docs examinados (sin → con) | Promedio ms (sin → con) |");
print("|---|---|---|---|---|---|---|");
for (const { caso, sin, con } of resultados) {
  print(`| ${caso.id} | ${caso.nombre} | \`${caso.indice}\` | ${sin.plan} | ${con.plan} | ${fmt(sin.docs)} → ${fmt(con.docs)} | ${sin.promedio.toFixed(2)} → ${con.promedio.toFixed(2)} |`);
}

// =============================================================================
// Costo de los índices
// =============================================================================

// 1) Espacio: tamaño de cada índice
print("\n\n=== Espacio ocupado por los índices");
for (const coleccion of ["media", "users", "reviews", "views"]) {
  const s = db.getCollection(coleccion).aggregate([{ $collStats: { storageStats: {} } }]).toArray()[0].storageStats;
  print(`\n  ${coleccion}: datos ${(s.size / 1048576).toFixed(1)} MB, índices ${(s.totalIndexSize / 1048576).toFixed(1)} MB`);
  for (const [nombre, bytes] of Object.entries(s.indexSizes)) print(`     ${nombre.padEnd(32)} ${(bytes / 1048576).toFixed(2).padStart(7)} MB`);
}

// 2) Inserciones: 20.000 reseñas en una colección de prueba, sin índices
//    y con los mismos índices que reviews
print("\n=== Costo en las inserciones (20.000 reseñas, de a 1.000)");
const muestra = db.reviews.find({}, { _id: 0 }).limit(20000).toArray();
const insertar = function (conIndices) {
  db.reviews_prueba.drop();
  db.createCollection("reviews_prueba");
  if (conIndices) for (const i of ORIGINALES.reviews) crearDesdeCopia("reviews_prueba", i);
  const t0 = Date.now();
  for (let i = 0; i < muestra.length; i += 1000) db.reviews_prueba.insertMany(muestra.slice(i, i + 1000));
  return Date.now() - t0;
};
const tiempos = { sin: [], con: [] };
for (let i = 0; i < 3; i++) { tiempos.sin.push(insertar(false)); tiempos.con.push(insertar(true)); }
db.reviews_prueba.drop();
const prom = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
print(`   solo _id:              ${prom(tiempos.sin).toFixed(0)} ms  (promedio de 3 corridas)`);
print(`   con los 3 índices:     ${prom(tiempos.con).toFixed(0)} ms`);
print(`   costo extra:           ${((prom(tiempos.con) / prom(tiempos.sin) - 1) * 100).toFixed(0)} %`);
