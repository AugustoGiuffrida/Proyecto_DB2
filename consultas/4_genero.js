// =============================================================================
// Pantalla GÉNERO / EXPLORAR (interfaces/genero.html)
// Uso:  mongosh consultas/4_genero.js
// =============================================================================

if (typeof mostrar === "undefined") load(__dirname + "/lib.js");

{
seccion("GÉNERO — Ciencia Ficción");

const CARD = { title: 1, type: 1, release_year: 1, "rating.avg": 1 };

// -----------------------------------------------------------------------------
// 4.1 Encabezado del género
// El _id es un slug legible, por eso también se usa en la URL:
// genero.html?id=ciencia-ficcion
// -----------------------------------------------------------------------------
mostrar("4.1 Documento del género", () =>
  db.genres.findOne({ _id: "ciencia-ficcion" })
);

// -----------------------------------------------------------------------------
// 4.2 Resultados con filtros, orden y paginado
// Los botones de la barra se traducen directamente al filtro y al orden.
// Paginado: skip saltea los resultados de las páginas anteriores.
// -----------------------------------------------------------------------------
const POR_PAGINA = 24;

mostrar("4.2 Películas de ciencia ficción, mejor valoradas (página 1)", () =>
  db.media.find({ genre_ids: "ciencia-ficcion", type: "movie" }, CARD)
    .sort({ "rating.avg": -1 }).skip(0).limit(POR_PAGINA)
);
mostrar("4.2 Películas de ciencia ficción, mejor valoradas (página 2)", () =>
  db.media.find({ genre_ids: "ciencia-ficcion", type: "movie" }, CARD)
    .sort({ "rating.avg": -1 }).skip(POR_PAGINA).limit(POR_PAGINA)
);
mostrar("4.2 Ordenadas por estreno (más nuevas primero)", () =>
  db.media.find({ genre_ids: "ciencia-ficcion", type: "movie" }, CARD)
    .sort({ release_year: -1 }).limit(POR_PAGINA)
);

// -----------------------------------------------------------------------------
// 4.3 Cantidad por tipo (los contadores de los botones Películas / Series)
// -----------------------------------------------------------------------------
mostrar("4.3 Títulos de ciencia ficción por tipo", () =>
  db.media.aggregate([
    { $match: { genre_ids: "ciencia-ficcion" } },
    { $group: { _id: "$type", titulos: { $sum: 1 } } },
  ])
);

// -----------------------------------------------------------------------------
// 4.4 Filtro por rango ($gte / $lte): ciencia ficción de los 90 con buen rating
// -----------------------------------------------------------------------------
mostrar("4.4 Ciencia ficción de los 90 con rating ≥ 7.5", () =>
  db.media.find(
    { genre_ids: "ciencia-ficcion", release_year: { $gte: 1990, $lte: 1999 }, "rating.avg": { $gte: 7.5 } },
    CARD
  ).sort({ "rating.avg": -1 })
);

// -----------------------------------------------------------------------------
// 4.5 Varios géneros a la vez ($in): ciencia ficción o terror
// -----------------------------------------------------------------------------
mostrar("4.5 Ciencia ficción o terror, mejor valorados", () =>
  db.media.find({ genre_ids: { $in: ["ciencia-ficcion", "terror"] } }, { title: 1, genre_ids: 1, "rating.avg": 1 })
    .sort({ "rating.avg": -1 }).limit(10)
);
}
