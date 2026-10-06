// =============================================================================
// 05 · Verificación de la base
//
//  1. Cantidad de documentos y espacio en disco por colección
//  2. Las reglas de validación rechazan documentos inválidos
//  3. Integridad de las referencias (MongoDB no tiene claves foráneas:
//     se controla con $lookup)
//
// Uso:  mongosh db/05_verificar.js
// =============================================================================

if (typeof CONFIG === "undefined") load(__dirname + "/config.js");
if (typeof titulo === "undefined") load(__dirname + "/lib/utilidades.js");

// Bloque propio: setup.js carga todos los scripts en el mismo contexto y así
// las constantes de un script no chocan con las de otro.
{

db = db.getSiblingDB(CONFIG.dbName);
const fmt = (n) => n.toLocaleString("es-AR");
const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

// -----------------------------------------------------------------------------
titulo("1. Volumen");
print(`    ${"colección".padEnd(10)}${"documentos".padStart(12)}${"datos".padStart(11)}${"en disco".padStart(11)}${"índices".padStart(11)}`);
for (const c of ["genres", "people", "media", "users", "reviews", "views"]) {
  const s = db.getCollection(c).aggregate([{ $collStats: { storageStats: {} } }]).toArray()[0].storageStats;
  const docs = db.getCollection(c).estimatedDocumentCount();
  print(`    ${c.padEnd(10)}${fmt(docs).padStart(12)}${mb(s.size).padStart(11)}${mb(s.storageSize).padStart(11)}${mb(s.totalIndexSize).padStart(11)}`);
}

// -----------------------------------------------------------------------------
titulo("2. Validación de esquemas");
const debeFallar = function (descripcion, fn) {
  try {
    fn();
    print(`    ✗ SE ACEPTÓ: ${descripcion}`);
  } catch (e) {
    print(`    ✓ rechazado: ${descripcion}  (${e.codeName ?? e.code ?? "error"})`);
  }
}
const unTitulo = db.media.findOne({ type: "movie" });
const unUsuario = db.users.findOne();
const base = { title: "Prueba", release_year: 2020, plot: "x", genre_ids: ["drama"], rating: { avg: 0, count: 0 },
  directors: [{ person_id: new ObjectId(), name: "X" }], cast: [], is_featured: false, created_at: new Date() };

debeFallar("película sin runtime_min", () => db.media.insertOne({ ...base, type: "movie" }));
debeFallar("película con seasons", () => db.media.insertOne({ ...base, type: "movie", runtime_min: 100, seasons: [{ number: 1, episodes: [{ number: 1, title: "a", runtime_min: 30 }] }] }));
debeFallar("type inexistente", () => db.media.insertOne({ ...base, type: "documental", runtime_min: 90 }));
debeFallar("género con mayúsculas", () => db.genres.insertOne({ _id: "Ciencia Ficcion", name: "x", color: "#ffffff" }));
debeFallar("reseña con rating 11", () => db.reviews.insertOne({ media_id: unTitulo._id, user_id: unUsuario._id, user: { username: "x" }, rating: 11, created_at: new Date() }));
debeFallar("usuario con email inválido", () => db.users.insertOne({ ...unUsuario, _id: new ObjectId(), username: "nuevo_usuario", email: "sin-arroba" }));
debeFallar("tarjeta con número completo", () => db.users.updateOne({ _id: unUsuario._id }, { $set: { "payment_methods.0.last4": "4242424242424242" } }));
debeFallar("reseña duplicada (índice único)", () => {
  const r = db.reviews.findOne();
  db.reviews.insertOne({ ...r, _id: new ObjectId() });
});

// -----------------------------------------------------------------------------
titulo("3. Integridad de referencias");
// Cuenta los documentos cuya referencia no apunta a ningún documento existente
const huerfanos = function (coleccion, campo, destino) {
  return db.getCollection(coleccion).aggregate([
    { $lookup: { from: destino, localField: campo, foreignField: "_id", as: "ref", pipeline: [{ $project: { _id: 1 } }] } },
    { $match: { ref: { $size: 0 } } },
    { $count: "n" },
  ]).toArray()[0]?.n ?? 0;
}
const revisar = function (descripcion, n) {
  print(`    ${n === 0 ? "✓" : "✗"} ${descripcion}: ${fmt(n)} sin referencia válida`);
}
revisar("reviews.media_id → media", huerfanos("reviews", "media_id", "media"));
revisar("reviews.user_id → users", huerfanos("reviews", "user_id", "users"));

// En arrays se desarma primero con $unwind para revisar cada elemento
const huerfanosArray = function (coleccion, array, campo, destino) {
  return db.getCollection(coleccion).aggregate([
    { $unwind: `$${array}` },
    { $group: { _id: `$${array}${campo ? "." + campo : ""}` } },
    { $lookup: { from: destino, localField: "_id", foreignField: "_id", as: "ref", pipeline: [{ $project: { _id: 1 } }] } },
    { $match: { ref: { $size: 0 } } },
    { $count: "n" },
  ]).toArray()[0]?.n ?? 0;
}
revisar("media.genre_ids → genres", huerfanosArray("media", "genre_ids", null, "genres"));
revisar("media.cast.person_id → people", huerfanosArray("media", "cast", "person_id", "people"));
revisar("media.directors.person_id → people", huerfanosArray("media", "directors", "person_id", "people"));
revisar("users.watchlist → media", huerfanosArray("users", "watchlist", null, "media"));

// views es grande: se revisan los ids distintos, no cada documento
for (const [campo, destino] of [["media_id", "media"], ["meta.user_id", "users"]]) {
  const ids = db.views.distinct(campo);
  const existentes = db.getCollection(destino).countDocuments({ _id: { $in: ids } });
  revisar(`views.${campo} → ${destino}`, ids.length - existentes);
}

// rating calculado coincide con las reseñas (muestra de 3 títulos)
const muestra = db.media.aggregate([{ $match: { "rating.count": { $gt: 0 } } }, { $sample: { size: 3 } }]).toArray();
let ratingsOk = 0;
for (const m of muestra) {
  const real = db.reviews.aggregate([{ $match: { media_id: m._id } }, { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]).toArray()[0];
  if (Math.round(real.avg * 10) / 10 === m.rating.avg && real.count === m.rating.count) ratingsOk++;
}
print(`    ${ratingsOk === muestra.length ? "✓" : "✗"} media.rating coincide con reviews (${ratingsOk}/${muestra.length} títulos de muestra)`);
}
