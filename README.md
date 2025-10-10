### 1. Definición del Tema 

**"Plataforma de Catálogo de Películas y Series"** (similar a IMDb o un servicio de streaming). 

Este tema incluye: 
*   **Múltiples entidades:** Películas, series, géneros, actores, directores, usuarios, reseñas. 
*   **Relaciones variadas:** uno-a-uno (una película tiene un director), uno-a-pocos (una película tiene un elenco limitado) y uno-a-muchos (un actor aparece en muchas películas, un usuario escribe muchas reseñas). 
*   **Consultas diversas:** Búsquedas por título, filtrado por género, visualización de la filmografía de un actor, recomendaciones para un usuario, etc. 

### 2. Interfaces y Experiencia de Usuario (UI/UX) 

Imaginemos las pantallas principales que un usuario vería. Estas vistas definirán las consultas que nuestra base de datos debe resolver eficientemente. 

**a. Pantalla Principal (Home)** 
*   **Qué ve el usuario:** Listas de contenido curado como "Tendencias de la semana", "Recién añadidas", "Películas de Acción Populares", "Series de Comedia Recomendadas". 
*   **Consulta a la BD:** Necesitamos obtener rápidamente múltiples listas de películas/series, cada una con su póster, título y una calificación promedio. 

**b. Pantalla de Detalles del Contenido (Película o Serie)** 
*   **Qué ve el usuario:** El póster, título, sinopsis, año de lanzamiento, calificación promedio, géneros, director, y una lista principal de actores. Si es una serie, también una lista de temporadas y episodios. Además, una sección de reseñas de usuarios. 
*   **Experiencia de usuario:** Toda la información relevante sobre una película/serie en un solo lugar. No quiere esperar a que se carguen por separado los actores, el director y las reseñas. 
*   **Consulta a la BD:** Al solicitar una película, debemos obtener *toda* su información principal en una sola consulta. 

**c. Perfil de Usuario** 
*   **Qué ve el usuario:** Su nombre, una lista de "Películas Vistas", "Mi Lista de Pendientes", las reseñas que ha escrito y sus metodos de pago. 
*   **Experiencia de usuario:** Un resumen claro de su actividad en la plataforma. 
*   **Consulta a la BD:** Obtener la información del usuario y las listas de contenido asociado a él. 

### 3. Modelado de Datos en MongoDB 

A partir de las interfaces definidas, podemos diseñar nuestras colecciones. El objetivo principal es que cada pantalla se pueda renderizar con el menor número de consultas posible (idealmente, una). 

#### Colección 1: `media` (Contenido)  o un equivalente similar como `home`

En lugar de tener una colección para `peliculas` y otra para `series`, podira utilizarse **Patrón Polimórfico** (Sugerido por la IA, averiguar que es eso). Esto nos permite almacenar documentos con estructuras similares pero no idénticas en una sola colección, lo que simplifica muchas consultas. 

Un documento en esta colección podría verse así: 

```json
{
  "_id": ObjectId("63f8b3b7e8d4b8f3d8a9f8e1"),
  "title": "Inception",
  "type": "Movie", // Para distinguir entre Película o Serie
  "plot": "A thief who steals corporate secrets through the use of dream-sharing technology...",
  "release_year": 2010,
  "poster_image": "https://url.to/image.jpg",
  "genres": ["Action", "Sci-Fi", "Thriller"],
  "rating_avg": 8.8,
  
  // DATOS EMBEBIDOS para optimizar lecturas
  "director": {
    "name": "Christopher Nolan"
  },
  "main_cast": [
    { "actor_name": "Leonardo DiCaprio", "character_name": "Cobb" },
    { "actor_name": "Joseph Gordon-Levitt", "character_name": "Arthur" }
  ],

  // Campo específico si type es "Series"
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

**Justificación del Diseño:** 
*   **Embebido vs. Referencia:** La información del director y el elenco principal se *embebén* directamente en el documento. ¿Por qué? Porque la pantalla de detalles (la consulta más común) los necesita siempre. Hacer una consulta separada para obtener el nombre del director o los actores sería ineficiente. 
*   **Patrón Polimórfico:** Un campo `type` nos dice si es una película o una serie. Si es "Series", tendrá un campo `seasons` que no existe en los documentos de películas. Esto nos da flexibilidad sin necesidad de dos colecciones separadas. 
*   **Índices:** Para que las búsquedas sean rápidas, crearíamos índices en: 
    *   `title` (para búsquedas de texto). 
    *   `genres` (para los filtros de la pantalla principal). 
    *   `release_year` y `rating_avg` (para ordenar y filtrar). 

#### Colección 2: `users` (Usuarios) 

Esta colección almacenará la información de los usuarios y sus listas personales. 

```json
{
  "_id": ObjectId("63f8b4a9e8d4b8f3d8a9f8e2"),
  "username": "CineFan88",
  "email": "cinefan@email.com",
  "password_hash": "...",
  "preferences": {
    "favorite_genres": ["Sci-Fi", "Drama"]
  },
  
  // DATOS REFERENCIADOS para evitar documentos muy grandes
  "watchlist": [
    ObjectId("63f8b3b7e8d4b8f3d8a9f8e1"), // Referencia a "Inception"
    ObjectId("...") 
  ],
  "watched_list": [
    ObjectId("..."),
    ObjectId("...")
  ]
}
```

**Justificación del Diseño:** 
*   **Embebido vs. Referencia:** Las preferencias (`preferences`) se embeben porque son datos pequeños y específicos del usuario. Sin embargo, las listas de películas (`watchlist`, `watched_list`) se *referencian* usando el `_id` de la colección `media`. ¿Por qué? Porque estas listas pueden crecer indefinidamente. Embeberlas haría que el documento del usuario creciera sin control, lo cual es un anti-patrón en MongoDB. 
*   **Consulta:** Para mostrar el perfil, hacemos una primera consulta para obtener el documento del usuario. Luego, con la lista de `_id` de `watchlist`, hacemos una segunda consulta a la colección `media`: `db.media.find({_id: { $in: [...] }})`. Esto es mucho más eficiente que tener un documento de usuario de varios megabytes. 

#### Colección 3: `reviews` (Reseñas) 
No tengo ganas de hacer esto pero me parece que queda muy simple

Podríamos embeber las reseñas en la colección `media`, pero una película muy popular podría tener miles de reseñas, haciendo el documento demasiado grande. Por eso, las separamos. 

```json
{
  "_id": ObjectId("63f8b5cde8d4b8f3d8a9f8e3"),
  "media_id": ObjectId("63f8b3b7e8d4b8f3d8a9f8e1"), // Referencia a "Inception"
  "user_id": ObjectId("63f8b4a9e8d4b8f3d8a9f8e2"),  // Referencia a "CineFan88"
  "username": "CineFan88", // Denormalización para evitar una consulta extra
  "rating": 9.0,
  "comment": "An absolute masterpiece of modern cinema.",
  "created_at": ISODate("2023-02-22T10:00:00Z")
}
```

**Justificación del Diseño:** 
*   **Relaciones:** Este modelo conecta un `user` con un `media`. 
*   **Denormalización (Patrón de Referencia Extendido):** Incluimos el `username` directamente en la reseña, aunque ya tenemos el `user_id`. Esto es una optimización: al mostrar las reseñas en la página de detalles de una película, no necesitamos hacer una consulta adicional a la colección `users` solo para obtener el nombre de quien la escribió. Es una pequeña duplicación de datos que ahorra muchas lecturas. 
*   **Índices:** Crearíamos un índice compuesto en `{ "media_id": 1, "created_at": -1 }` para poder obtener rápidamente todas las reseñas de una película, ordenadas de la más reciente a la más antigua. 

### Resumen del Modelo 

| Interfaz/Funcionalidad | Consultas Necesarias y Colecciones Involucradas |
| :--- | :--- |
| **Página Principal** | Múltiples `find()` a `media` con filtros por `genres`, `rating_avg`, etc. y proyecciones para obtener solo lo necesario (título, póster). |
| **Detalles de Película** | Un `findOne()` a `media` por `_id`. Esto devuelve casi toda la info. Un segundo `find()` a `reviews` por `media_id` para las reseñas. |
| **Perfil de Usuario** | Un `findOne()` a `users`. Un segundo `find()` a `media` usando los `_id` referenciados en las listas del usuario. |