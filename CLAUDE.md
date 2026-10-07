# CLAUDE.md

## Contexto

Proyecto **individual** de *Diseño de Bases de Datos II* (Universidad de Mendoza, 2026). La aprobación es obligatoria para regularizar la materia, y se evalúa **oralmente**.

El PDF de requisitos pide:
- Requisitos y solución propuesta.
- Modelado de datos.
- Implementación en MongoDB.
- Carga de datos.
- Consultas avanzadas.
- Medición de desempeño con índices.
- Política de backups.

La teoría vista (clases en `../Teoria_mongo/*.ppsx`) cubre:
- Modelado, con la idea "primero la aplicación, después el modelo".
- CRUD y operadores de arrays.
- `aggregate`: `$match`, `$group`, `$project`, `$cond`, `$lookup`.
- Relaciones 1:1, 1:N y N:M.
- Colecciones de series temporales.
- Índices y `explain("executionStats")`.
- `mongodump`/`mongorestore` y `mongoexport`/`mongoimport`.
- MongoDB Atlas.

**Tema:** *Fotograma*, un catálogo/streaming de películas y series.

## Cómo trabajar en este repo

- **Idioma:** todo en español (código, comentarios, documentación, commits).
- **Simplicidad:** todo tiene que poder **explicarse en un oral**. Preferir soluciones simples y justificadas antes que patrones avanzados. Consultar antes de agregar colecciones o funcionalidades.
- **Orden de trabajo:** diseño y modelo primero, después la implementación.
- **Git:** commitear directo en `main`, sin ramas, y solo cuando se pida. Lo mismo para el push.
- **Coherencia:** cuando cambia el modelo, actualizar juntos `colecciones.md`, el prototipo (`interfaces/assets/data.js` y `pages.js`) y los scripts de `db/`.

## Estructura

| Ruta | Contenido |
|---|---|
| `colecciones.md` | Modelo de datos: colecciones, decisiones de embeber o referenciar, relaciones, patrones, índices y preguntas para defender el modelo |
| `interfaces/` | Prototipo navegable: Inicio, Detalle, Persona, Género y Perfil. HTML, CSS y JS sin dependencias. El botón "Ver modelo de datos" muestra la colección y la consulta de cada sección |
| `interfaces/assets/data.js` | Documentos de muestra con la forma exacta del modelo. También son la semilla de la base |
| `db/` | Scripts de mongosh que crean y cargan la base (ver `README.md`) |
| `operaciones.md`, `guia.md` | **Desactualizados** (modelo anterior de 3 colecciones). Hay que rehacerlos |

## Modelo (resumen)

Base **`fotograma`**, con 6 colecciones:

- **`media`:** películas y series en una misma colección (patrón polimórfico, campo `type`).
  - Las películas tienen `runtime_min`; las series tienen `seasons` embebido.
  - `genre_ids` guarda slugs de `genres`.
  - `directors` y `cast` son arrays con referencia extendida (`person_id` + `name`).
  - `rating { avg, count }` se calcula desde `reviews` (patrón computado).
- **`genres`:** `_id` es un slug (`"ciencia-ficcion"`). Se filtra sin `$lookup` y renombrar un género es modificar un solo documento.
- **`people`:** actores y directores. Relación N:M con `media` mediante índices multikey.
- **`users`:** `subscription` y `payment_methods` embebidos; `watchlist` con referencias a `media`. Lo "visto" se obtiene de `views`.
- **`reviews`:** colección propia (1:N sin límite) con una copia de `username` y `avatar`. Hay un índice único en `{ media_id, user_id }`.
- **`views`:** serie temporal con `timeField: ts`, `metaField: meta = { user_id }` y `granularity: "hours"`. `media_id` es un campo de medición.
  - Con `meta = { user_id, media_id }` se generaba casi un bucket por documento. La medición está en `colecciones.md`.

## Base de datos local

- **Entorno:** MongoDB 8.0 corre en Docker (`docker-compose.yml`, contenedor `fotograma-mongo`) en `localhost:27017`, sin autenticación. La imagen trae mongosh y las database tools. El repo está montado en `/proyecto` (directorio de trabajo del contenedor).
- **Armado:** `docker compose exec mongo mongosh db/setup.js` recrea la base desde cero (~5 minutos en esta Mac Intel con Docker; ~1,5 en una PC común sin Docker).
- **Comandos de mongosh/mongodump:** correrlos con `docker compose exec mongo ...`, porque no están instalados en el Mac.
- **Volúmenes:** se definen en `db/config.js`. Valores actuales: 4.000 personas, 3.000 títulos, 10.000 usuarios, 150.000 reseñas y 1.000.000 de reproducciones.
- **Reproducibilidad:** el generador usa una semilla fija (`CONFIG.semilla`) y una fecha "hoy" fija (`CONFIG.hoy` = 2026-10-06).
- **Índices:** están definidos en `db/04_indices.js` (`globalThis.INDICES`) y todos tienen nombre, para poder usar `dropIndex` en las pruebas de rendimiento.

### Particularidades de mongosh

- **Funciones en bloques:** `setup.js` carga todos los scripts con `load()` en el mismo contexto, así que cada script envuelve su código en un bloque `{ ... }`. Dentro de esos bloques **no usar declaraciones `function f()`**, porque mongosh las saca del bloque y pierden el acceso a las constantes. Usar `const f = function () {}`.
- **Números:** los números enteros de JS se guardan como `int` (`8.0` también). En los validadores usar `bsonType: "number"`.
- **Series temporales:** no admiten validador `$jsonSchema`.

## Próximos pasos

1. Consultas avanzadas (`consultas/*.js`) a partir de las que muestra el prototipo en el modo "Ver modelo".
2. Medición de rendimiento: `explain("executionStats")` con y sin cada índice, en tablas.
3. Política de backup: `mongodump`/`mongorestore`, `mongoexport`, frecuencia, retención y prueba de restauración.
4. Rehacer `operaciones.md` y `guia.md`.
