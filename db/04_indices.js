// =============================================================================
// 04 · Creación de índices
//
// Se crean DESPUÉS de la carga masiva: insertar con índices ya creados obliga
// a actualizar cada índice en cada insert. Construirlos al final es más rápido.
// (La unicidad de reviews y users ya la garantiza el generador de datos.)
//
// Cada índice responde a una consulta concreta de las pantallas
// (ver colecciones.md). Todos tienen nombre para poder identificarlos en
// explain() y eliminarlos con dropIndex("nombre") en las pruebas de rendimiento.
//
// Uso:  mongosh db/04_indices.js
// =============================================================================

if (typeof CONFIG === "undefined") load(__dirname + "/config.js");
if (typeof titulo === "undefined") load(__dirname + "/lib/utilidades.js");

// Bloque propio: setup.js carga todos los scripts en el mismo contexto y así
// las constantes de un script no chocan con las de otro.
{

db = db.getSiblingDB(CONFIG.dbName);
titulo("Creando índices");

globalThis.INDICES = {
  media: [
    // Barra de búsqueda (índice de texto, en español: ignora "el", "la", "de"…)
    [{ title: "text", original_title: "text" }, { name: "media_busqueda_texto", default_language: "spanish", weights: { title: 10, original_title: 5 } }],
    // Página de género y carruseles por género (multikey: genre_ids es un array)
    [{ genre_ids: 1, type: 1, "rating.avg": -1 }, { name: "media_genero_tipo_rating" }],
    // "Series para maratonear" y filtro Películas / Series
    [{ type: 1, "rating.avg": -1 }, { name: "media_tipo_rating" }],
    // "Recién agregadas"
    [{ created_at: -1 }, { name: "media_recientes" }],
    // Filmografía de una persona (multikey)
    [{ "cast.person_id": 1 }, { name: "media_reparto" }],
    [{ "directors.person_id": 1 }, { name: "media_directores" }],
    // Título destacado: índice parcial, solo indexa los documentos destacados
    [{ is_featured: 1 }, { name: "media_destacado", partialFilterExpression: { is_featured: true } }],
  ],
  users: [
    [{ email: 1 }, { name: "users_email_unico", unique: true }],
    [{ username: 1 }, { name: "users_username_unico", unique: true }],
  ],
  reviews: [
    // Reseñas de un título, las más nuevas primero (pantalla de detalle)
    [{ media_id: 1, created_at: -1 }, { name: "reviews_por_titulo" }],
    // "Mis reseñas" (perfil)
    [{ user_id: 1, created_at: -1 }, { name: "reviews_por_usuario" }],
    // Un usuario reseña cada título una sola vez
    [{ media_id: 1, user_id: 1 }, { name: "reviews_titulo_usuario_unico", unique: true }],
  ],
  views: [
    // Historial y "Seguir viendo" de un usuario
    // (MongoDB ya crea automáticamente un índice sobre meta + ts)
    [{ "meta.user_id": 1, ts: -1 }, { name: "views_por_usuario" }],
  ],
};

for (const [coleccion, indices] of Object.entries(INDICES)) {
  for (const [claves, opciones] of indices) {
    const t = cronometro();
    db.getCollection(coleccion).createIndex(claves, opciones);
    paso(`${coleccion}.${opciones.name}  ${JSON.stringify(claves)}  (${t()})`);
  }
}

print("\n  Índices por colección:");
for (const c of ["genres", "people", "media", "users", "reviews", "views"]) {
  print(`    ${c.padEnd(8)} ${db.getCollection(c).getIndexes().map((i) => i.name).join(", ")}`);
}
}
