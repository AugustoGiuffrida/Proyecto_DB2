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
| `CLUSTERED_IXSCAN`, `UNPACK_TS_BUCKET` | propios de la serie temporal: recorre los *buckets* en orden de tiempo y los desarma en documentos |
| `EQ_LOOKUP` | el `$lookup` hacia otra colección |
| `totalDocsExamined` | documentos leídos. En `views` cuenta **buckets**, no documentos |
| `totalKeysExamined` | entradas del índice recorridas |
| `executionTimeMillis` | tiempo de ejecución que informa el servidor |

---

## Resultados

"Docs examinados" es la medida más confiable del trabajo que hace el servidor. El tiempo es el promedio de 20 ejecuciones.

| # | Consulta | Índice | Plan sin índice | Plan con índice | Docs examinados (sin → con) | Tiempo promedio (sin → con) |
|---|---|---|---|---|---|---|
| 2.2 | Reseñas de un título | `reviews_por_titulo` | COLLSCAN → SORT | IXSCAN → FETCH → LIMIT | **150.012 → 10** | **46,15 → 0,55 ms** |
| 5.5 | Mis reseñas (+ `$lookup`) | `reviews_por_usuario` | COLLSCAN → SORT → EQ_LOOKUP | IXSCAN → FETCH → EQ_LOOKUP | **150.038 → 52** | **34,00 → 1,40 ms** |
| 5.3 | Historial de un usuario | `meta_1_ts_1` (automático) | CLUSTERED_IXSCAN | IXSCAN → FETCH | 19.892 → 10 buckets | 12,50 → 1,00 ms |
| login | Usuario por email | `users_email_unico` | COLLSCAN | EXPRESS_IXSCAN | 10.006 → 1 | 3,35 → 0,45 ms |
| 3.2 | Filmografía (`cast.person_id`) | `media_reparto` | COLLSCAN → SORT | IXSCAN → FETCH → SORT | 3.016 → 4 | 3,90 → 0,55 ms |
| 4.2 | Películas de un género por rating | `media_genero_tipo_rating` | COLLSCAN → SORT | IXSCAN → FETCH → LIMIT | 3.016 → 24 | 2,15 → 0,60 ms |
| 1.5 | Recién agregadas | `media_recientes` | COLLSCAN → SORT | IXSCAN → FETCH → LIMIT | 3.016 → 12 | 1,60 → 0,55 ms |
| 1.7 | Series mejor valoradas | `media_tipo_rating` | COLLSCAN → SORT | IXSCAN → FETCH → LIMIT | 3.016 → 12 | 1,70 → 0,55 ms |
| 1.8b | Búsqueda `/^Noche/` (empieza con) | `media_titulo` | COLLSCAN → LIMIT | IXSCAN → FETCH → LIMIT | 872 → 8 | 0,90 → 0,50 ms |
| 1.8 | Búsqueda `/noche/i` (contiene) | `media_titulo` | COLLSCAN → LIMIT | IXSCAN → FETCH → LIMIT | 322 → 8 (192 claves) | 0,70 → 0,65 ms |
| 1.1 | Título destacado | `media_destacado` | COLLSCAN → LIMIT | EXPRESS_IXSCAN | 10 → 1 | 0,65 → 0,60 ms |
| 1.4 | Top 10 de la semana | `views_ts` (*prueba*) | CLUSTERED_IXSCAN → UNPACK → GROUP | IXSCAN → FETCH → UNPACK → GROUP | 10.067 → 9.983 buckets | 126,85 → **137,65 ms** |

Los números se repitieron en tres corridas, con diferencias menores al 10 % (por ejemplo, 2.2 sin índice: 50,05, 49,75 y 46,15 ms).

**Elección del índice con todos presentes.** En la base real conviven todos los índices. El planificador de MongoDB prueba los candidatos y elige el mejor; en las 11 consultas eligió el índice esperado.

---

## Análisis

### 1. En las colecciones grandes el índice es indispensable

En `reviews` (150.000 documentos), mostrar las reseñas de un título sin índice obliga a:
- leer **toda la colección** (150.012 documentos),
- ordenarla en memoria,
- quedarse con 10.

Con `reviews_por_titulo` se leen **exactamente los 10** que se muestran. El tiempo baja de 46 ms a 0,55 ms: es **más de 80 veces más rápido**. Lo mismo pasa con "Mis reseñas" (24 veces más rápido).

Además, sin índice el tiempo crece con la cantidad de reseñas (con un millón, estimando en proporción, tardaría unos 300 ms), mientras que con índice se mantiene, porque siempre se leen los 10 documentos necesarios.

### 2. Los índices compuestos resuelven el filtro y el orden juntos

Sin índice aparece la etapa `SORT`: MongoDB junta todos los documentos que cumplen el filtro y los ordena en memoria. Con un índice compuesto como `{ genre_ids: 1, type: 1, "rating.avg": -1 }` pasan dos cosas:
- Las primeras claves resuelven el **filtro**: igualdad por género y tipo.
- La última ya viene **ordenada** por rating.

Por eso desaparece el `SORT` y el `LIMIT` corta apenas encuentra los 24 primeros (consultas 4.2, 1.7, 1.5 y 2.2). El orden de las claves importa: primero los campos de igualdad, después el campo de orden.

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

### 6. Series temporales: lo que ya resuelve MongoDB y lo que no

- **Sin ningún índice**, la serie temporal no hace un `COLLSCAN` común. Hace un `CLUSTERED_IXSCAN`, porque los buckets están guardados en orden de tiempo. Un filtro por fecha ya descarta los buckets de afuera del rango.
- **Top 10 de la semana:** probamos un índice nuevo `{ ts: -1 }` y fue **más lento**: 138 ms contra 127 ms. El orden por tiempo ya lo da la serie temporal, y el índice solo agrega trabajo (9.984 claves). **Decisión: no se crea.**
- **Historial de un usuario:** el filtro por fecha no alcanza, porque en esos 30 días hay buckets de todos los usuarios (19.892). El índice sobre `meta` + `ts` lo reduce a los 10 buckets del usuario: 12 veces más rápido.

#### Decisión: usar el índice automático y no crear otro

MongoDB crea automáticamente un índice `meta_1_ts_1` al crear la serie temporal. La primera versión del modelo agregaba además `views_por_usuario`, sobre `{ "meta.user_id": 1, ts: -1 }`, porque las consultas filtraban así. Medimos el historial **solo con el índice automático**:

| Filtro | Índice que usa | Buckets examinados | executionTimeMillis |
|---|---|---|---|
| `{ "meta.user_id": X, ts: … }` (un campo dentro de `meta`) | ninguno | 19.892 | 11 |
| `{ meta: { user_id: X }, ts: … }` (el subdocumento `meta` completo) | `meta_1_ts_1` | 10 | 0 |

Las dos formas devuelven lo mismo, porque `meta` tiene un único campo. Por eso **las consultas filtran por el subdocumento completo y `views_por_usuario` se eliminó**. Se ahorra un índice de 1,16 MB, que además había que actualizar en cada una de las millones de reproducciones.

La contra es que, si en el futuro `meta` tuviera más campos (por ejemplo, el dispositivo), la comparación del subdocumento completo dejaría de encontrar los documentos, y habría que volver a un índice sobre `meta.user_id`.

---

## Costo de los índices

Como planteamos en clase, un índice acelera las lecturas pero se paga en espacio y en escrituras.

### Espacio

| Colección | Datos | Índices | Detalle |
|---|---|---|---|
| `media` | 4,1 MB | 0,5 MB | 7 índices, cada uno entre 0,03 y 0,13 MB |
| `users` | 7,0 MB | 0,5 MB | `email` 0,27 MB · `username` 0,16 MB |
| `reviews` | 33,1 MB | **7,8 MB** | `_id` 1,43 · `por_usuario` 2,59 · `por_titulo` 2,37 · `titulo_usuario_unico` 1,41 MB |
| `views` | 34,4 MB | 1,2 MB | solo `meta_1_ts_1` (automático) |

En `reviews` los índices ocupan el 24 % de lo que ocupan los datos.

### Escrituras

Se insertaron 20.000 reseñas en una colección de prueba, de a 1.000 por vez, con y sin los índices de `reviews` (promedio de 3 corridas):

| Índices | Tiempo |
|---|---|
| solo `_id` | 141 ms |
| `_id` + los 3 de `reviews` | 308 ms (**+118 %**) |

Cada inserción tiene que actualizar también cada índice. Aun así, en una plataforma de streaming una reseña se escribe una vez y se lee miles de veces, así que el costo se justifica. Por la misma razón, `db/04_indices.js` crea los índices **después** de la carga masiva: construirlos al final es más rápido que mantenerlos actualizados durante un millón de inserciones.

---

## Conclusiones

| Índice | Decisión | Motivo |
|---|---|---|
| `reviews_por_titulo`, `reviews_por_usuario` | **mantener** | más de 80 y 24 veces más rápidos sobre 150.000 documentos |
| `reviews_titulo_usuario_unico` | **mantener** | regla de negocio: una reseña por usuario y título |
| `users_email_unico`, `users_username_unico` | **mantener** | login (de 10.006 a 1 documento) y unicidad |
| índices de `media` | **mantener** | reducen el trabajo 100–250 veces, ocupan 0,5 MB en total y la colección recibe pocas escrituras (altas de títulos y actualización del rating) |
| `media_titulo` | **mantener** | útil para "empieza con" y para el orden alfabético; no ayuda en "contiene" |
| `views_ts` (*prueba*) | **no crear** | la serie temporal ya está ordenada por tiempo; el índice empeoró la consulta |
| `meta_1_ts_1` (automático de `views`) | **usar** | las consultas por usuario filtran con `{ meta: { user_id } }` y lo aprovechan |
| `views_por_usuario` | **eliminado** | era redundante con el índice automático |
