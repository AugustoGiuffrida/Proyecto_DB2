# Home

## 1\. Sección Principal (Hero Section)

Esta sección muestra un único elemento destacado. La consulta busca un documento en la colección `media` que tenga el campo `is_featured` establecido en `true`.

```javascript
// Busca UN documento que esté marcado como destacado
db.media.findOne({ is_featured: true })
```

  * **Nota:** `findOne` devuelve solo el primer documento que coincide. Si más de uno está marcado como `is_featured`, solo se mostrará uno (generalmente el primero encontrado por MongoDB).

-----

## 2\. Carrusel: Tendencias de la Semana

Este carrusel muestra los elementos más vistos semanalmente. Se ordena por `weekly_view_count` de forma descendente y se limita a 10 resultados.

```javascript
// Busca los 10 items con mayor weekly_view_count
db.media.aggregate([
  { $sort: { weekly_view_count: -1 } },
  { $limit: 10 },
  { $project: { title: 1, poster_image: 1, director: 1, main_cast: 1, rating_avg: 1, _id: 0}}])
```


  * **`.limit(10)`**: Restringe el resultado a los 10 primeros documentos.
  * **`.project({...})` (Opcional pero recomendado)**: Selecciona solo los campos que realmente necesitas mostrar en las *cards* del carrusel (título, póster, director, elenco, rating). Esto hace la consulta más eficiente al transferir menos datos. `_id: 0` excluye el campo `_id`.

-----

## 3\. Carrusel: Recién Añadidas

Este carrusel muestra los últimos elementos añadidos a la colección. Se ordena por el campo `createdAt` de forma descendente.

```javascript
// Busca los 10 items más recientes
db.media.aggregate([
  { $sort: { createdAt: -1 } },
  { $limit: 10 },
  { $project: { title: 1, poster_image: 1, director: 1, main_cast: 1, rating_avg: 1, _id: 0}}])
```

  * **`.sort({ createdAt: -1 })`**: Ordena los resultados por la fecha de creación, mostrando primero los más recientes.

-----

## 4\. Carrusel: Películas de Acción Populares

Este carrusel filtra por tipo "Movie" y género "Action", ordenando por la calificación promedio (`rating_avg`) de forma descendente.

```javascript
// Busca las 10 películas de acción con mejor rating
db.media.aggregate([
  { $match: { type: "Movie", genres: "Action" } },
  { $sort: { rating_avg: -1 } },
  { $limit: 10 },
  { $project: { title: 1, poster_image: 1, director: 1, main_cast: 1, rating_avg: 1, _id: 0}}])
```


-----

## 👤 Consultas para usuarios

### 1\. Cabecera del Perfil y Pestaña "Cuenta y Pagos"

Esta consulta obtiene todos los datos principales del documento del usuario.

```javascript
db.users.findOne({ _id: ObjectId("69016b295d0cf70c757ad50e") })
```

**Campos usados:** `username`, `email`, `createdAt`, `preferences.favorite_genres`, `personal_info`, `subscription`, `payment_methods`, `watchlist`, `watched_list`.

-----

### 2\. Pestaña "Mi Lista de Pendientes" (Watchlist)

Necesitas obtener el array `watchlist` del resultado de la Consulta 1 para usarlo aquí.

```javascript
db.users.aggregate([
  {
    $match: { _id: ObjectId("69016b295d0cf70c757ad50e") }
  },
  {
    $unwind: "$watchlist" 
  },
  {
    $lookup: {
      from: "media",      
      localField: "watchlist", 
      foreignField: "_id",    
      as: "mediaDetails"      
    }
  },
  {
    $unwind: "$mediaDetails"
  },
  {
    $project: {
      usuario:"$username",
      _id: "$mediaDetails._id", 
      title: "$mediaDetails.title",
      poster_image: "$mediaDetails.poster_image",
      director_name: "$mediaDetails.director.name",
    }
  }
])
```

-----

### 3\. Pestaña "Contenido Visto" (Watched List)

Similar a la watchlist, necesitas obtener el array `watched_list` del resultado de la Consulta 1.

```javascript
db.users.aggregate([
  {
    $match: { _id: ObjectId("69016b295d0cf70c757ad50e") }
  },
  {
    $unwind: "$watched_list" 
  },
  {
    $lookup: {
      from: "media",
      localField: "watched_list",
      foreignField: "_id",
      as: "mediaDetails"
    }
  },
  {
    $unwind: "$mediaDetails"
  },
  {
    $project: {
      usuario:"$username",
      _id: "$mediaDetails._id",
      title: "$mediaDetails.title",
      poster_image: "$mediaDetails.poster_image",
      type: "$mediaDetails.type",
      rating_avg: "$mediaDetails.rating_avg" 
    }
  }
])
```

-----

### 4\. Pestaña "Mis Reseñas"

Esta consulta combina datos de `reviews` y `media` usando el `_id` del usuario directamente.

```javascript
db.reviews.aggregate([
  {
    $match: { user_id: ObjectId("69016b295d0cf70c757ad50e") }
  },
  {
    $sort: { createdAt: -1 }
  },
  {
    $lookup: {
      from: "media",
      localField: "media_id",
      foreignField: "_id",
      as: "mediaDetails"
    }
  },
  {
    $project: {
       _id: 0,
       mediaTitle: { $first: "$mediaDetails.title" },
       rating: 1,
       comment: 1,
       createdAt: 1,
    }
  }
])
```

La etapa `$unwind` se usa en las *pipelines* de agregación de MongoDB para **descomponer (o "desenrollar") un campo que contiene un array**.

Imagina que tienes un documento de usuario como este (simplificado):

```javascript
// Documento ANTES de $unwind
{
  _id: ObjectId("69016b295d0cf70c757ad50e"),
  username: "CineFan88",
  watchlist: [ // <-- Un array
    ObjectId("media_id_1"),
    ObjectId("media_id_2"),
    ObjectId("media_id_3")
  ]
}
```

Cuando aplicas la etapa `{ $unwind: "$watchlist" }` a este documento, la salida **no será un solo documento, sino varios**. MongoDB crea una copia del documento original por **cada elemento** que había en el array especificado (`watchlist` en este caso). En cada copia, el campo del array es reemplazado por **uno solo** de los elementos originales.

Así se vería la salida **DESPUÉS** de `{ $unwind: "$watchlist" }`:

```javascript
// Documento 1 (Salida)
{
  _id: ObjectId("69016b295d0cf70c757ad50e"),
  username: "CineFan88",
  watchlist: ObjectId("media_id_1") // <-- Ahora es un solo valor
}

// Documento 2 (Salida)
{
  _id: ObjectId("69016b295d0cf70c757ad50e"),
  username: "CineFan88",
  watchlist: ObjectId("media_id_2") // <-- Ahora es un solo valor
}

// Documento 3 (Salida)
{
  _id: ObjectId("69016b295d0cf70c757ad50e"),
  username: "CineFan88",
  watchlist: ObjectId("media_id_3") // <-- Ahora es un solo valor
}
```

**¿Por qué lo usaste en tus consultas 2 y 3?**

Lo usaste porque querías hacer un `$lookup` (unir) con la colección `media` para obtener los detalles de **cada película/serie** en la `watchlist` (o `watched_list`). El `$lookup` necesita un campo con un valor *individual* (`localField`) para buscar en la otra colección (`foreignField`). Al usar `$unwind` primero sobre `watchlist`, transformaste el array de IDs en documentos individuales, cada uno con un solo `ObjectId` en el campo `watchlist`. Esto permite que el `$lookup` posterior funcione correctamente, buscando los detalles de cada `media` uno por uno. 

-----

## 🎬 Consultas para reseña

Esta vista carga la información detallada de un item específico (`media`) y luego todas sus reseñas asociadas.


### 1\. Sección de Información de la Película/Serie

Esta sección muestra los detalles completos del item seleccionado.

```javascript
db.media.findOne({ _id: ObjectId("69016b295d0cf70c757ad572") })
```

-----

### 2\. Sección de Reseñas de Usuarios

Esta sección muestra la lista de reseñas dejadas por los usuarios para ese item de `media`.

```javascript
db.reviews.aggregate([
  { $match: { media_id: ObjectId("69016b295d0cf70c757ad572") } },
  { $sort: { createdAt: -1 } },
  { $project: {
      _id: 1,
      user_info: 1, 
      rating: 1,
      comment: 1,
      createdAt: 1
    }
  }
])
```


-----

## 🗂️ Consultas Adicionales (Filtrado y Condicionales)

### 1\. Filtrado con `$gte` (mayor o igual) y `$lte` (menor o igual)

**Objetivo:** Buscar películas (`"Movie"`) que se consideran clásicos modernos (lanzadas entre 1990 y 1999) y que tengan una calificación alta (mayor o igual a 8.5).

```javascript
// Busca películas de los 90 con rating >= 8.5
db.media.aggregate([
  {
    $match: {
      type: "Movie",
      release_year: { $gte: 1990, $lte: 1999 },
      rating_avg: { $gte: 8.5 }
    }
  },
  {
    $project: {
      title: 1,
      release_year: 1,
      rating_avg: 1,
      _id: 0
    }
  }
])
```

  * **`$gte`**: Significa "Greater Than or Equal" (mayor o igual que).
  * **`$lte`**: Significa "Less Than or Equal" (menor o igual que).
  * Al poner ambos en el campo `release_year`, creamos un filtro de rango.

-----

### 2\. Filtrado con `$ne` (no igual a)

**Objetivo:** Buscar usuarios que **no** sean de un país específico (ej. "Argentina") para ver cuántos usuarios internacionales tienes.

```javascript
db.users.aggregate([
  {
    $match: {
      "personal_info.country": { $ne: "Argentina" }
    }
  },
  {
    $project: {
      username: 1,
      "personal_info.country": 1,
      _id: 0
    }
  }
])
```

  * **`$ne`**: Significa "Not Equal" (no igual a).
  * Nota: Usamos comillas (`"personal_info.country"`) para acceder al campo anidado.

### 3\. Añadir elementos a un array

```javascript
db.users.updateOne(
  { _id: ObjectId("69016b295d0cf70c757ad50e") },
  {
    $push: {
      "preferences.favorite_genres": {
        $each: ["Action", "Drama", "Sci-Fi", "Thriller"]
      }
    }
  }
)
```

### 4\. Asiganar valor a una clave

```javascript
db.users.updateOne(
  { _id: ObjectId("69016b295d0cf70c757ad50e") },
  {
    $set: {
      "personal_info.country": "Chile"
    }
  }
)
```