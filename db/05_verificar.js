// =============================================================================
// 05 · Verificación de la base
//
//  1. Cantidad de documentos y espacio en disco por colección
//  2. Las reglas de validación rechazan documentos inválidos
//  3. Integridad de las referencias (MongoDB no tiene claves foráneas:
//     se controla con $lookup y con búsquedas $in)
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
const revisar = function (descripcion, n) {
  print(`    ${n === 0 ? "✓" : "✗"} ${descripcion}: ${fmt(n)} sin referencia válida`);
};

// Referencias simples: $lookup trae el documento referenciado en "ref".
// Si "ref" queda vacío ([]), la referencia apunta a un documento que no existe.
const huerfanos = function (coleccion, campo, destino) {
  return db.getCollection(coleccion).aggregate([
    { $lookup: { from: destino, localField: campo, foreignField: "_id", as: "ref" } },
    { $match: { ref: [] } },
  ]).toArray().length;
};
revisar("reviews.media_id → media", huerfanos("reviews", "media_id", "media"));
revisar("reviews.user_id → users", huerfanos("reviews", "user_id", "users"));

// Referencias dentro de arrays: se juntan todos los ids referenciados (sin
// repetir) y se cuenta cuántos existen en la colección destino con $in.
const faltantes = function (ids, destino) {
  const lista = [...ids.values()];
  return lista.length - db.getCollection(destino).countDocuments({ _id: { $in: lista } });
};
const generos = new Map(), personas = new Map(), enListas = new Map();
for (const m of db.media.find({}, { genre_ids: 1, cast: 1, directors: 1 }).toArray()) {
  for (const g of m.genre_ids) generos.set(g, g);
  for (const p of [...m.cast, ...m.directors]) personas.set(p.person_id.toString(), p.person_id);
}
for (const u of db.users.find({}, { watchlist: 1 }).toArray()) {
  for (const id of u.watchlist) enListas.set(id.toString(), id);
}
revisar("media.genre_ids → genres", faltantes(generos, "genres"));
revisar("media.cast / directors → people", faltantes(personas, "people"));
revisar("users.watchlist → media", faltantes(enListas, "media"));

// views es grande: $group obtiene los ids distintos y se revisan esos
for (const [campo, destino] of [["media_id", "media"], ["meta.user_id", "users"]]) {
  const ids = new Map();
  db.views.aggregate([{ $group: { _id: "$" + campo } }]).forEach((d) => ids.set(d._id.toString(), d._id));
  revisar(`views.${campo} → ${destino}`, faltantes(ids, destino));
}

// rating calculado coincide con las reseñas (los 3 títulos con más reseñas)
const muestra = db.media.find({}, { rating: 1 }).sort({ "rating.count": -1 }).limit(3).toArray();
let ratingsOk = 0;
for (const m of muestra) {
  const real = db.reviews.aggregate([
    { $match: { media_id: m._id } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]).toArray()[0];
  if (Math.round(real.avg * 10) / 10 === m.rating.avg && real.count === m.rating.count) ratingsOk++;
}
print(`    ${ratingsOk === muestra.length ? "✓" : "✗"} media.rating coincide con reviews (${ratingsOk}/${muestra.length} títulos de muestra)`);
}
