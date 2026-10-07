# Fotograma — Catálogo de películas y series sobre MongoDB

Proyecto de **Diseño de Bases de Datos II** (Universidad de Mendoza, 2026): implementación práctica de una solución basada en el motor documental MongoDB.

## Tema

Una plataforma de streaming / catálogo (estilo IMDb o Netflix) donde los usuarios exploran películas y series, las agregan a su lista, las reproducen y escriben reseñas.

El tema tiene:
- **Varias entidades:** títulos, géneros, personas, usuarios, reseñas y reproducciones.
- **Todas las cardinalidades:** uno a uno, uno a pocos, uno a muchos y muchos a muchos.
- **Consultas variadas:** búsqueda por texto, filtros y ordenamientos, rankings por período, `$lookup` entre colecciones y agregaciones con `$group`.
- **Volumen real para medir índices:** las reseñas y, sobre todo, las reproducciones crecen rápido.

## Proceso de diseño

Como vimos en la clase de modelado, en MongoDB **primero se diseña la aplicación y después el modelo de datos**:

1. **Interfaces** → [`interfaces/`](interfaces/): prototipo navegable de las 5 pantallas.
2. **Modelo** → [`colecciones.md`](colecciones.md): 6 colecciones, decisiones de embeber o referenciar, relaciones, patrones e índices previstos.

## Pantallas

| Pantalla | Archivo | Qué ve el usuario | Colecciones |
|---|---|---|---|
| Inicio | `index.html` | Título destacado, Seguir viendo, Top 10 de la semana, Recién agregadas, recomendadas por género favorito, series, géneros | `media` `views` `genres` `users` |
| Detalle | `detalle.html` | Ficha completa del título, temporadas y episodios (series), reparto, reseñas, títulos similares | `media` `reviews` `views` `users` |
| Persona | `persona.html` | Biografía y filmografía de un actor o director | `people` `media` |
| Género / Explorar | `genero.html` | Catálogo filtrado por género y tipo, con orden configurable | `genres` `media` |
| Perfil | `perfil.html` | Mi lista, historial de reproducción, mis reseñas, cuenta y pagos | `users` `media` `reviews` `views` |

### Cómo ver el prototipo

Abrí `interfaces/index.html` en el navegador (doble click alcanza; no requiere servidor). Las tipografías se cargan desde Google Fonts, así que sin internet se ven con la fuente del sistema.

El botón **"Ver modelo de datos"** (abajo a la derecha) marca cada sección con la colección que la alimenta. Al hacer click en una etiqueta se abre la consulta MongoDB completa y un documento de ejemplo.

Los datos del prototipo ([`interfaces/assets/data.js`](interfaces/assets/data.js)) tienen exactamente la forma de los documentos del modelo. Los pósters son arte generado por CSS; en la base, `poster` y `backdrop` guardan la ruta de la imagen.

## Base de datos

### Con Docker (recomendado)

Requisito: Docker. El contenedor ya trae MongoDB 8, `mongosh` y las database tools (`mongodump`, `mongorestore`…).

```bash
docker compose up -d                            # levanta MongoDB en localhost:27017
docker compose exec mongo mongosh db/setup.js   # crea y carga la base
docker compose exec mongo mongosh fotograma     # abre la shell
```

- **Compass:** conectarse a `mongodb://localhost:27017`.
- **Datos:** quedan en el volumen `mongo-data`. `docker compose down` apaga sin perderlos; `docker compose down -v` los borra.
- El repo se monta en `/proyecto` dentro del contenedor, así que las rutas son las mismas que acá.

### Sin Docker

Requisitos: MongoDB 8 corriendo en `localhost:27017` y `mongosh`.

```bash
mongosh db/setup.js
```

### Qué hace `setup.js`

Crea la base **`fotograma`** desde cero (borra la anterior si existe). En una PC común tarda alrededor de un minuto y medio; con Docker en una Mac Intel, unos cinco minutos.

| Script | Qué hace |
|---|---|
| [`db/00_crear_db.js`](db/00_crear_db.js) | Crea las 6 colecciones. Cinco tienen validación `$jsonSchema` y `views` es una serie temporal |
| [`db/01_datos_semilla.js`](db/01_datos_semilla.js) | Carga los documentos del prototipo (16 títulos reales, sus personas, CineFan88…) |
| [`db/02_datos_masivos.js`](db/02_datos_masivos.js) | Genera datos coherentes: 4.000 personas, 3.000 títulos, 10.000 usuarios, 150.000 reseñas y 1.000.000 de reproducciones |
| [`db/03_ratings.js`](db/03_ratings.js) | Calcula `media.rating` desde las reseñas (`$group` + `$merge`) |
| [`db/04_indices.js`](db/04_indices.js) | Crea los índices, después de la carga |
| [`db/05_verificar.js`](db/05_verificar.js) | Muestra el volumen por colección, prueba que la validación rechace documentos inválidos y controla la integridad de las referencias |

- **Volúmenes:** se configuran en [`db/config.js`](db/config.js).
- **Reproducibilidad:** el generador usa una semilla fija, así que cada corrida produce los mismos datos y las mediciones de rendimiento se pueden repetir.
- **Por separado:** cada script también se puede correr solo, por ejemplo `mongosh db/05_verificar.js`.

## Estado

- [x] Tema y pantallas
- [x] Modelo de datos (6 colecciones)
- [x] Creación de la base, validación de esquemas y carga masiva de datos
- [x] Índices
- [ ] Consultas avanzadas (`consultas/*.js`)
- [ ] Medición de rendimiento (`explain("executionStats")` con y sin índices)
- [ ] Política de backup y restauración

> `operaciones.md` y `guia.md` corresponden al modelo anterior (3 colecciones) y se van a actualizar en las próximas etapas.
