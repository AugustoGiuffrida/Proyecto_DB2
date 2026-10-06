// =============================================================================
// 03 · Cálculo de media.rating (patrón computado)
//
// media.rating = { avg, count } se guarda precalculado porque se muestra en
// cada card del catálogo. Este script lo calcula a partir de las reseñas
// con una sola agregación que escribe el resultado en media ($merge).
//
// En la aplicación, el mismo pipeline (filtrado por un media_id) se ejecuta
// cada vez que se inserta una reseña.
//
// Uso:  mongosh db/03_ratings.js
// =============================================================================

if (typeof CONFIG === "undefined") load(__dirname + "/config.js");
if (typeof titulo === "undefined") load(__dirname + "/lib/utilidades.js");

// Bloque propio: setup.js carga todos los scripts en el mismo contexto y así
// las constantes de un script no chocan con las de otro.
{

db = db.getSiblingDB(CONFIG.dbName);
titulo("Calculando media.rating a partir de reviews");
const t = cronometro();

// 1) Todos en cero: un título sin reseñas queda con { avg: 0, count: 0 }
db.media.updateMany({}, { $set: { rating: { avg: 0, count: 0 } } });

// 2) Promedio y cantidad por título, escritos directamente en media
db.reviews.aggregate([
  { $group: { _id: "$media_id", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  {
    $merge: {
      into: "media",
      on: "_id",
      whenMatched: [{ $set: { rating: { avg: { $round: ["$$new.avg", 1] }, count: "$$new.count" } } }],
      whenNotMatched: "discard",
    },
  },
]);

const conResenas = db.media.countDocuments({ "rating.count": { $gt: 0 } });
paso(`${conResenas.toLocaleString("es-AR")} títulos con rating calculado en ${t()}`);
}
