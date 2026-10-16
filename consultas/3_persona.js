// =============================================================================
// Pantalla PERSONA: ficha de un actor o director (interfaces/persona.html)
// Uso:  mongosh consultas/3_persona.js
// =============================================================================

if (typeof mostrar === "undefined") load(__dirname + "/lib.js");

{
seccion("PERSONA — Ricardo Darín");

// -----------------------------------------------------------------------------
// 3.1 Ficha de la persona
// La biografía, la fecha y el país solo se muestran acá: por eso viven en
// people y no se copian en media.
// -----------------------------------------------------------------------------
mostrar("3.1 Documento de la persona", () =>
  db.people.findOne({ _id: IDS.darin })
);

// -----------------------------------------------------------------------------
// 3.2 Filmografía (relación muchos a muchos, vista desde people)
// No hace falta guardar en people la lista de títulos: se buscan los títulos
// cuyo array cast (o directors) contiene a la persona.
// -----------------------------------------------------------------------------
mostrar("3.2 Títulos donde actuó Ricardo Darín", () =>
  db.media.find({ "cast.person_id": IDS.darin }, { title: 1, release_year: 1 })
    .sort({ release_year: -1 })
);
mostrar("3.2 Títulos que dirigió Christopher Nolan", () =>
  db.media.find({ "directors.person_id": IDS.nolan }, { title: 1, release_year: 1 })
    .sort({ release_year: -1 })
);

// -----------------------------------------------------------------------------
// 3.3 Estadísticas de la filmografía
// $project + $cond: marca cada título con 1 si es serie y 0 si es película.
// $group con _id: null reúne todo en un solo resultado y suma esas marcas.
// -----------------------------------------------------------------------------
mostrar("3.3 Estadísticas de Ricardo Darín", () =>
  db.media.aggregate([
    { $match: { "cast.person_id": IDS.darin } },
    { $project: {
        rating: "$rating.avg",
        esSerie: { $cond: { if: { $eq: ["$type", "series"] }, then: 1, else: 0 } },
    } },
    { $group: {
        _id: null,
        titulos: { $sum: 1 },
        series: { $sum: "$esSerie" },
        rating_promedio: { $avg: "$rating" },
    } },
  ])
);
}
