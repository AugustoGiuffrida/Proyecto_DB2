# Medición de rendimiento — Fotograma

Este documento mide cuánto mejoran las consultas de la aplicación con los índices del modelo, y cuánto cuestan esos índices en espacio y en velocidad de escritura.

Herramientas, todas vistas en la clase de índices:
- `createIndex(…, { name })`, `dropIndex("nombre")` y `getIndexes()` para manejar los índices.
- `explain("executionStats")` para ver cómo se ejecuta cada consulta, con `executionTimeMillis` como tiempo de ejecución.

El script [`rendimiento/medir.js`](rendimiento/medir.js) hace toda la medición y se puede repetir:

```bash
mongosh rendimiento/medir.js
```

Con Docker: `docker compose exec mongo mongosh rendimiento/medir.js`. Tarda unos 15 segundos y al final deja todos los índices como estaban.

## Los índices, como en la clase

Los índices se crean, consultan, borran y miden con los mismos comandos de la presentación de índices:

| En la presentación | En el proyecto |
|---|---|
| `db.contactos.createIndex({ apellido: 1 }, { name: "consulta_de_apellidos" })` | [`db/04_indices.js`](db/04_indices.js): un `createIndex` por índice, siempre con `name`. Por ejemplo, `db.reviews.createIndex({ media_id: 1, created_at: -1 }, { name: "reviews_por_titulo" })` |
| `db.contactos.dropIndex("consulta_de_apellidos")` | `rendimiento/medir.js` borra cada índice por su nombre para medir la consulta sin él |
| `db.users.getIndexes()` | `04_indices.js` lista los índices al terminar, y `medir.js` los guarda con `getIndexes()` antes de borrarlos para recrearlos después |
| `db.col.find().explain("executionStats")` y `executionTimeMillis` | cada medición de este documento |
| "Ver también: índices compuestos, multikey…" | compuestos: `media_genero_tipo_rating`, `reviews_por_titulo`; multikey: `genre_ids`, `cast.person_id` |
| Criterios: consultas, inserciones, uso de memoria y disco… | se miden las consultas y también el costo en espacio y en inserciones (ver más abajo) |

Hay dos diferencias con la presentación:
- **`unique: true`:** se usa en `email`, `username` y en la reseña por usuario y título. Es otra opción de `createIndex`, como `name`; además de acelerar la búsqueda, impide valores repetidos.
- **`{ background: true }`:** la presentación lo menciona porque crear un índice bloqueaba la colección. Desde MongoDB 4.2 esa opción se ignora: todos los índices se construyen con un proceso que bloquea solo un instante al principio y al final. Por eso no se usa.

## Método

Para cada consulta, el script hace lo siguiente:

1. Elimina todos los índices de la colección (menos `_id`) con `dropIndex`.
2. Mide la consulta con `explain("executionStats")` y además la ejecuta 20 veces para promediar el tiempo.
3. Crea **solo** el índice pensado para esa consulta, con `createIndex`.
4. Vuelve a medir.

Al terminar, recrea todos los índices del modelo y verifica que, con todos presentes, MongoDB elija el índice esperado para cada consulta.

**Entorno:** MongoDB 8.0 en Docker, PC Linux con 12 núcleos y 32 GB de RAM. La base tiene:

| Colección | Documentos |
|---|---|
| `media` | 3.016 |
| `users` | 10.006 |
| `reviews` | 150.012 |
| `views` | 1.000.010 |

### Cómo leer un `explain`

| Dato | Qué significa |
|---|---|
| `COLLSCAN` | recorre **toda** la colección, documento por documento |
| `IXSCAN` | recorre el índice y va directo a los documentos que cumplen la condición |
| `EXPRESS_IXSCAN` | variante rápida de MongoDB 8 para búsquedas por igualdad en un índice único |
| `FETCH` | lee de disco el documento completo a partir de lo que encontró en el índice |
| `SORT` | ordena los resultados **en memoria**; si no aparece, el orden salió del índice |
| `LIMIT` | corta apenas tiene los N resultados pedidos |
| `GROUP` | el `$group` del `aggregate` |
| `EQ_LOOKUP` | el `$lookup` hacia otra colección |
| `totalDocsExamined` | documentos leídos |
| `totalKeysExamined` | entradas del índice recorridas |
| `executionTimeMillis` | tiempo de ejecución que informa el servidor |

---

## Resultados

"Docs examinados" es la medida más confiable del trabajo que hace el servidor. El tiempo es el promedio de 20 ejecuciones.

| # | Consulta | Índice | Plan sin índice | Plan con índice | Docs examinados (sin → con) | Tiempo promedio (sin → con) |
|---|---|---|---|---|---|---|
| 5.3 | Historial de un usuario | `views_por_usuario` | COLLSCAN → SORT | IXSCAN → FETCH | **1.000.010 → 69** | **282,00 → 1,20 ms** |
| 1.4 | Top 10 de la semana | `views_por_fecha` | COLLSCAN → GROUP | IXSCAN → FETCH → GROUP | **1.000.010 → 96.273** | **195,75 → 71,30 ms** |
| 2.2 | Reseñas de un título | `reviews_por_titulo` | COLLSCAN → SORT | IXSCAN → FETCH → LIMIT | **150.012 → 10** | **44,95 → 0,50 ms** |
| 5.5 | Mis reseñas (+ `$lookup`) | `reviews_por_usuario` | COLLSCAN → SORT → EQ_LOOKUP | IXSCAN → FETCH → EQ_LOOKUP | **150.038 → 52** | **34,20 → 1,50 ms** |
| login | Usuario por email | `users_email_unico` | COLLSCAN | EXPRESS_IXSCAN | 10.006 → 1 | 3,35 → 0,40 ms |
| 3.2 | Filmografía (`cast.person_id`) | `media_reparto` | COLLSCAN → SORT | IXSCAN → FETCH → SORT | 3.016 → 4 | 3,45 → 0,50 ms |
| 4.2 | Películas de un género por rating | `media_genero_tipo_rating` | COLLSCAN → SORT | IXSCAN → FETCH → LIMIT | 3.016 → 24 | 2,05 → 0,60 ms |
| 1.5 | Recién agregadas | `media_recientes` | COLLSCAN → SORT | IXSCAN → FETCH → LIMIT | 3.016 → 12 | 1,75 → 0,55 ms |
| 1.7 | Series mejor valoradas | `media_tipo_rating` | COLLSCAN → SORT | IXSCAN → FETCH → LIMIT | 3.016 → 12 | 1,70 → 0,55 ms |
| 1.8b | Búsqueda `/^Noche/` (empieza con) | `media_titulo` | COLLSCAN → LIMIT | IXSCAN → FETCH → LIMIT | 872 → 8 | 0,90 → 0,45 ms |
| 1.8 | Búsqueda `/noche/i` (contiene) | `media_titulo` | COLLSCAN → LIMIT | IXSCAN → FETCH → LIMIT | 322 → 8 (192 claves) | 0,65 → 0,65 ms |
| 1.1 | Título destacado | `media_destacado` | COLLSCAN → LIMIT | EXPRESS_IXSCAN | 10 → 1 | 0,65 → 0,55 ms |

Los números se repitieron en varias corridas, con diferencias menores al 10 % (por ejemplo, 2.2 sin índice: 50,05, 46,15 y 44,95 ms).

**Elección del índice con todos presentes.** En la base real conviven todos los índices. El planificador de MongoDB prueba los candidatos y elige el mejor; en las 12 consultas eligió el índice esperado.

---

## Análisis

### 1. En las colecciones grandes el índice es indispensable

`views` tiene un millón de reproducciones. Sin índice, mostrar el historial de un usuario obliga a:
- leer **toda la colección** (1.000.010 documentos),
- ordenar en memoria las sesiones del usuario,
- devolver 69.

Con `views_por_usuario` (`{ user_id: 1, ts: -1 }`) se leen **exactamente las 69 sesiones** del usuario, ya ordenadas por fecha. El tiempo baja de 282 ms a 1,2 ms: es **235 veces más rápido**.

Lo mismo pasa en `reviews` (150.000 documentos): las reseñas de un título bajan de 150.012 documentos leídos a 10, y de 45 ms a 0,5 ms (90 veces más rápido). "Mis reseñas" es 23 veces más rápido.

Sin índice, el tiempo crece con el tamaño de la colección; con índice se mantiene, porque siempre se leen solo los documentos necesarios.

### 2. Los índices compuestos resuelven el filtro y el orden juntos

Sin índice aparece la etapa `SORT`: MongoDB junta todos los documentos que cumplen el filtro y los ordena en memoria. Con un índice compuesto como `{ genre_ids: 1, type: 1, "rating.avg": -1 }` pasan dos cosas:
- Las primeras claves resuelven el **filtro**: igualdad por género y tipo.
- La última ya viene **ordenada** por rating.

Por eso desaparece el `SORT` y el `LIMIT` corta apenas encuentra los primeros resultados (consultas 4.2, 1.7, 1.5, 2.2 y 5.3). El orden de las claves importa: primero los campos de igualdad, después el campo de orden.

En la filmografía (3.2) sigue apareciendo `SORT`, porque el índice es solo `{ "cast.person_id": 1 }` y el orden por año se hace en memoria. Son 4 documentos, así que no vale la pena agregar `release_year` al índice.

### 3. Índices *multikey*

`genre_ids` y `cast.person_id` están dentro de arrays. MongoDB crea una entrada del índice **por cada elemento** del array. Por eso una película con tres géneros aparece tres veces en `media_genero_tipo_rating`.

Esto es lo que permite resolver la relación muchos a muchos (personas ↔ títulos, géneros ↔ títulos) sin una colección intermedia.

### 4. En colecciones chicas la diferencia de tiempo es pequeña, pero el trabajo no

`media` tiene solo 3.016 títulos y entra entera en memoria. Recorrerla completa tarda 2 ms, así que en tiempo el índice casi no se nota. Pero el **trabajo** baja de 3.016 a 12 documentos (250 veces menos), y esa diferencia crece con el catálogo. Los índices de `media` además ocupan muy poco: 0,5 MB en total.

### 5. Expresiones regulares: depende de cómo se escriban

| Búsqueda | Qué hace el índice `{ title: 1 }` |
|---|---|
| `/^Noche/`: **empieza con**, distingue mayúsculas | El índice está ordenado alfabéticamente: salta directo a los títulos que empiezan con "Noche". Lee 8 claves para 8 resultados. |
| `/noche/i`: **contiene**, sin distinguir mayúsculas | La palabra puede estar en cualquier lugar del título: hay que revisar las claves una por una (192 para encontrar 8). El tiempo no mejora. |

Conclusión: la barra de búsqueda puede usar el índice si busca "títulos que empiezan con…". Una búsqueda de "contiene" sobre un catálogo muy grande necesitaría otra herramienta, como un índice de texto, que no vimos.

### 6. Un índice no siempre evita leer mucho: el Top 10 de la semana

El Top 10 cuenta **todas** las reproducciones de los últimos 7 días. Con `views_por_fecha` (`{ ts: -1 }`) MongoDB lee solo las de esa semana (96.273) en vez del millón completo, y el tiempo baja de 196 a 71 ms (2,7 veces más rápido).

La mejora es menor que en el historial porque la consulta necesita, de verdad, casi 100.000 documentos para poder sumarlos. El índice evita leer los otros 900.000, pero no puede evitar leer los que hacen falta. Si el Top 10 se mostrara a muchos usuarios a la vez, convendría calcularlo una vez por hora y guardar el resultado, igual que se hace con `media.rating` (patrón computado).

---

## Costo de los índices

Como planteamos en clase, un índice acelera las lecturas pero se paga en espacio y en escrituras.

### Espacio

| Colección | Datos | Índices | Detalle |
|---|---|---|---|
| `media` | 4,1 MB | 0,5 MB | 7 índices, cada uno entre 0,03 y 0,13 MB |
| `users` | 7,0 MB | 0,6 MB | `email` 0,27 MB · `username` 0,16 MB |
| `reviews` | 33,1 MB | 7,9 MB | `_id` 1,46 · `por_usuario` 2,58 · `por_titulo` 2,36 · `titulo_usuario_unico` 1,47 MB |
| `views` | 106,9 MB | **38,3 MB** | `_id` 10,64 · `por_usuario` 17,03 · `por_fecha` 10,67 MB |

En `views` y en `reviews` los índices ocupan entre el 24 % y el 36 % de lo que ocupan los datos. Es el precio de que las consultas sobre esas colecciones pasen de cientos de milisegundos a uno.

### Escrituras

Se insertaron 20.000 reseñas en una colección de prueba, de a 1.000 por vez, con y sin los índices de `reviews` (promedio de 3 corridas):

| Índices | Tiempo |
|---|---|
| solo `_id` | 156 ms |
| `_id` + los 3 de `reviews` | 296 ms (**+90 %**) |

Cada inserción tiene que actualizar también cada índice. Aun así, en una plataforma de streaming una reseña se escribe una vez y se lee miles de veces, así que el costo se justifica. Por la misma razón, `db/04_indices.js` crea los índices **después** de la carga masiva: construirlos al final es más rápido que mantenerlos actualizados durante un millón de inserciones.

---

## Conclusiones

| Índice | Decisión | Motivo |
|---|---|---|
| `views_por_usuario` | **mantener** | historial 235 veces más rápido sobre 1.000.000 de documentos |
| `views_por_fecha` | **mantener** | Top 10 2,7 veces más rápido: lee solo la última semana |
| `reviews_por_titulo`, `reviews_por_usuario` | **mantener** | 90 y 23 veces más rápidos sobre 150.000 documentos |
| `reviews_titulo_usuario_unico` | **mantener** | regla de negocio: una reseña por usuario y título |
| `users_email_unico`, `users_username_unico` | **mantener** | login (de 10.006 a 1 documento) y unicidad |
| índices de `media` | **mantener** | reducen el trabajo 100–250 veces, ocupan 0,5 MB en total y la colección recibe pocas escrituras (altas de títulos y actualización del rating) |
| `media_titulo` | **mantener** | útil para "empieza con" y para el orden alfabético; no ayuda en "contiene" |
