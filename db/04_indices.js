// =============================================================================
// 04 · Creación de índices
//
// Se crean DESPUÉS de la carga masiva: insertar con índices ya creados obliga
// a actualizar cada índice en cada insert. Construirlos al final es más rápido.
//
// Cada índice responde a una consulta concreta (ver consultas.md) y tiene
// nombre, como en la clase:  db.coleccion.createIndex({ campo: 1 }, { name: "…" })
// El nombre permite reconocerlo en explain() y borrarlo con dropIndex("nombre").
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

// ----------------------------------------------------------------------- media
// Barra de búsqueda ("empieza con…") y orden alfabético
db.media.createIndex({ title: 1 }, { name: "media_titulo" });

// Página de género y carruseles por género.
// Compuesto: primero los campos de igualdad (género, tipo) y al final el de
// orden (rating). genre_ids es un array, así que el índice es multikey.
db.media.createIndex({ genre_ids: 1, type: 1, "rating.avg": -1 }, { name: "media_genero_tipo_rating" });

// "Series para maratonear" y filtro Películas / Series
db.media.createIndex({ type: 1, "rating.avg": -1 }, { name: "media_tipo_rating" });

// "Recién agregadas"
db.media.createIndex({ created_at: -1 }, { name: "media_recientes" });

// Filmografía de una persona (multikey: cast y directors son arrays)
db.media.createIndex({ "cast.person_id": 1 }, { name: "media_reparto" });
db.media.createIndex({ "directors.person_id": 1 }, { name: "media_directores" });

// Título destacado (hero)
db.media.createIndex({ is_featured: 1 }, { name: "media_destacado" });

// ----------------------------------------------------------------------- users
// Login por email y perfil por username. unique: true impide que dos usuarios
// tengan el mismo valor (además de acelerar la búsqueda).
db.users.createIndex({ email: 1 }, { name: "users_email_unico", unique: true });
db.users.createIndex({ username: 1 }, { name: "users_username_unico", unique: true });

// --------------------------------------------------------------------- reviews
// Reseñas de un título, las más nuevas primero (pantalla de detalle)
db.reviews.createIndex({ media_id: 1, created_at: -1 }, { name: "reviews_por_titulo" });

// "Mis reseñas" (perfil)
db.reviews.createIndex({ user_id: 1, created_at: -1 }, { name: "reviews_por_usuario" });

// Un usuario reseña cada título una sola vez
db.reviews.createIndex({ media_id: 1, user_id: 1 }, { name: "reviews_titulo_usuario_unico", unique: true });

// ----------------------------------------------------------------------- views
// No se crea ninguno: MongoDB crea automáticamente "meta_1_ts_1" al crear la
// serie temporal, y las consultas por usuario lo aprovechan filtrando con
// { meta: { user_id: X } } (ver rendimiento.md).

// -----------------------------------------------------------------------------
print("\n  Índices por colección (getIndexes):");
for (const c of ["genres", "people", "media", "users", "reviews", "views"]) {
  print(`    ${c.padEnd(8)} ${db.getCollection(c).getIndexes().map((i) => i.name).join(", ")}`);
}
}
