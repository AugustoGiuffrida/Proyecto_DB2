// =============================================================================
// Medición de rendimiento con executionTimeMillis (como en la clase de índices)
//
// Para cada colección:
//   1. getIndexes()   lista los índices
//   2. dropIndex()    elimina los índices
//   3. explain("executionStats").executionStats.executionTimeMillis  → SIN índice
//   4. createIndex()  crea los índices
//   5. explain("executionStats").executionStats.executionTimeMillis  → CON índice
//
// Cada consulta se mide 5 veces y se toma el valor del medio (mediana).
//
// Uso:  mongosh rendimiento/medir.js
// =============================================================================

load(__dirname + "/../db/config.js");
db = db.getSiblingDB(CONFIG.dbName);

const YO = ObjectId("665f0c000000000000000001");          // CineFan88
const ETERNAUTA = ObjectId("665f0a000000000000000010");
const DARIN = ObjectId("665f0b000000000000000010");
const NOLAN = ObjectId("665f0b000000000000000001");
const HACE_7_DIAS = ISODate("2026-09-29T12:00:00Z");
const HACE_30_DIAS = ISODate("2026-09-06T12:00:00Z");

// executionTimeMillis de una consulta (mediana de 5 ejecuciones)
const tiempo = function (consulta) {
  const valores = [];
  for (let i = 0; i < 5; i++) {
    valores.push(consulta().explain("executionStats").executionStats.executionTimeMillis);
  }
  return valores.sort((a, b) => a - b)[2];
};

const listar = function (coleccion) {
  print(`  ${coleccion}.getIndexes(): ${db.getCollection(coleccion).getIndexes().map((i) => i.name).join(", ")}`);
};

// -----------------------------------------------------------------------------
// Colecciones, índices y consultas a medir
// -----------------------------------------------------------------------------
const COLECCIONES = [
  {
    nombre: "media",
    eliminar: () => {
      db.media.dropIndex("media_genero_tipo_rating");
      db.media.dropIndex("media_tipo_rating");
      db.media.dropIndex("media_recientes");
      db.media.dropIndex("media_reparto");
      db.media.dropIndex("media_directores");
      db.media.dropIndex("media_destacado");
    },
    crear: () => {
      db.media.createIndex({ genre_ids: 1, type: 1, "rating.avg": -1 }, { name: "media_genero_tipo_rating" });
      db.media.createIndex({ type: 1, "rating.avg": -1 }, { name: "media_tipo_rating" });
      db.media.createIndex({ created_at: -1 }, { name: "media_recientes" });
      db.media.createIndex({ "cast.person_id": 1 }, { name: "media_reparto" });
      db.media.createIndex({ "directors.person_id": 1 }, { name: "media_directores" });
      db.media.createIndex({ is_featured: 1 }, { name: "media_destacado" });
    },
    consultas: [
      ["—", "Todos los documentos (sin filtro)", "ninguno",
        () => db.media.find()],
      ["1.1", "Título destacado", "media_destacado",
        () => db.media.find({ is_featured: true })],
      ["1.4", "Recién agregadas", "media_recientes",
        () => db.media.find({}).sort({ created_at: -1 })],
      ["1.5", "Recomendadas por género", "media_genero_tipo_rating",
        () => db.media.find({ genre_ids: "ciencia-ficcion" }).sort({ "rating.avg": -1 })],
      ["1.6", "Filtrar por tipo (series)", "media_tipo_rating",
        () => db.media.find({ type: "series" }).sort({ "rating.avg": -1 })],
      ["3.2", "Títulos donde actuó una persona", "media_reparto",
        () => db.media.find({ "cast.person_id": DARIN }).sort({ release_year: -1 })],
      ["3.2", "Títulos que dirigió una persona", "media_directores",
        () => db.media.find({ "directors.person_id": NOLAN }).sort({ release_year: -1 })],
      ["4.2", "Películas de un género por rating", "media_genero_tipo_rating",
        () => db.media.find({ genre_ids: "ciencia-ficcion", type: "movie" }).sort({ "rating.avg": -1 })],
    ],
  },
  {
    nombre: "reviews",
    eliminar: () => {
      db.reviews.dropIndex("reviews_por_titulo");
      db.reviews.dropIndex("reviews_por_usuario");
      db.reviews.dropIndex("reviews_titulo_usuario_unico");
    },
    crear: () => {
      db.reviews.createIndex({ media_id: 1, created_at: -1 }, { name: "reviews_por_titulo" });
      db.reviews.createIndex({ user_id: 1, created_at: -1 }, { name: "reviews_por_usuario" });
      db.reviews.createIndex({ media_id: 1, user_id: 1 }, { name: "reviews_titulo_usuario_unico", unique: true });
    },
    consultas: [
      ["—", "Todos los documentos (sin filtro)", "ninguno",
        () => db.reviews.find()],
      ["2.2", "Reseñas de un título", "reviews_por_titulo",
        () => db.reviews.find({ media_id: ETERNAUTA }).sort({ created_at: -1 })],
      ["5.4", "Mis reseñas", "reviews_por_usuario",
        () => db.reviews.find({ user_id: YO }).sort({ created_at: -1 })],
    ],
  },
  {
    nombre: "views",
    eliminar: () => {
      db.views.dropIndex("views_por_usuario");
      db.views.dropIndex("views_por_fecha");
    },
    crear: () => {
      db.views.createIndex({ user_id: 1, started_at: -1 }, { name: "views_por_usuario" });
      db.views.createIndex({ started_at: -1 }, { name: "views_por_fecha" });
    },
    consultas: [
      ["—", "Todos los documentos (sin filtro)", "ninguno",
        () => db.views.find()],
      ["1.3", "Top 10: reproducciones de la semana", "views_por_fecha",
        () => db.views.find({ started_at: { $gte: HACE_7_DIAS } })],
      ["2.3", "Última reproducción del usuario", "views_por_usuario",
        () => db.views.find({ user_id: YO, media_id: ETERNAUTA }).sort({ started_at: -1 })],
      ["5.3", "Historial de un usuario", "views_por_usuario",
        () => db.views.find({ user_id: YO, started_at: { $gte: HACE_30_DIAS } }).sort({ started_at: -1 })],
    ],
  },
];

// -----------------------------------------------------------------------------
// Medición
// -----------------------------------------------------------------------------
const resultados = [];
for (const c of COLECCIONES) {
  print(`\n=== ${c.nombre}`);
  listar(c.nombre);

  c.eliminar();
  print("  índices eliminados →");
  listar(c.nombre);
  const sin = c.consultas.map(([, , , consulta]) => tiempo(consulta));

  c.crear();
  print("  índices creados →");
  listar(c.nombre);
  const con = c.consultas.map(([, , , consulta]) => tiempo(consulta));

  c.consultas.forEach(([num, nombre, indice], i) => {
    print(`  ${num.padEnd(4)} ${nombre.padEnd(38)} sin índice: ${String(sin[i]).padStart(4)} ms   con índice: ${String(con[i]).padStart(4)} ms   (${indice})`);
    resultados.push({ num, nombre, coleccion: c.nombre, indice, sin: sin[i], con: con[i] });
  });
}

print("\n\n| Consulta | Colección | Índice | executionTimeMillis sin índice | executionTimeMillis con índice |");
print("|---|---|---|---|---|");
for (const r of resultados) {
  print(`| ${r.num} ${r.nombre} | \`${r.coleccion}\` | \`${r.indice}\` | ${r.sin} ms | ${r.con} ms |`);
}
