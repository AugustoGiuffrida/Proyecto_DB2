# Backup — Fotograma

Política de backup y restauración de la base `fotograma`, con las herramientas vistas en la clase de migración y resguardo:

| Herramienta | Para qué |
|---|---|
| `mongodump` | Backup completo en formato binario (BSON). Guarda los datos, los índices y las reglas de validación |
| `mongorestore` | Restaura un backup hecho con `mongodump` |
| `mongoexport` | Exporta una colección a un archivo de texto (JSON o CSV), legible y editable |
| `mongoimport` | Importa un archivo hecho con `mongoexport` |

**Todos los comandos se ejecutan desde la raíz del proyecto** (la carpeta `Proyecto_DB2`) y guardan los archivos en `./backup`, dentro de esa misma carpeta. La carpeta `backup/` está en `.gitignore`: los backups no se suben al repositorio.

Con Docker, se antepone `docker compose exec mongo` a cada comando. El contenedor trabaja en la raíz del proyecto, así que la ruta `./backup` es la misma:

```bash
docker compose exec mongo mongodump --db fotograma --out ./backup
```

---

## 1. `mongodump`: backup completo

```bash
mongodump --db fotograma --out ./backup
```

Crea una carpeta por base de datos, con dos archivos por colección: los datos (`.bson`) y la descripción de la colección, es decir, sus índices y su validador (`.metadata.json`):

```
backup/
└── fotograma/
    ├── genres.bson     genres.metadata.json
    ├── media.bson      media.metadata.json
    ├── people.bson     people.metadata.json
    ├── reviews.bson    reviews.metadata.json
    ├── users.bson      users.metadata.json
    └── views.bson      views.metadata.json
```

Con 1.167.093 documentos tarda menos de 1 segundo y ocupa 160 MB.

Para respaldar **una sola colección**:

```bash
mongodump --db fotograma --collection reviews --out ./backup
```

---

## 2. `mongorestore`: restaurar un backup

Restaurar **toda la base**:

```bash
mongorestore --nsInclude="fotograma.*" --drop ./backup
```

- `--nsInclude="fotograma.*"`: restaura todas las colecciones de la base `fotograma`.
- `--drop`: borra cada colección antes de restaurarla, así no se mezclan los datos viejos con los del backup.

Restaura los datos, los índices y los validadores. Tarda unos 10 segundos.

Restaurar **una sola colección**, por ejemplo si se borraron reseñas por error:

```bash
mongorestore --nsInclude="fotograma.reviews" --drop ./backup
```

Restaurar en **otra base**, para comprobar que el backup sirve sin tocar la base real:

```bash
mongorestore --nsFrom="fotograma.*" --nsTo="fotograma_prueba.*" ./backup
```

---

## 3. `mongoexport`: exportar a JSON o CSV

Una colección completa a JSON. Es la forma de la diapositiva: `mongoexport -d base -c colección -o archivo`.

```bash
mongoexport --db fotograma --collection genres --out ./backup/genres.json
```

```json
{"_id":"accion","name":"Acción","color":"#ff6a3d","description":"Persecuciones, peleas y adrenalina de principio a fin."}
{"_id":"aventura","name":"Aventura","color":"#4cc38a","description":"Viajes, mundos lejanos y héroes fuera de su zona de confort."}
```

Solo los documentos que cumplen una condición (`--query`), por ejemplo las series:

```bash
mongoexport --db fotograma --collection media --query '{ "type": "series" }' --out ./backup/series.json
```

A CSV, eligiendo los campos (`--fields`), para abrirlo en una planilla de cálculo:

```bash
mongoexport --db fotograma --collection users --type=csv --fields username,email,country --out ./backup/usuarios.csv
```

```
username,email,country
CineFan88,cinefan@email.com,Argentina
lucia.mza,luciamza@mail.com,Argentina
```

---

## 4. `mongoimport`: importar un archivo exportado

```bash
mongoimport --db fotograma --collection genres --mode=upsert --file ./backup/genres.json
```

`--mode=upsert` actualiza los documentos que ya existen (según su `_id`) e inserta los que faltan. Sirve, por ejemplo, para recuperar géneros que se borraron por error.

No conviene usar `--drop` con `mongoimport`: borra la colección, y con ella el validador y los índices. El archivo JSON tiene solo los datos y no los recrea. Con `mongorestore` el `--drop` no es un problema, porque el backup sí incluye índices y validadores.

---

## 5. ¿`mongodump` o `mongoexport`?

| | `mongodump` / `mongorestore` | `mongoexport` / `mongoimport` |
|---|---|---|
| Formato | BSON (binario) | JSON o CSV (texto) |
| Alcance | toda la base o una colección | una colección, o parte con `--query` |
| Índices y validadores | **sí** | no |
| Uso | backup y recuperación ante fallas | revisar datos, pasarlos a otra herramienta o cargar una colección chica |

---

## 6. Política de backup

| | |
|---|---|
| **Qué** | La base completa con `mongodump`. |
| **Cuándo** | Todos los días a las 4 de la mañana, el horario con menos reproducciones. |
| **Dónde** | Una carpeta por día dentro de `./backup`, y una copia fuera del servidor (otro disco o la nube): si se rompe el servidor, el backup no se pierde con él. |
| **Cuánto tiempo** | Se guardan los backups de los últimos 7 días; los más viejos se borran. |
| **Prueba** | Una vez por semana se restaura el último backup en `fotograma_prueba` y se comparan las cantidades de documentos con la base real. Un backup que nunca se probó no sirve. |
| **Exportaciones** | Antes de un cambio grande en una colección chica (por ejemplo, `genres`), se exporta a JSON con `mongoexport`. |

Comandos del backup diario:

```bash
# backup del día, en una carpeta con la fecha (por ejemplo ./backup/2026-10-20)
mongodump --db fotograma --out ./backup/$(date +%F)

# borrar los backups de más de 7 días
find ./backup -maxdepth 1 -type d -name "20*" -mtime +7 -exec rm -rf {} +
```

En un servidor real, MongoDB Atlas hace esto de forma automática: ofrece backups continuos y *snapshots* del proveedor de la nube, también vistos en clase.
