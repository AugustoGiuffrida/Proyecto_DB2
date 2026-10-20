// =============================================================================
// Pantalla INICIO (interfaces/index.html)
// Uso:  mongosh consultas/1_inicio.js
// =============================================================================

if (typeof mostrar === "undefined") load(__dirname + "/lib.js");

{
seccion("INICIO");

// -----------------------------------------------------------------------------
// 1.1 Título destacado (hero)
// Un solo documento trae todo lo que muestra el hero.
// -----------------------------------------------------------------------------
mostrar("1.1 Título destacado", () =>
  db.media.findOne(
    { is_featured: true },
    { title: 1, type: 1, plot: 1, release_year: 1, genre_ids: 1, rating: 1 }
  )
);

// -----------------------------------------------------------------------------
// 1.2 Catálogo de géneros
// media.genre_ids guarda slugs; los nombres y colores salen de genres
// (12 documentos que la aplicación carga una vez).
// -----------------------------------------------------------------------------
mostrar("1.2 Catálogo de géneros", () =>
  db.genres.find({}, { name: 1, color: 1 }).sort({ name: 1 })
, { limite: 12, ancho: 100 });

// -----------------------------------------------------------------------------
// 1.3 Seguir viendo
// La base devuelve las sesiones del usuario de los últimos 30 días, de la más
// nueva a la más vieja. La aplicación recorre la lista y se queda con la
// primera sesión de cada título: si no está terminada, va a "Seguir viendo".
// -----------------------------------------------------------------------------
const sesiones = db.views.find(
  { user_id: IDS.cinefan, ts: { $gte: haceDias(30) } },
  { media_id: 1, ts: 1, episode: 1, minutes: 1, completed: 1 }
).sort({ ts: -1 }).toArray();

const yaVisto = {};
const seguirViendo = [];
for (const s of sesiones) {
  const titulo = s.media_id.toString();
  if (yaVisto[titulo]) continue;          // ya tenemos la sesión más nueva de este título
  yaVisto[titulo] = true;
  if (!s.completed) seguirViendo.push(s);
}

// Nombres de esos títulos: $in busca varios _id a la vez
const nombres = {};
db.media.find({ _id: { $in: seguirViendo.map((s) => s.media_id) } }, { title: 1 })
  .forEach((m) => { nombres[m._id.toString()] = m.title; });

mostrar("1.3 Seguir viendo (CineFan88)", () =>
  seguirViendo.slice(0, 10).map((s) => ({ titulo: nombres[s.media_id.toString()], ts: s.ts, minutos: s.minutes, ...(s.episode && { episodio: s.episode }) }))
);

// -----------------------------------------------------------------------------
// 1.4 Top 10 de la semana
// $match: reproducciones de los últimos 7 días
// $group: una fila por título, contando con $sum
// $lookup: trae el título desde media
// -----------------------------------------------------------------------------
mostrar("1.4 Top 10 de la semana", () =>
  db.views.aggregate([
    { $match: { ts: { $gte: haceDias(7) } } },
    { $group: { _id: "$media_id", reproducciones: { $sum: 1 } } },
    { $sort: { reproducciones: -1 } },
    { $limit: 10 },
    { $lookup: { from: "media", localField: "_id", foreignField: "_id", as: "media" } },
    { $project: { _id: 0, reproducciones: 1, "media.title": 1, "media.type": 1 } },
  ])
, { limite: 10 });

// -----------------------------------------------------------------------------
// 1.5 Recién agregadas (created_at = alta en el catálogo, no fecha de estreno)
// -----------------------------------------------------------------------------
mostrar("1.5 Recién agregadas", () =>
  db.media.find({}, { title: 1, type: 1, release_year: 1, created_at: 1 })
    .sort({ created_at: -1 }).limit(12)
);

// -----------------------------------------------------------------------------
// 1.6 Recomendadas por género favorito
// El género sale del documento del usuario; después se buscan los mejor
// valorados de ese género. genre_ids es un array: { genre_ids: "x" } busca
// dentro del array.
// -----------------------------------------------------------------------------
const usuario = db.users.findOne({ _id: IDS.cinefan }, { favorite_genre_ids: 1 });
const favorito = usuario.favorite_genre_ids[0];
mostrar(`1.6 Porque te gusta "${favorito}"`, () =>
  db.media.find({ genre_ids: favorito }, { title: 1, type: 1, "rating.avg": 1 })
    .sort({ "rating.avg": -1 }).limit(12)
);

// -----------------------------------------------------------------------------
// 1.7 Series para maratonear (patrón polimórfico: filtro por type)
// -----------------------------------------------------------------------------
mostrar("1.7 Series mejor valoradas", () =>
  db.media.find({ type: "series" }, { title: 1, release_year: 1, "rating.avg": 1 })
    .sort({ "rating.avg": -1 }).limit(12)
);

// -----------------------------------------------------------------------------
// 1.8 Barra de búsqueda
// Expresión regular: /noche/i encuentra "noche" en cualquier parte del título,
// sin distinguir mayúsculas de minúsculas.
// -----------------------------------------------------------------------------
mostrar('1.8 Búsqueda: "noche"', () =>
  db.media.find({ title: /noche/i }, { title: 1, type: 1, release_year: 1 })
    .sort({ title: 1 }).limit(8)
);
}
