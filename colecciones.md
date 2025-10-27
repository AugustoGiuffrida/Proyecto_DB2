## Colecciones Propuestas

1.  **`media`**: Colección principal que almacenará tanto películas como series. Será la fuente de datos para el **Home** y la **vista de Detalles/Reseñas**.
2.  **`users`**: Almacenará los datos de los usuarios, incluyendo sus listas y preferencias. Será la fuente principal para la **vista de Perfil**.
3.  **`reviews`**: Almacenará todas las reseñas de los usuarios. Se consultará en la **vista de Detalles** y en la **vista de Perfil**.

---

### Colección 1: `media`

Esta colección es la principal del catálogo. Usa el **Patrón Polimórfico**, donde un campo `type` nos permitirá diferenciar entre películas y series dentro de la misma colección.

El Patrón Polimórfico es usar una sola colección para guardar documentos que son conceptualmente lo mismo, pero que tienen "formas" o "atributos" ligeramente diferentes según su subtipo.

#### Estructura del Documento `media`:

```javascript
{
  "_id": ObjectId("..."),
  "title": "Inception",
  "type": "Movie", // "Movie" o "Series"
  "plot": "Un ladrón que roba secretos corporativos...", // Sinopsis
  "release_year": 2010,
  "poster_image": "cover/default-book-cover.jpg",
  "genres": ["Action", "Sci-Fi", "Thriller"],
  "rating_avg": 8.8,
  "is_featured": true, // Booleano para el "Hero" del Home
  "weekly_view_count": 15200, // Para el carrusel de "Tendencias"
  "createdAt": ISODate("..."), // Para el carrusel de "Recién Añadidas"

  // ===================================================
  // DOCUMENTOS EMBEBIDOS
  // Esta información se muestra SIEMPRE en la vista de detalles y en las cards.
  // ===================================================
  "director": {
    "person_id": ObjectId("..."), // Opcional
    "name": "Christopher Nolan"
  },
  "main_cast": [
    { 
      "person_id": ObjectId("..."), // Opcional
      "actor_name": "Leonardo DiCaprio", 
      "character_name": "Cobb" 
    },
    { 
      "person_id": ObjectId("..."), // Opcional
      "actor_name": "Joseph Gordon-Levitt",
      "character_name": "Arthur"
    }
  ],

  // ===================================================
  // CAMPO PARA SERIES (Patrón Polimórfico)
  // Solo existe si "type" es "Series". Mantiene la información de la serie autocontenida.
  // ===================================================
  "seasons": [
    { 
      "season_number": 1,
      "episodes": [
        { "episode_number": 1, "title": "Pilot" },
        { "episode_number": 2, "title": "The Next Day" }
      ]
    }
  ]
}
```

**Posibles indices para `media`:**
*   `{ "title": "text" }`: Para la barra de búsqueda.
*   `{ "weekly_view_count": -1 }`: Para el carrusel de "Tendencias".
*   `{ "createdAt": -1 }`: Para el carrusel de "Recién Añadidas".
*   `{ "genres": 1, "type": 1, "rating_avg": -1 }`: Índice compuesto para carruseles como "Películas de Acción Populares".

---

### Colección 2: `users`

Almacena toda la información del perfil del usuario, incluyendo datos que no cambian mucho (datos personales) y datos que sí lo hacen (listas).

Las reseñas de los usuarios se colocaron en una coleccion aparte por las siguiente razones: 

**Documentos sin Límite de Crecimiento**: Un usuario muy activo podría escribir cientos o miles de reseñas a lo largo del tiempo. Esto haría que su documento en la colección users crezca sin control.

- Límite de 16 MB de MongoDB: Un solo documento en MongoDB no puede superar los 16 MB. Un usuario prolífico podría alcanzar este límite, y a partir de ese momento, no podría añadir más reseñas, rompiendo la aplicación para él.

- Degradación del Rendimiento: Incluso si no se alcanza el límite, los documentos muy grandes son ineficientes. Cada vez que el documento crece más allá del espacio que tiene asignado en disco, MongoDB tiene que moverlo a una nueva ubicación, lo que ralentiza las escrituras. Además, cargar un documento de varios megabytes en memoria solo para leer el username es un desperdicio de recursos.

**Ineficiencia para la Vista de Detalles de la Película**: Para mostrar todas las reseñas de la película "Inception", tendrías que hacer una consulta que escanee toda la colección users buscando en el array reviews de cada usuario. Esto es extremadamente ineficiente y no escalaría en absoluto.

#### Estructura del Documento `users`:

```javascript
{
  "_id": ObjectId("..."),
  "username": "CineFan88",
  "email": "cinefan@email.com",
  "password_hash": "...",
  "profile_picture_url": "https://ui-avatars.com/api/?name=CineFan88...",
  "createdAt": ISODate("..."), // Para "Miembro desde"

  // ===================================================
  // DOCUMENTOS EMBEBIDOS
  // Estos datos son específicos del usuario y no crecen indefinidamente.
  // ===================================================
  "personal_info": {
    "birth_date": ISODate("1988-05-25T00:00:00Z"), // Para calcular la edad
    "country": "Argentina"
  },
  "preferences": {
    "favorite_genres": ["Sci-Fi", "Drama", "Thriller"]
  },
  "subscription": {
    "plan_type": "Premium Anual",
    "renewal_date": ISODate("2024-12-20T00:00:00Z")
  },
  "payment_methods": [
    {
      "type": "Credit Card",
      "provider": "Visa",
      "last_four": "1234",
      "expiry": "12/26"
    },
    {
      "type": "PayPal",
      "email": "cinefan@email.com"
    }
  ],

  // ===================================================
  // ARRAYS DE REFERENCIAS (IDs)
  // Estas listas pueden crecer mucho. Embeber los documentos completos haría el documento 'user'
  // enorme y lento. Referenciar es la mejor práctica aquí.
  // ===================================================
  "watchlist": [ 
    ObjectId("..."), // _id de un item en la colección 'media'
    ObjectId("...")
  ],
  "watched_list": [
    ObjectId("..."), // _id de un item en la colección 'media'
    ObjectId("...")
  ]
}
```

**Posibles indices para `users`:**
*   `{ "email": 1 }`: Para asegurar que los emails sean únicos y para búsquedas rápidas.
*   `{ "username": 1 }`: Para asegurar que los nombres de usuario sean únicos.

---

### Colección 3: `reviews`

Esta colección es un ejemplo clásico de una relación "uno a muchos" donde el "muchos" puede ser realmente grande, justificando una colección separada.

#### Estructura del Documento `reviews`:

```javascript
{
  "_id": ObjectId("..."),
  
  // ===================================================
  // REFERENCIAS A OTRAS COLECCIONES
  // ===================================================
  "media_id": ObjectId("..."), // _id de 'media'
  "user_id": ObjectId("..."),  // _id de 'users'

  // ===================================================
  // DATOS DENORMALIZADOS (Patrón de Referencia Extendido)
  // Se duplican datos pequeños para evitar consultas (JOINs) al mostrar las reseñas.
  // ===================================================
  "user_info": {
    "username": "CineFan88",
    "avatar_url": "https://ui-avatars.com/api/?name=CineFan88..."
  },
  
  "rating": 9.0,
  "comment": "Una obra maestra visual y narrativa...",
  "createdAt": ISODate("...") // Para ordenar por fecha
}
```

**Posibles indices para `reviews`:**
*   `{ "media_id": 1, "createdAt": -1 }`: Para buscar rápidamente todas las reseñas de una película, ordenadas de la más nueva a la más antigua.
*   `{ "user_id": 1, "createdAt": -1 }`: Para la pestaña "Mis Reseñas" en el perfil de usuario.

