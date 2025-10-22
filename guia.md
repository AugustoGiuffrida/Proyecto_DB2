## 🧩 Guía MongoDB

### 1️⃣ **Verificar instalación del cliente y servidor**

📌 Primero, asegurate de tener instalados tanto el cliente (`mongosh`) como el servidor (`mongod`).


#### ▶️ Ver versión del servidor

```bash
mongod --version
```

#### ▶️ Ver versión de la shell

```bash
mongosh --version
```

---

### 2️⃣ **Iniciar el servicio de MongoDB**

#### ▶️ Iniciar manualmente

```bash
sudo systemctl start mongod
```

#### ▶️ Verificar el estado

```bash
systemctl status mongod
```

Deberías ver:

```
Active: active (running)
```

---

### 3️⃣ **Usar la shell interactiva (`mongosh`)**

Una vez que el servicio está corriendo:

```bash
mongosh
```

---

### 4️⃣  **Abrir Compass**

Podés abrirlo de dos formas:

#### 🔹 Desde terminal:

```bash
mongodb-compass
```

---

### 5️⃣ **Conectarte al servidor local**

En la ventana de conexión inicial de Compass:

* **URI:**

  ```
  mongodb://localhost:27017
  ```

Luego hacé clic en **“Connect”** ✅

---

### 6️⃣ **Verificar conexión**

Una vez conectado, deberías ver:

* La lista de bases de datos (`admin`, `config`, `local`, etc.)
* Podés entrar a cualquier base, ver colecciones, editar documentos, y ejecutar consultas desde el panel.

### 7️⃣ **Operaciones Básicas en `mongosh`**

Aquí hay algunos comandos esenciales para empezar a trabajar:

#### ▶️ Ver todas las bases de datos

```bash
show dbs
```

Esto listará todas las bases de datos en el servidor.

#### ▶️ Crear o Cambiar a una Base de Datos

MongoDB crea una base de datos (o cambia a una existente) cuando usas el comando `use`.

```bash
use miCatalogoDB
```

  * Si `miCatalogoDB` existe, `mongosh` se cambiará a esa base de datos.
  * Si no existe, MongoDB la creará *implícitamente*. No la verás en `show dbs` hasta que insertes al menos un documento en ella.

#### ▶️ Ver las colecciones de la DB actual

```bash
show collections
```

Esto listará todas las colecciones dentro de la base de datos que estás usando actualmente (ej. `miCatalogoDB`).

#### ▶️ Crear una colección

Puedes crear una colección explícitamente (recomendado si quieres añadir reglas de validación) o implícitamente al insertar el primer documento.

**Implícita (al insertar):**

```bash
db.media.insertOne({ title: "Inception" })
```

Si la colección `media` no existe, MongoDB la creará automáticamente.

**Explícita:**

```bash
db.createCollection("users")
```

Esto crea la colección `users` inmediatamente, aunque esté vacía.

#### ▶️ Eliminar una colección

```bash
db.users.drop()
```

Esto eliminará permanentemente la colección `users` y todos sus documentos.

#### ▶️ Eliminar una Base de Datos

Asegúrate de estar usando la base de datos que quieres eliminar (ej. `use miCatalogoDB`).

```bash
db.dropDatabase()
```

Esto eliminará permanentemente la base de datos activa y todas sus colecciones.

### 8️⃣ **Gestión de Índices (Indexes)**

Los índices mejoran drásticamente la velocidad de las consultas (`find`). Sin un índice, MongoDB debe escanear *todos* los documentos de una colección (un "collection scan") para encontrar los que coinciden con tu consulta.

#### ▶️ Crear un índice

Creemos un índice para buscar usuarios por su `email`. El `1` indica un orden ascendente.

```bash
db.users.createIndex( { email: 1 } )
```

Para tu proyecto, los índices sugeridos en `colecciones.md` serían:

```bash
db.media.createIndex( { title: "text" } )
db.media.createIndex( { weekly_view_count: -1 } ) // -1 es descendente
db.reviews.createIndex( { media_id: 1, createdAt: -1 } ) // Índice compuesto
```

#### ▶️ Crear un índice con nombre

Es una buena práctica darles nombres a tus índices para poder identificarlos y eliminarlos fácilmente.

```bash
db.media.createIndex(
  { genres: 1 },
  { name: "indice_por_genero" }
)
```

#### ▶️ Ver todos los índices de una colección

```bash
db.users.getIndexes()
```

Verás el índice `_id_` (que se crea automáticamente) y los que hayas creado.

#### ▶️ Eliminar un índice

Puedes eliminar un índice usando el nombre que le diste:

```bash
db.media.dropIndex( "indice_por_genero" )
```

O usando la definición de claves (key pattern):

```bash
db.users.dropIndex( { email: 1 } )
```

#### ▶️ Analizar el rendimiento de una consulta (Explain)

Este es el comando más importante para optimizar. Te muestra *cómo* MongoDB ejecutó tu consulta y si usó un índice.

```bash
db.media.find( { genres: "Sci-Fi" } ).explain("executionStats")
```