// =============================================================================
// 01 · Datos semilla
//
// Carga los documentos "reales" del prototipo (interfaces/assets/data.js):
// 16 títulos conocidos, sus directores y actores, los géneros, el usuario
// CineFan88 con sus reseñas y reproducciones. Así las pantallas del
// prototipo y la base muestran exactamente los mismos datos.
//
// Además agrega algunos géneros que el prototipo no usa, para que la
// generación masiva tenga más variedad.
//
// Uso:  mongosh db/01_datos_semilla.js
// =============================================================================

if (typeof CONFIG === "undefined") load(__dirname + "/config.js");
if (typeof titulo === "undefined") load(__dirname + "/lib/utilidades.js");

// Bloque propio: setup.js carga todos los scripts en el mismo contexto y así
// las constantes de un script no chocan con las de otro.
{

db = db.getSiblingDB(CONFIG.dbName);
titulo("Cargando datos semilla");

// data.js está escrito para el navegador: declara "const DB = {...}".
// Se ejecuta dentro de una función para no ensuciar el espacio global de mongosh.
const fs = require("fs");
const rutaPrototipo = __dirname + "/../interfaces/assets/data.js";
const PROTOTIPO = new Function(fs.readFileSync(rutaPrototipo, "utf8") + "\nreturn DB;")();
const semilla = (coleccion) => PROTOTIPO[coleccion].map(aBSON);

// ----------------------------------------------------------------- genres
const generosExtra = [
  { _id: "terror",     name: "Terror",     color: "#c2410c", description: "Historias para ver con la luz prendida." },
  { _id: "animacion",  name: "Animación",  color: "#ff7ac6", description: "Mundos dibujados, modelados o hechos cuadro por cuadro." },
  { _id: "documental", name: "Documental", color: "#a3a38c", description: "Historias reales contadas por sus protagonistas." },
  { _id: "romance",    name: "Romance",    color: "#f472b6", description: "Encuentros, desencuentros y segundas oportunidades." },
];
db.genres.insertMany([...semilla("genres"), ...generosExtra]);
paso(`genres: ${db.genres.countDocuments()}`);

// ----------------------------------------------------------------- people
db.people.insertMany(semilla("people").map((p) => ({ ...p, photo: `people/${slug(p.name)}.jpg` })));
paso(`people: ${db.people.countDocuments()}`);

// ------------------------------------------------------------------ media
// rating se recalcula después a partir de las reseñas (03_ratings.js)
db.media.insertMany(semilla("media"));
paso(`media: ${db.media.countDocuments()}`);

// ------------------------------------------------------------------ users
// El prototipo solo define a CineFan88 completo. Las reseñas de ejemplo
// mencionan a otros 5 usuarios: se crean con datos mínimos coherentes.
const usuarios = semilla("users");
const reviews = semilla("reviews");
const conocidos = new Set(usuarios.map((u) => u._id.toHexString()));
for (const r of reviews) {
  if (conocidos.has(r.user_id.toHexString())) continue;
  conocidos.add(r.user_id.toHexString());
  const username = r.user.username;
  usuarios.push({
    _id: r.user_id,
    username,
    email: `${username.replace(/[^a-z0-9]/gi, "")}@mail.com`,
    password_hash: "$2b$12$semilla",
    avatar: r.user.avatar,
    country: "Argentina",
    created_at: new Date("2024-06-01T12:00:00Z"),
    favorite_genre_ids: ["drama"],
    subscription: { plan: "Estándar", billing: "mensual", renewal_date: new Date("2026-11-01T00:00:00Z") },
    payment_methods: [{ type: "mercadopago", email: `${username.replace(/[^a-z0-9]/gi, "")}@mail.com`, is_default: true }],
    watchlist: [],
  });
}
db.users.insertMany(usuarios);
paso(`users: ${db.users.countDocuments()}`);

// ---------------------------------------------------------------- reviews
db.reviews.insertMany(reviews);
paso(`reviews: ${db.reviews.countDocuments()}`);

// ------------------------------------------------------------------ views
db.views.insertMany(semilla("views"));
paso(`views: ${db.views.countDocuments()}`);
}
