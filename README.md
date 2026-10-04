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

## Estado

- [x] Tema y pantallas
- [x] Modelo de datos (6 colecciones)
- [ ] Entorno MongoDB (Docker) y validación de esquemas
- [ ] Carga masiva de datos
- [ ] Consultas avanzadas (`consultas/*.js`)
- [ ] Índices y medición de rendimiento (`explain("executionStats")`)
- [ ] Política de backup y restauración

> `operaciones.md`, `guia.md` y `cargar_datos/` corresponden al modelo anterior (3 colecciones) y se van a actualizar en la etapa de implementación.
