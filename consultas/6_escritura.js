// =============================================================================
// Operaciones de ESCRITURA de la aplicación
//
// Cada operación muestra el antes y el después, y al final DESHACE su cambio:
// el script se puede correr las veces que haga falta sin alterar la base.
//
// Uso:  mongosh consultas/6_escritura.js
// =============================================================================

if (typeof mostrar === "undefined") load(__dirname + "/lib.js");

{
seccion("ESCRITURA");

const resultado = (r) => ({ coincidencias: r.matchedCount, modificados: r.modifiedCount });

// -----------------------------------------------------------------------------
// 6.1 Agregar y quitar de Mi lista ($push / $pull)
// El filtro { watchlist: { $ne: id } } hace que $push solo se aplique si el
// título todavía no está en la lista: así no se duplica.
// -----------------------------------------------------------------------------
print("\n▸ 6.1 Mi lista: agregar y quitar Breaking Bad");
const cantidadLista = () => db.users.findOne({ _id: IDS.cinefan }).watchlist.length;
print(`    títulos en la lista: ${cantidadLista()}`);

let r = db.users.updateOne(
  { _id: IDS.cinefan, watchlist: { $ne: IDS.breakingBad } },
  { $push: { watchlist: IDS.breakingBad } }
);
print(`    $push              → ${linea(resultado(r))}   títulos: ${cantidadLista()}`);
r = db.users.updateOne(
  { _id: IDS.cinefan, watchlist: { $ne: IDS.breakingBad } },
  { $push: { watchlist: IDS.breakingBad } }
);
print(`    $push otra vez     → ${linea(resultado(r))}   títulos: ${cantidadLista()}   (ya estaba: no se duplica)`);
r = db.users.updateOne({ _id: IDS.cinefan }, { $pull: { watchlist: IDS.breakingBad } });
print(`    $pull              → ${linea(resultado(r))}   títulos: ${cantidadLista()}`);

// -----------------------------------------------------------------------------
// 6.2 Géneros favoritos: operadores de arrays
// $push + $each agrega varios elementos al final, $pop: 1 quita el último,
// $pull quita los que coinciden con el valor.
// -----------------------------------------------------------------------------
print("\n▸ 6.2 Géneros favoritos ($push + $each, $pop, $pull)");
const favoritos = () => linea(db.users.findOne({ _id: IDS.cinefan }).favorite_genre_ids);
print(`    inicial          ${favoritos()}`);
db.users.updateOne({ _id: IDS.cinefan }, { $push: { favorite_genre_ids: { $each: ["terror", "comedia"] } } });
print(`    $push + $each    ${favoritos()}`);
db.users.updateOne({ _id: IDS.cinefan }, { $pop: { favorite_genre_ids: 1 } });
print(`    $pop: 1          ${favoritos()}`);
db.users.updateOne({ _id: IDS.cinefan }, { $pull: { favorite_genre_ids: "terror" } });
print(`    $pull "terror"   ${favoritos()}`);

// -----------------------------------------------------------------------------
// 6.3 Escribir una reseña y recalcular el rating del título (patrón computado)
// 1) insertOne en reviews
// 2) aggregate: $match + $group calcula promedio y cantidad de reseñas
// 3) updateOne con $set guarda el resultado en media.rating
// El índice único { media_id, user_id } impide reseñar dos veces el mismo título.
// -----------------------------------------------------------------------------
print("\n▸ 6.3 CineFan88 reseña Breaking Bad");
const recalcularRating = function (mediaId) {
  const calculo = db.reviews.aggregate([
    { $match: { media_id: mediaId } },
    { $group: { _id: "$media_id", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]).toArray()[0];
  db.media.updateOne(
    { _id: mediaId },
    { $set: { "rating.avg": Math.round(calculo.avg * 10) / 10, "rating.count": calculo.count } }
  );
};
const rating = () => linea(db.media.findOne({ _id: IDS.breakingBad }).rating);
const usuario = db.users.findOne({ _id: IDS.cinefan }, { username: 1, avatar: 1 });

print(`    rating antes:            ${rating()}`);
const nueva = db.reviews.insertOne({
  media_id: IDS.breakingBad,
  user_id: IDS.cinefan,
  user: { username: usuario.username, avatar: usuario.avatar },   // copia (referencia extendida)
  rating: 10,
  comment: "La mejor serie que vi en mi vida.",
  created_at: new Date(),
});
recalcularRating(IDS.breakingBad);
print(`    insertOne + recálculo →  ${rating()}`);

try {
  db.reviews.insertOne({ media_id: IDS.breakingBad, user_id: IDS.cinefan, user: { username: usuario.username },
                         rating: 1, created_at: new Date() });
  print("    ✗ se aceptó una segunda reseña del mismo usuario");
} catch (e) {
  print("    segunda reseña del mismo usuario → rechazada (E11000 duplicate key: índice único)");
}

db.reviews.deleteOne({ _id: nueva.insertedId });
recalcularRating(IDS.breakingBad);
print(`    deleteOne + recálculo →  ${rating()}   (deshecho)`);

// -----------------------------------------------------------------------------
// 6.4 Cambiar de plan ($set sobre campos de un subdocumento)
// La notación con punto modifica campos de un documento embebido.
// -----------------------------------------------------------------------------
print("\n▸ 6.4 Cambiar el plan de CineFan88 a Estándar mensual");
const plan = () => linea(db.users.findOne({ _id: IDS.cinefan }).subscription);
print(`    antes:    ${plan()}`);
db.users.updateOne({ _id: IDS.cinefan }, { $set: { "subscription.plan": "Estándar", "subscription.billing": "mensual" } });
print(`    después:  ${plan()}`);
db.users.updateOne({ _id: IDS.cinefan }, { $set: { "subscription.plan": "Premium", "subscription.billing": "anual" } });
print(`    deshecho: ${plan()}`);

// -----------------------------------------------------------------------------
// 6.5 Borrar un dato opcional ($unset)
// -----------------------------------------------------------------------------
print("\n▸ 6.5 Quitar la fecha de nacimiento (dato opcional)");
const nacimiento = db.users.findOne({ _id: IDS.cinefan }).birth_date;
db.users.updateOne({ _id: IDS.cinefan }, { $unset: { birth_date: "" } });
print(`    $unset → birth_date: ${db.users.findOne({ _id: IDS.cinefan }).birth_date}`);
db.users.updateOne({ _id: IDS.cinefan }, { $set: { birth_date: nacimiento } });
print(`    deshecho → birth_date: ${linea(db.users.findOne({ _id: IDS.cinefan }).birth_date)}`);

// -----------------------------------------------------------------------------
// 6.6 Renombrar un género: UN solo documento
// Como media.genre_ids guarda el slug (no el nombre), ningún título cambia.
// -----------------------------------------------------------------------------
print("\n▸ 6.6 Renombrar \"Ciencia Ficción\" a \"Sci-Fi\"");
r = db.genres.updateOne({ _id: "ciencia-ficcion" }, { $set: { name: "Sci-Fi" } });
print(`    genres.updateOne → ${linea(resultado(r))}`);
print(`    títulos que siguen apuntando al género: ${db.media.countDocuments({ genre_ids: "ciencia-ficcion" })} (no se tocaron)`);
db.genres.updateOne({ _id: "ciencia-ficcion" }, { $set: { name: "Ciencia Ficción" } });
print(`    deshecho → ${db.genres.findOne({ _id: "ciencia-ficcion" }).name}`);

// -----------------------------------------------------------------------------
// 6.7 Corregir el nombre de una persona: el COSTO de la referencia extendida
// El nombre está copiado en media.cast, así que además de people hay que
// actualizar cada título donde aparece. Se recorren con un for: en cada uno
// se corrige el array cast y se guarda con $set.
// -----------------------------------------------------------------------------
print("\n▸ 6.7 Corregir el nombre de Ricardo Darín en people y en media.cast");
const renombrarPersona = function (personId, nombre) {
  db.people.updateOne({ _id: personId }, { $set: { name: nombre } });
  let titulos = 0;
  for (const m of db.media.find({ "cast.person_id": personId }, { cast: 1 }).toArray()) {
    for (const c of m.cast) {
      if (c.person_id.equals(personId)) c.name = nombre;
    }
    db.media.updateOne({ _id: m._id }, { $set: { cast: m.cast } });
    titulos++;
  }
  return titulos;
};
print(`    títulos actualizados: ${renombrarPersona(IDS.darin, "Ricardo A. Darín")}`);
print(`    en El Eternauta: ${db.media.findOne({ _id: IDS.eternauta }).cast[0].name}`);
renombrarPersona(IDS.darin, "Ricardo Darín");
print(`    deshecho → ${db.media.findOne({ _id: IDS.eternauta }).cast[0].name}`);

// -----------------------------------------------------------------------------
// 6.8 Registrar una reproducción (insert en la serie temporal)
// -----------------------------------------------------------------------------
print("\n▸ 6.8 Registrar una reproducción de El Eternauta, episodio 5");
const sesion = { ts: new Date(), meta: { user_id: IDS.cinefan }, media_id: IDS.eternauta,
                 episode: { season: 1, number: 5 }, minutes: 58, completed: true };
db.views.insertOne(sesion);
const ultima = db.views.find({ "meta.user_id": IDS.cinefan }).sort({ ts: -1 }).limit(1).toArray()[0];
print(`    última sesión del usuario: ${linea({ ts: ultima.ts, episode: ultima.episode, minutes: ultima.minutes })}`);
r = db.views.deleteOne({ "meta.user_id": IDS.cinefan, ts: sesion.ts });
print(`    deshecho → ${r.deletedCount} documento borrado`);
}
