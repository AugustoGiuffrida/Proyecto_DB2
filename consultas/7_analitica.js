// =============================================================================
// Reportes ANALÍTICOS (para el equipo de la plataforma, no para el usuario)
// Uso:  mongosh consultas/7_analitica.js
// =============================================================================

if (typeof mostrar === "undefined") load(__dirname + "/lib.js");

{
seccion("ANALÍTICA");

// -----------------------------------------------------------------------------
// 7.1 Películas y series: cantidad y rating promedio
// -----------------------------------------------------------------------------
mostrar("7.1 Títulos por tipo", () =>
  db.media.aggregate([
    { $group: { _id: "$type", titulos: { $sum: 1 }, rating_promedio: { $avg: "$rating.avg" } } },
  ])
);

// -----------------------------------------------------------------------------
// 7.2 Clasificación de títulos con $cond
// $project agrega un campo calculado: "Destacado" si el rating es 8 o más,
// "Resto" si no. Después $group cuenta cuántos hay de cada clase.
// -----------------------------------------------------------------------------
mostrar("7.2 Títulos destacados (rating ≥ 8) y resto", () =>
  db.media.aggregate([
    { $project: { clase: { $cond: { if: { $gte: ["$rating.avg", 8] }, then: "Destacado", else: "Resto" } } } },
    { $group: { _id: "$clase", titulos: { $sum: 1 } } },
  ])
);

// -----------------------------------------------------------------------------
// 7.3 Distribución de puntajes de las reseñas
// -----------------------------------------------------------------------------
mostrar("7.3 Reseñas por puntaje", () =>
  db.reviews.aggregate([
    { $group: { _id: "$rating", resenas: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ])
, { limite: 10 });

// -----------------------------------------------------------------------------
// 7.4 Usuarios por país
// -----------------------------------------------------------------------------
mostrar("7.4 Usuarios por país", () =>
  db.users.aggregate([
    { $group: { _id: "$country", usuarios: { $sum: 1 } } },
    { $sort: { usuarios: -1 } },
  ])
, { limite: 8 });

// -----------------------------------------------------------------------------
// 7.5 Usuarios por plan de suscripción (campo de un subdocumento)
// -----------------------------------------------------------------------------
mostrar("7.5 Usuarios por plan", () =>
  db.users.aggregate([
    { $group: { _id: "$subscription.plan", usuarios: { $sum: 1 } } },
    { $sort: { usuarios: -1 } },
  ])
);

// -----------------------------------------------------------------------------
// 7.6 Minutos vistos por usuario en el último mes (los 5 que más miran)
// $group sobre views suma los minutos de cada usuario y $lookup trae el username.
// -----------------------------------------------------------------------------
mostrar("7.6 Usuarios que más miraron en los últimos 30 días", () =>
  db.views.aggregate([
    { $match: { started_at: { $gte: haceDias(30) } } },
    { $group: { _id: "$user_id", minutos: { $sum: "$minutes" } } },
    { $sort: { minutos: -1 } },
    { $limit: 5 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "usuario" } },
    { $project: { _id: 0, minutos: 1, "usuario.username": 1, "usuario.subscription.plan": 1 } },
  ])
);
}
