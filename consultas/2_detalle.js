// =============================================================================
// Pantalla DETALLE de un título (interfaces/detalle.html)
// Uso:  mongosh consultas/2_detalle.js
// =============================================================================

if (typeof mostrar === "undefined") load(__dirname + "/lib.js");

{
seccion("DETALLE — El Eternauta");

// -----------------------------------------------------------------------------
// 2.1 Documento completo del título
// Un único findOne trae casi toda la pantalla: datos, directores y reparto
// (referencia extendida) y, por ser una serie, temporadas y episodios embebidos.
// -----------------------------------------------------------------------------
const titulo = mostrar("2.1 Documento del título", () =>
  db.media.findOne({ _id: IDS.eternauta })
);

// -----------------------------------------------------------------------------
// 2.2 Reseñas del título, las más nuevas primero (de a 10)
// Cada reseña trae una copia del username y el avatar: no hace falta consultar
// users para mostrarlas.
// -----------------------------------------------------------------------------
mostrar("2.2 Reseñas más recientes", () =>
  db.reviews.find(
    { media_id: IDS.eternauta },
    { _id: 0, user: 1, rating: 1, comment: 1, created_at: 1 }
  ).sort({ created_at: -1 }).limit(10)
);

// -----------------------------------------------------------------------------
// 2.3 ¿Está en Mi lista? (estado del botón "+ Mi lista")
// { watchlist: id } se cumple si el array contiene ese id.
// -----------------------------------------------------------------------------
mostrar("2.3 ¿El Eternauta está en la lista de CineFan88?", () =>
  db.users.countDocuments({ _id: IDS.cinefan, watchlist: IDS.eternauta }) === 1
);

// -----------------------------------------------------------------------------
// 2.4 Tu última reproducción de este título
// Filtra por el usuario (metaField) y ordena por fecha (timeField).
// -----------------------------------------------------------------------------
mostrar("2.4 Última reproducción de CineFan88", () =>
  db.views.find(
    { "meta.user_id": IDS.cinefan, media_id: IDS.eternauta },
    { _id: 0, ts: 1, episode: 1, minutes: 1, completed: 1 }
  ).sort({ ts: -1 }).limit(1)
);

// -----------------------------------------------------------------------------
// 2.5 Títulos similares
// $in: títulos que tienen al menos uno de los géneros indicados.
// $ne: excluye el título que se está viendo.
// -----------------------------------------------------------------------------
mostrar("2.5 Si te gustó El Eternauta", () =>
  db.media.find(
    { genre_ids: { $in: titulo.genre_ids }, _id: { $ne: titulo._id } },
    { title: 1, genre_ids: 1, "rating.avg": 1 }
  ).sort({ "rating.avg": -1 }).limit(10)
);
}
