// =============================================================================
// Pantalla PERFIL del usuario (interfaces/perfil.html)
// Uso:  mongosh consultas/5_perfil.js
// =============================================================================

if (typeof mostrar === "undefined") load(__dirname + "/lib.js");

{
seccion("PERFIL — CineFan88");

// -----------------------------------------------------------------------------
// 5.1 Documento del usuario (encabezado y pestaña "Cuenta")
// Suscripción y métodos de pago están embebidos: un solo findOne alcanza.
// { password_hash: 0 } excluye el hash: nunca se envía al cliente.
// -----------------------------------------------------------------------------
mostrar("5.1 Usuario (sin password_hash)", () =>
  db.users.findOne({ _id: IDS.cinefan }, { password_hash: 0, watchlist: 0 })
);

// -----------------------------------------------------------------------------
// 5.2 Mi lista: watchlist (array de ObjectId) → documentos de media
// $lookup busca en media cada _id del array y devuelve los títulos en "items".
// -----------------------------------------------------------------------------
mostrar("5.2 Mi lista", () =>
  db.users.aggregate([
    { $match: { _id: IDS.cinefan } },
    { $lookup: { from: "media", localField: "watchlist", foreignField: "_id", as: "items" } },
    { $project: { _id: 0, "items.title": 1, "items.type": 1, "items.release_year": 1 } },
  ]).toArray()[0].items
);

// -----------------------------------------------------------------------------
// 5.3 Historial de reproducción de los últimos 30 días
// Lo "visto" no es una lista en users: sale de la colección views.
// -----------------------------------------------------------------------------
mostrar("5.3 Historial (últimos 30 días)", () =>
  db.views.aggregate([
    { $match: { user_id: IDS.cinefan, started_at: { $gte: haceDias(30) } } },
    { $sort: { started_at: -1 } },
    { $lookup: { from: "media", localField: "media_id", foreignField: "_id", as: "media" } },
    { $project: { _id: 0, started_at: 1, "media.title": 1, episode: 1, minutes: 1, completed: 1 } },
  ])
, { limite: 8 });

// -----------------------------------------------------------------------------
// 5.4 Horas vistas en el último mes (encabezado del perfil)
// $group suma los minutos; $project calcula las horas dividiendo por 60.
// -----------------------------------------------------------------------------
mostrar("5.4 Horas vistas en los últimos 30 días", () =>
  db.views.aggregate([
    { $match: { user_id: IDS.cinefan, started_at: { $gte: haceDias(30) } } },
    { $group: { _id: null, minutos: { $sum: "$minutes" }, sesiones: { $sum: 1 } } },
    { $project: { _id: 0, sesiones: 1, horas: { $divide: ["$minutos", 60] } } },
  ])
);

// -----------------------------------------------------------------------------
// 5.5 Mis reseñas, con el título de cada una
// La misma colección reviews se consulta ahora desde el usuario.
// -----------------------------------------------------------------------------
mostrar("5.5 Mis reseñas", () =>
  db.reviews.aggregate([
    { $match: { user_id: IDS.cinefan } },
    { $sort: { created_at: -1 } },
    { $lookup: { from: "media", localField: "media_id", foreignField: "_id", as: "media" } },
    { $project: { _id: 0, rating: 1, comment: 1, created_at: 1, "media.title": 1 } },
  ])
);
}
