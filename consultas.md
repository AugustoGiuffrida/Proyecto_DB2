# Consultas — Fotograma

Todas las consultas de la aplicación, organizadas por pantalla del prototipo ([`interfaces/`](interfaces/)). Al final hay dos secciones más: las operaciones de escritura y los reportes analíticos.


## Cómo ejecutarlas

- **Pegándolas en la shell:** el código se puede pegar tal cual en `mongosh`, después de `use fotograma`.
- **Con los scripts:** cada sección tiene su script ejecutable en [`consultas/`](consultas/), que muestra los resultados con el tiempo de cada consulta.

```bash
mongosh consultas/todas.js          # todas
mongosh consultas/1_inicio.js       # una pantalla
```

Con Docker: `docker compose exec mongo mongosh consultas/todas.js`.

### Datos de referencia

Las consultas usan documentos semilla, que vienen del prototipo y tienen `_id` fijos:

| Documento | `_id` |
|---|---|
| Usuario **CineFan88** (el usuario logueado) | `ObjectId("665f0c000000000000000001")` |
| **El Eternauta** (serie destacada) | `ObjectId("665f0a000000000000000010")` |
| **Breaking Bad** | `ObjectId("665f0a000000000000000012")` |
| **Ricardo Darín** | `ObjectId("665f0b000000000000000010")` |
| **Christopher Nolan** | `ObjectId("665f0b000000000000000001")` |

Los datos se generaron con **"hoy" = 6 de octubre de 2026** (`db/config.js`). Por eso "últimos 30 días" es `started_at >= ISODate("2026-09-06T12:00:00Z")`.

---

## 1. Inicio

### 1.1 Título destacado (hero)

Un solo documento trae todo lo que muestra el hero.

```js
db.media.findOne(
  { is_featured: true },
  { title: 1, type: 1, plot: 1, release_year: 1, genre_ids: 1, rating: 1 }
)
```
```js
{ title: "El Eternauta", type: "series", release_year: 2025, plot: "Una noche, en Buenos Aires…",
  genre_ids: ["ciencia-ficcion", "drama", "thriller"], rating: { avg: 8.3, count: 1497 } }
```

### 1.2 Catálogo de géneros

`media.genre_ids` guarda slugs. Los nombres y colores salen de `genres`, que tiene 12 documentos: la aplicación la carga una vez y la reutiliza en toda la interfaz.

```js
db.genres.find({}, { name: 1, color: 1 }).sort({ name: 1 })
```
```js
{ _id: "accion", name: "Acción", color: "#ff6a3d" }
{ _id: "animacion", name: "Animación", color: "#ff7ac6" }
…  // 12 géneros
```

### 1.3 Top 10 de la semana

Cada etapa del `aggregate` hace una cosa:
- `$match` toma las reproducciones de los últimos 7 días (índice `views_por_fecha`).
- `$group` arma una fila por título y cuenta las reproducciones con `$sum`.
- `$sort` y `$limit` dejan los 10 primeros.
- `$lookup` trae el título desde `media`.
- `$project` deja solo los campos que se muestran.

```js
db.views.aggregate([
  { $match: { started_at: { $gte: ISODate("2026-09-29T12:00:00Z") } } },
  { $group: { _id: "$media_id", reproducciones: { $sum: 1 } } },
  { $sort: { reproducciones: -1 } },
  { $limit: 10 },
  { $lookup: { from: "media", localField: "_id", foreignField: "_id", as: "media" } },
  { $project: { _id: 0, reproducciones: 1, "media.title": 1, "media.type": 1 } }
])
```
```js
{ reproducciones: 5851, media: [{ title: "El origen", type: "movie" }] }
{ reproducciones: 4736, media: [{ title: "Duna: Parte dos", type: "movie" }] }
{ reproducciones: 3196, media: [{ title: "Interestelar", type: "movie" }] }
…  // 10 resultados
```

### 1.4 Recién agregadas

`created_at` es la fecha de **alta en el catálogo**, no la de estreno.

```js
db.media.find({}, { title: 1, type: 1, release_year: 1, created_at: 1 })
  .sort({ created_at: -1 }).limit(12)
```
```js
{ title: "Ruta silenciosa", type: "movie", release_year: 1967, created_at: 2026-10-05 09:22 }
{ title: "Código Fénix",    type: "movie", release_year: 1986, created_at: 2026-10-04 01:26 }
…
```

### 1.5 Recomendadas por género favorito

Se resuelve en dos pasos:
1. El género sale del documento del usuario.
2. Se buscan los títulos mejor valorados de ese género.

Como `genre_ids` es un array, `{ genre_ids: "ciencia-ficcion" }` busca **dentro** del array.

```js
db.users.findOne({ _id: ObjectId("665f0c000000000000000001") }, { favorite_genre_ids: 1 })
// → favorite_genre_ids: ["ciencia-ficcion", "drama", "thriller"]

db.media.find({ genre_ids: "ciencia-ficcion" }, { title: 1, type: 1, "rating.avg": 1 })
  .sort({ "rating.avg": -1 }).limit(12)
```
```js
{ title: "Casa dorada",   type: "series", rating: { avg: 9.5 } }
{ title: "Río prohibido", type: "series", rating: { avg: 9.5 } }
…
```

### 1.6 Filtrar media por tipo

Es el patrón polimórfico en acción: películas y series están en la misma colección y se separan por `type`.

```js
db.media.find({ type: "series" }, { title: 1, release_year: 1, "rating.avg": 1 })
  .sort({ "rating.avg": -1 }).limit(12)
```
```js
{ title: "Río prohibido", release_year: 2018, rating: { avg: 9.5 } }
{ title: "Breaking Bad",  release_year: 2008, rating: { avg: 9.3 } }
…
```

---

## 2. Detalle de un título

### 2.1 Documento completo

Un solo `findOne` arma casi toda la pantalla: datos, directores y reparto (referencia extendida) y, en las series, temporadas y episodios embebidos.

```js
db.media.findOne({ _id: ObjectId("665f0a000000000000000010") })
```
```js
{ title: "El Eternauta", type: "series", release_year: 2025, plot: "…",
  genre_ids: ["ciencia-ficcion", "drama", "thriller"], rating: { avg: 8.3, count: 1497 },
  directors: [{ person_id: …, name: "Bruno Stagnaro" }],
  cast: [{ person_id: …, name: "Ricardo Darín", character: "Juan Salvo" }, …],
  seasons: [{ number: 1, year: 2025, episodes: [{ number: 1, title: "Una noche de truco", runtime_min: 58 }, …] }] }
```

### 2.2 Reseñas más recientes

Cada reseña trae una copia del `username` y del `avatar`, así que no hace falta consultar `users` para mostrarlas.

```js
db.reviews.find(
  { media_id: ObjectId("665f0a000000000000000010") },
  { _id: 0, user: 1, rating: 1, comment: 1, created_at: 1 }
).sort({ created_at: -1 }).limit(10)
```
```js
{ user: { username: "mateo.quiroga62", avatar: "…" }, rating: 8, comment: "Me atrapó desde el primer minuto…", created_at: 2026-10-06 11:09 }
{ user: { username: "santiago_garcia", avatar: "…" }, rating: 7, created_at: 2026-10-06 09:13 }
…
```

### 2.3 Última reproducción del usuario

Filtra por usuario y título, y ordena por fecha. Usa el índice `views_por_usuario` (`{ user_id: 1, started_at: -1 }`).

```js
db.views.find(
  { user_id: ObjectId("665f0c000000000000000001"), media_id: ObjectId("665f0a000000000000000010") },
  { _id: 0, started_at: 1, episode: 1, minutes: 1, completed: 1 }
).sort({ started_at: -1 }).limit(1)
```
```js
{ started_at: 2026-10-03 23:10, episode: { season: 1, number: 4 }, minutes: 32, completed: false }
```

### 2.4 Títulos similares

- `$in` busca los títulos que tienen **al menos uno** de los géneros indicados.
- `$ne` excluye el título que se está viendo.

```js
db.media.find(
  { genre_ids: { $in: ["ciencia-ficcion", "drama", "thriller"] },
    _id: { $ne: ObjectId("665f0a000000000000000010") } },
  { title: 1, genre_ids: 1, "rating.avg": 1 }
).sort({ "rating.avg": -1 }).limit(10)
```
```js
{ title: "Río prohibido", genre_ids: ["romance", "ciencia-ficcion", "terror"], rating: { avg: 9.5 } }
{ title: "Casa dorada",   genre_ids: ["ciencia-ficcion"], rating: { avg: 9.5 } }
…
```

---

## 3. Persona

### 3.1 Ficha de la persona

La biografía, la fecha y el país solo se muestran en esta pantalla. Por eso viven en `people` y no se copian en `media`.

```js
db.people.findOne({ _id: ObjectId("665f0b000000000000000010") })
```
```js
{ name: "Ricardo Darín", known_for: "Actuación", birth_date: 1957-01-16, country: "Argentina", bio: "…", photo: "people/ricardo-darin.jpg" }
```

### 3.2 Filmografía (muchos a muchos, vista desde `people`)

No hace falta guardar en `people` la lista de títulos: se buscan los títulos cuyo array `cast` (o `directors`) contiene a la persona.

```js
// títulos donde actuó
db.media.find({ "cast.person_id": ObjectId("665f0b000000000000000010") }, { title: 1, release_year: 1 })
  .sort({ release_year: -1 })

// títulos que dirigió
db.media.find({ "directors.person_id": ObjectId("665f0b000000000000000001") }, { title: 1, release_year: 1 })
  .sort({ release_year: -1 })
```
```js
// Ricardo Darín (actuó)                        // Christopher Nolan (dirigió)
{ title: "El Eternauta", release_year: 2025 }       { title: "Oppenheimer", release_year: 2023 }
{ title: "Relatos salvajes", release_year: 2014 }   { title: "Interestelar", release_year: 2014 }
{ title: "El secreto de sus ojos", … 2009 }         { title: "El origen", release_year: 2010 }
{ title: "Nueve reinas", release_year: 2000 }       { title: "Batman: El caballero de la noche", … 2008 }
```

### 3.3 Estadísticas de la filmografía

- `$project` con `$cond` marca cada título con 1 si es serie y 0 si es película.
- `$group` con `_id: null` reúne todo en un solo resultado: cuenta los títulos, suma las marcas y promedia el rating.

```js
db.media.aggregate([
  { $match: { "cast.person_id": ObjectId("665f0b000000000000000010") } },
  { $project: {
      rating: "$rating.avg",
      esSerie: { $cond: { if: { $eq: ["$type", "series"] }, then: 1, else: 0 } }
  } },
  { $group: {
      _id: null,
      titulos: { $sum: 1 },
      series: { $sum: "$esSerie" },
      rating_promedio: { $avg: "$rating" }
  } }
])
```
```js
{ _id: null, titulos: 4, series: 1, rating_promedio: 8.1 }
```

---

## 4. Género / Explorar

### 4.1 Encabezado del género

El `_id` es un slug legible, por eso también se usa en la URL: `genero.html?id=ciencia-ficcion`.

```js
db.genres.findOne({ _id: "ciencia-ficcion" })
```
```js
{ _id: "ciencia-ficcion", name: "Ciencia Ficción", color: "#4f7cff", description: "Futuros posibles, viajes en el tiempo…" }
```

### 4.2 Resultados con filtros, orden y paginado

Los botones de la barra se traducen directamente al filtro y al orden. Para paginar, `skip` saltea los resultados de las páginas anteriores.

```js
// página 1 y página 2 (24 por página)
db.media.find({ genre_ids: "ciencia-ficcion", type: "movie" }, { title: 1, type: 1, release_year: 1, "rating.avg": 1 })
  .sort({ "rating.avg": -1 }).skip(0).limit(24)
db.media.find({ genre_ids: "ciencia-ficcion", type: "movie" }, { title: 1, type: 1, release_year: 1, "rating.avg": 1 })
  .sort({ "rating.avg": -1 }).skip(24).limit(24)

// otro orden: más nuevas primero
db.media.find({ genre_ids: "ciencia-ficcion", type: "movie" }, { title: 1, type: 1, release_year: 1, "rating.avg": 1 })
  .sort({ release_year: -1 }).limit(24)
```
```js
// página 1                                            // página 2
{ title: "El origen",         rating: { avg: 8.8 } }   { title: "Umbral dorado",               rating: { avg: 8.2 } }
{ title: "Operación Quimera", rating: { avg: 8.8 } }   { title: "Mad Max: Furia en el camino", rating: { avg: 8.1 } }
…                                                      …
```

### 4.3 Cantidad por tipo (contadores de los botones Películas / Series)

```js
db.media.aggregate([
  { $match: { genre_ids: "ciencia-ficcion" } },
  { $group: { _id: "$type", titulos: { $sum: 1 } } }
])
```
```js
{ _id: "series", titulos: 136 }
{ _id: "movie",  titulos: 310 }
```

### 4.4 Rango de años y de rating (`$gte` / `$lte`)

```js
db.media.find(
  { genre_ids: "ciencia-ficcion", release_year: { $gte: 1990, $lte: 1999 }, "rating.avg": { $gte: 7.5 } },
  { title: 1, type: 1, release_year: 1, "rating.avg": 1 }
).sort({ "rating.avg": -1 })
```
```js
{ title: "Casa dorada", release_year: 1991, rating: { avg: 9.5 } }
{ title: "El desierto de Montevideo", release_year: 1990, rating: { avg: 8.5 } }
…  // 14 resultados
```

### 4.5 Varios géneros a la vez (`$in`)

```js
db.media.find({ genre_ids: { $in: ["ciencia-ficcion", "terror"] } }, { title: 1, genre_ids: 1, "rating.avg": 1 })
  .sort({ "rating.avg": -1 }).limit(10)
```
```js
{ title: "Río prohibido", genre_ids: ["romance", "ciencia-ficcion", "terror"], rating: { avg: 9.5 } }
{ title: "Casa dorada",   genre_ids: ["ciencia-ficcion"], rating: { avg: 9.5 } }
{ title: "Fuga perdida",  genre_ids: ["terror", "romance"], rating: { avg: 9.4 } }
…
```

---

## 5. Perfil

### 5.1 Documento del usuario

La suscripción y los métodos de pago están embebidos, así que un solo `findOne` alcanza. La proyección `password_hash: 0` excluye el hash, que nunca se envía al cliente.

```js
db.users.findOne({ _id: ObjectId("665f0c000000000000000001") }, { password_hash: 0, watchlist: 0 })
```
```js
{ username: "CineFan88", email: "cinefan@email.com", country: "Argentina", created_at: 2024-01-15,
  favorite_genre_ids: ["ciencia-ficcion", "drama", "thriller"],
  subscription: { plan: "Premium", billing: "anual", renewal_date: 2027-01-15 },
  payment_methods: [{ type: "card", brand: "Visa", last4: "4242", expiry: "08/28", is_default: true },
                    { type: "mercadopago", email: "cinefan@email.com", is_default: false }] }
```

### 5.2 Mi lista

`watchlist` es un array de `ObjectId`. El `$lookup` busca en `media` cada `_id` del array y devuelve los títulos en `items`.

```js
db.users.aggregate([
  { $match: { _id: ObjectId("665f0c000000000000000001") } },
  { $lookup: { from: "media", localField: "watchlist", foreignField: "_id", as: "items" } },
  { $project: { _id: 0, "items.title": 1, "items.type": 1, "items.release_year": 1 } }
])
```
```js
{ items: [ { title: "Duna: Parte dos", type: "movie",  release_year: 2024 },
           { title: "La llegada",      type: "movie",  release_year: 2016 },
           { title: "Parásitos",       type: "movie",  release_year: 2019 },
           { title: "Separación",      type: "series", release_year: 2022 },
           { title: "Nueve reinas",    type: "movie",  release_year: 2000 } ] }
```

### 5.3 Historial de reproducción

Lo "visto" no se guarda como una lista en `users`: sale de la colección `views`.

```js
db.views.aggregate([
  { $match: { user_id: ObjectId("665f0c000000000000000001"),
              started_at: { $gte: ISODate("2026-09-06T12:00:00Z") } } },
  { $sort: { started_at: -1 } },
  { $lookup: { from: "media", localField: "media_id", foreignField: "_id", as: "media" } },
  { $project: { _id: 0, started_at: 1, "media.title": 1, episode: 1, minutes: 1, completed: 1 } }
])
```
```js
{ started_at: 2026-10-06 03:33, minutes: 56, completed: false, media: [{ title: "El pacto blanco" }] }
{ started_at: 2026-10-06 03:20, minutes: 27, completed: true, episode: { season: 1, number: 5 }, media: [{ title: "Fuga blanca" }] }
…  // 69 sesiones
```

### 5.4 Mis reseñas

La colección `reviews` también se consulta desde el usuario. El nombre del título se trae con `$lookup`.

```js
db.reviews.aggregate([
  { $match: { user_id: ObjectId("665f0c000000000000000001") } },
  { $sort: { created_at: -1 } },
  { $lookup: { from: "media", localField: "media_id", foreignField: "_id", as: "media" } },
  { $project: { _id: 0, rating: 1, comment: 1, created_at: 1, "media.title": 1 } }
])
```
```js
{ rating: 6, comment: "Las actuaciones sostienen una historia previsible.", created_at: 2026-09-27, media: [{ title: "Testigo" }] }
{ rating: 8, comment: "Me atrapó desde el primer minuto.", created_at: 2026-09-27, media: [{ title: "La verdad de Valparaíso: el regreso" }] }
…  // 26 reseñas
```

---

## 6. Escrituras

En el script [`consultas/6_escritura.js`](consultas/6_escritura.js) cada operación muestra el antes y el después y **deshace su cambio al final**, así la base queda igual.

### 6.1 Agregar y quitar de Mi lista (`$push` / `$pull`)

El filtro `{ watchlist: { $ne: id } }` hace que `$push` solo se aplique si el título todavía no está en la lista. Así, repetir la operación no lo duplica.

```js
db.users.updateOne(
  { _id: ObjectId("665f0c000000000000000001"), watchlist: { $ne: ObjectId("665f0a000000000000000012") } },
  { $push: { watchlist: ObjectId("665f0a000000000000000012") } }
)
db.users.updateOne(
  { _id: ObjectId("665f0c000000000000000001") },
  { $pull: { watchlist: ObjectId("665f0a000000000000000012") } }
)
```
```
$push              → { coincidencias: 1, modificados: 1 }   títulos en la lista: 6
$push otra vez     → { coincidencias: 0, modificados: 0 }   títulos en la lista: 6  (ya estaba: no se duplica)
$pull              → { coincidencias: 1, modificados: 1 }   títulos en la lista: 5
```

### 6.2 Géneros favoritos: operadores de arrays

- `$push` + `$each` agrega varios elementos al final.
- `$pop: 1` quita el último.
- `$pull` quita los que coinciden con un valor.

```js
db.users.updateOne({ _id: ObjectId("665f0c000000000000000001") },
                   { $push: { favorite_genre_ids: { $each: ["terror", "comedia"] } } })
db.users.updateOne({ _id: ObjectId("665f0c000000000000000001") }, { $pop: { favorite_genre_ids: 1 } })
db.users.updateOne({ _id: ObjectId("665f0c000000000000000001") }, { $pull: { favorite_genre_ids: "terror" } })
```
```
inicial          ["ciencia-ficcion", "drama", "thriller"]
$push + $each    ["ciencia-ficcion", "drama", "thriller", "terror", "comedia"]
$pop: 1          ["ciencia-ficcion", "drama", "thriller", "terror"]
$pull "terror"   ["ciencia-ficcion", "drama", "thriller"]
```

### 6.3 Escribir una reseña y recalcular el rating (patrón computado)

1. `insertOne` guarda la reseña, con la copia del `username` (referencia extendida).
2. Un `aggregate` con `$match` + `$group` calcula el promedio y la cantidad de reseñas del título.
3. `updateOne` con `$set` guarda el resultado en `media.rating`.

El índice único `{ media_id, user_id }` impide que el mismo usuario reseñe dos veces el mismo título.

```js
db.reviews.insertOne({
  media_id: ObjectId("665f0a000000000000000012"),
  user_id: ObjectId("665f0c000000000000000001"),
  user: { username: "CineFan88", avatar: "avatars/cinefan88.jpg" },
  rating: 10,
  comment: "La mejor serie que vi en mi vida.",
  created_at: new Date()
})

db.reviews.aggregate([
  { $match: { media_id: ObjectId("665f0a000000000000000012") } },
  { $group: { _id: "$media_id", avg: { $avg: "$rating" }, count: { $sum: 1 } } }
])
// → { _id: …, avg: 9.288…, count: 1243 }

db.media.updateOne(
  { _id: ObjectId("665f0a000000000000000012") },
  { $set: { "rating.avg": 9.3, "rating.count": 1243 } }
)
```
```
rating antes:            { avg: 9.3, count: 1242 }
insertOne + recálculo →  { avg: 9.3, count: 1243 }
segunda reseña del mismo usuario → rechazada (E11000 duplicate key: índice único)
deleteOne + recálculo →  { avg: 9.3, count: 1242 }   (deshecho)
```

### 6.4 Borrar un dato opcional (`$unset`)

```js
db.users.updateOne({ _id: ObjectId("665f0c000000000000000001") }, { $unset: { birth_date: "" } })
```
```
$unset → birth_date: undefined   (el campo ya no existe en el documento)
```

### 6.5 Renombrar un género

Como `media.genre_ids` guarda el slug y no el nombre, renombrar es modificar **un solo documento**. Ningún título cambia.

```js
db.genres.updateOne({ _id: "ciencia-ficcion" }, { $set: { name: "Sci-Fi" } })
```
```
genres.updateOne → { coincidencias: 1, modificados: 1 }
títulos que siguen apuntando al género: 446 (no se tocaron)
```

### 6.6 Registrar una reproducción

Cada reproducción es un documento nuevo en `views`.

```js
db.views.insertOne({
  user_id: ObjectId("665f0c000000000000000001"),
  media_id: ObjectId("665f0a000000000000000010"),
  started_at: new Date(),
  episode: { season: 1, number: 5 },
  minutes: 58,
  completed: true
})
```

---

## 7. Reportes analíticos

Son consultas para el equipo de la plataforma, no para el usuario.

### 7.1 Películas y series: cantidad y rating promedio

```js
db.media.aggregate([
  { $group: { _id: "$type", titulos: { $sum: 1 }, rating_promedio: { $avg: "$rating.avg" } } }
])
```
```js
{ _id: "movie",  titulos: 2107, rating_promedio: 6.8 }
{ _id: "series", titulos: 909,  rating_promedio: 6.84 }
```

### 7.2 Clasificación de títulos con `$cond`

`$project` agrega un campo calculado: "Destacado" si el rating es 8 o más, "Resto" si no. Después `$group` cuenta cuántos hay de cada clase.

```js
db.media.aggregate([
  { $project: { clase: { $cond: { if: { $gte: ["$rating.avg", 8] }, then: "Destacado", else: "Resto" } } } },
  { $group: { _id: "$clase", titulos: { $sum: 1 } } }
])
```
```js
{ _id: "Resto",     titulos: 2683 }
{ _id: "Destacado", titulos: 333 }
```

### 7.3 Distribución de puntajes de las reseñas

```js
db.reviews.aggregate([
  { $group: { _id: "$rating", resenas: { $sum: 1 } } },
  { $sort: { _id: -1 } }
])
```
```js
{ _id: 10, resenas: 10886 }
{ _id: 9,  resenas: 21019 }
{ _id: 8,  resenas: 33086 }
{ _id: 7,  resenas: 36539 }
…
```

### 7.4 Usuarios por país

```js
db.users.aggregate([
  { $group: { _id: "$country", usuarios: { $sum: 1 } } },
  { $sort: { usuarios: -1 } }
])
```
```js
{ _id: "Argentina", usuarios: 5461 }
{ _id: "Chile",     usuarios: 1016 }
{ _id: "México",    usuarios: 889 }
…
```

### 7.5 Usuarios por plan (campo de un subdocumento)

```js
db.users.aggregate([
  { $group: { _id: "$subscription.plan", usuarios: { $sum: 1 } } },
  { $sort: { usuarios: -1 } }
])
```
```js
{ _id: "Estándar", usuarios: 4051 }
{ _id: "Básico",   usuarios: 3474 }
{ _id: "Premium",  usuarios: 2481 }
```

### 7.6 Los usuarios que más miraron en el último mes

`$group` sobre `views` suma los minutos de cada usuario, y `$lookup` trae el username y el plan.

```js
db.views.aggregate([
  { $match: { started_at: { $gte: ISODate("2026-09-06T12:00:00Z") } } },
  { $group: { _id: "$user_id", minutos: { $sum: "$minutes" } } },
  { $sort: { minutos: -1 } },
  { $limit: 5 },
  { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "usuario" } },
  { $project: { _id: 0, minutos: 1, "usuario.username": 1, "usuario.subscription.plan": 1 } }
])
```
```js
{ minutos: 19036, usuario: [{ username: "nicolas_weber",  subscription: { plan: "Premium" } }] }
{ minutos: 18781, usuario: [{ username: "benjamin_ponce", subscription: { plan: "Premium" } }] }
…
```
