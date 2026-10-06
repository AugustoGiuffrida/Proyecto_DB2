/* ==========================================================================
   DATOS DE MUESTRA
   Cada objeto tiene EXACTAMENTE la forma de un documento de la colección
   correspondiente (ver colecciones.md). Las interfaces se renderizan a partir
   de estos documentos, así el prototipo y el modelo no se pueden desincronizar.
   Convenciones al mostrarlos como JSON:
     - strings de 24 caracteres hex  -> ObjectId("...")
     - strings ISO "YYYY-MM-DDT..."   -> ISODate("...")
   ========================================================================== */

// Episodios genéricos para temporadas que no detallamos a mano
function eps(cantidad, duracion) {
  return Array.from({ length: cantidad }, (_, i) => ({
    number: i + 1, title: `Episodio ${i + 1}`, runtime_min: duracion,
  }));
}
function named(titulos, duracion) {
  return titulos.map((title, i) => ({ number: i + 1, title, runtime_min: duracion }));
}

const DB = {};

/* ---------------------------------------------------------------- genres */
// _id = slug estable. media.genre_ids guarda estos slugs.
DB.genres = [
  { _id: "accion",          name: "Acción",          color: "#ff6a3d", description: "Persecuciones, peleas y adrenalina de principio a fin." },
  { _id: "aventura",        name: "Aventura",        color: "#4cc38a", description: "Viajes, mundos lejanos y héroes fuera de su zona de confort." },
  { _id: "ciencia-ficcion", name: "Ciencia Ficción", color: "#4f7cff", description: "Futuros posibles, viajes en el tiempo y preguntas sobre lo que nos hace humanos." },
  { _id: "comedia",         name: "Comedia",         color: "#ffc53d", description: "Historias para reírse, a veces de lo que no debería dar risa." },
  { _id: "crimen",          name: "Crimen",          color: "#9aa7bd", description: "Delincuentes, detectives y la delgada línea entre ambos." },
  { _id: "drama",           name: "Drama",           color: "#b072ff", description: "Personajes complejos enfrentando decisiones que los cambian." },
  { _id: "misterio",        name: "Misterio",        color: "#2bb5a5", description: "Enigmas que se resuelven pieza por pieza." },
  { _id: "thriller",        name: "Thriller",        color: "#ff3d6b", description: "Tensión sostenida y giros que no se ven venir." },
];

/* ---------------------------------------------------------------- people */
const P = (n) => "665f0b" + String(n).padStart(18, "0");
DB.people = [
  { _id: P(1),  name: "Christopher Nolan",   known_for: "Dirección", birth_date: "1970-07-30T00:00:00Z", country: "Reino Unido", bio: "Director y guionista británico. Su cine combina estructuras narrativas no lineales con producciones de gran escala filmadas en formato IMAX." },
  { _id: P(2),  name: "Leonardo DiCaprio",   known_for: "Actuación", birth_date: "1974-11-11T00:00:00Z", country: "Estados Unidos", bio: "Actor y productor estadounidense, reconocido por sus colaboraciones con grandes directores de autor." },
  { _id: P(3),  name: "Joseph Gordon-Levitt", known_for: "Actuación", birth_date: "1981-02-17T00:00:00Z", country: "Estados Unidos", bio: "Actor y director estadounidense que comenzó su carrera en televisión siendo niño." },
  { _id: P(4),  name: "Elliot Page",         known_for: "Actuación", birth_date: "1987-02-21T00:00:00Z", country: "Canadá", bio: "Actor canadiense con una carrera que abarca cine independiente y grandes producciones." },
  { _id: P(5),  name: "Tom Hardy",           known_for: "Actuación", birth_date: "1977-09-15T00:00:00Z", country: "Reino Unido", bio: "Actor británico conocido por sus transformaciones físicas para cada personaje." },
  { _id: P(6),  name: "Matthew McConaughey", known_for: "Actuación", birth_date: "1969-11-04T00:00:00Z", country: "Estados Unidos", bio: "Actor estadounidense que pasó de la comedia romántica a papeles dramáticos de gran intensidad." },
  { _id: P(7),  name: "Anne Hathaway",       known_for: "Actuación", birth_date: "1982-11-12T00:00:00Z", country: "Estados Unidos", bio: "Actriz estadounidense ganadora del Óscar, con trabajos en drama, comedia y musicales." },
  { _id: P(8),  name: "Christian Bale",      known_for: "Actuación", birth_date: "1974-01-30T00:00:00Z", country: "Reino Unido", bio: "Actor británico famoso por su compromiso extremo con cada papel." },
  { _id: P(9),  name: "Heath Ledger",        known_for: "Actuación", birth_date: "1979-04-04T00:00:00Z", country: "Australia", bio: "Actor australiano recordado por una de las interpretaciones de villano más celebradas del cine." },
  { _id: P(10), name: "Ricardo Darín",       known_for: "Actuación", birth_date: "1957-01-16T00:00:00Z", country: "Argentina", bio: "Actor argentino, figura central del cine latinoamericano contemporáneo. Protagonizó dos películas nominadas al Óscar y la serie de ciencia ficción más vista del país." },
  { _id: P(11), name: "Juan José Campanella", known_for: "Dirección", birth_date: "1959-07-19T00:00:00Z", country: "Argentina", bio: "Director argentino ganador del Óscar a Mejor Película Extranjera." },
  { _id: P(12), name: "Soledad Villamil",    known_for: "Actuación", birth_date: "1969-06-19T00:00:00Z", country: "Argentina", bio: "Actriz y cantante argentina." },
  { _id: P(13), name: "Guillermo Francella", known_for: "Actuación", birth_date: "1955-02-14T00:00:00Z", country: "Argentina", bio: "Actor argentino que transitó del humor televisivo a papeles dramáticos premiados." },
  { _id: P(14), name: "Damián Szifron",      known_for: "Dirección", birth_date: "1975-07-09T00:00:00Z", country: "Argentina", bio: "Director y guionista argentino, creador de series y películas de culto." },
  { _id: P(15), name: "Érica Rivas",         known_for: "Actuación", birth_date: "1974-04-12T00:00:00Z", country: "Argentina", bio: "Actriz argentina de cine, teatro y televisión." },
  { _id: P(16), name: "Leonardo Sbaraglia",  known_for: "Actuación", birth_date: "1970-06-30T00:00:00Z", country: "Argentina", bio: "Actor argentino con extensa carrera en Argentina y España." },
  { _id: P(17), name: "Denis Villeneuve",    known_for: "Dirección", birth_date: "1967-10-03T00:00:00Z", country: "Canadá", bio: "Director canadiense referente de la ciencia ficción contemporánea." },
  { _id: P(18), name: "Timothée Chalamet",   known_for: "Actuación", birth_date: "1995-12-27T00:00:00Z", country: "Estados Unidos", bio: "Actor estadounidense de la nueva generación de Hollywood." },
  { _id: P(19), name: "Zendaya",             known_for: "Actuación", birth_date: "1996-09-01T00:00:00Z", country: "Estados Unidos", bio: "Actriz y cantante estadounidense." },
  { _id: P(20), name: "Amy Adams",           known_for: "Actuación", birth_date: "1974-08-20T00:00:00Z", country: "Estados Unidos", bio: "Actriz estadounidense con múltiples nominaciones al Óscar." },
  { _id: P(21), name: "Bong Joon-ho",        known_for: "Dirección", birth_date: "1969-09-14T00:00:00Z", country: "Corea del Sur", bio: "Director surcoreano, primer cineasta en ganar el Óscar a Mejor Película con un film de habla no inglesa." },
  { _id: P(22), name: "Song Kang-ho",        known_for: "Actuación", birth_date: "1967-01-17T00:00:00Z", country: "Corea del Sur", bio: "Actor surcoreano, colaborador habitual de Bong Joon-ho." },
  { _id: P(23), name: "George Miller",       known_for: "Dirección", birth_date: "1945-03-03T00:00:00Z", country: "Australia", bio: "Director australiano, creador de la saga Mad Max." },
  { _id: P(24), name: "Charlize Theron",     known_for: "Actuación", birth_date: "1975-08-07T00:00:00Z", country: "Sudáfrica", bio: "Actriz y productora sudafricana ganadora del Óscar." },
  { _id: P(25), name: "Bruno Stagnaro",      known_for: "Dirección", birth_date: "1973-01-01T00:00:00Z", country: "Argentina", bio: "Director argentino, figura del nuevo cine argentino de los noventa." },
  { _id: P(26), name: "Carla Peterson",      known_for: "Actuación", birth_date: "1974-02-09T00:00:00Z", country: "Argentina", bio: "Actriz argentina de cine, teatro y televisión." },
  { _id: P(27), name: "Baran bo Odar",       known_for: "Dirección", birth_date: "1978-04-18T00:00:00Z", country: "Alemania", bio: "Director suizo-alemán, cocreador de la serie Dark." },
  { _id: P(28), name: "Louis Hofmann",       known_for: "Actuación", birth_date: "1997-06-03T00:00:00Z", country: "Alemania", bio: "Actor alemán." },
  { _id: P(29), name: "Vince Gilligan",      known_for: "Dirección", birth_date: "1967-02-10T00:00:00Z", country: "Estados Unidos", bio: "Guionista y productor estadounidense, creador de Breaking Bad." },
  { _id: P(30), name: "Bryan Cranston",      known_for: "Actuación", birth_date: "1956-03-07T00:00:00Z", country: "Estados Unidos", bio: "Actor estadounidense ganador de múltiples premios Emmy." },
  { _id: P(31), name: "Aaron Paul",          known_for: "Actuación", birth_date: "1979-08-27T00:00:00Z", country: "Estados Unidos", bio: "Actor estadounidense." },
  { _id: P(32), name: "Ben Stiller",         known_for: "Dirección", birth_date: "1965-11-30T00:00:00Z", country: "Estados Unidos", bio: "Actor y director estadounidense." },
  { _id: P(33), name: "Adam Scott",          known_for: "Actuación", birth_date: "1973-04-03T00:00:00Z", country: "Estados Unidos", bio: "Actor estadounidense." },
  { _id: P(34), name: "Fabián Bielinsky",    known_for: "Dirección", birth_date: "1959-02-03T00:00:00Z", country: "Argentina", bio: "Director y guionista argentino." },
  { _id: P(35), name: "Gastón Pauls",        known_for: "Actuación", birth_date: "1972-01-17T00:00:00Z", country: "Argentina", bio: "Actor argentino." },
  { _id: P(36), name: "Cillian Murphy",      known_for: "Actuación", birth_date: "1976-05-25T00:00:00Z", country: "Irlanda", bio: "Actor irlandés ganador del Óscar a Mejor Actor." },
  { _id: P(37), name: "Jantje Friese",       known_for: "Dirección", birth_date: "1977-01-01T00:00:00Z", country: "Alemania", bio: "Guionista y productora alemana, cocreadora de la serie Dark junto a Baran bo Odar." },
];

/* ----------------------------------------------------------------- media */
// Patrón polimórfico: type "movie" tiene runtime_min; type "series" tiene seasons.
// directors y cast: arrays con referencia extendida (person_id + name) a people.
const M = (n) => "665f0a" + String(n).padStart(18, "0");
const cast = (id, character) => ({ person_id: P(id), name: DB.people[id - 1].name, character });
const dir = (id) => ({ person_id: P(id), name: DB.people[id - 1].name });

DB.media = [
  { _id: M(1), title: "El origen", original_title: "Inception", type: "movie", release_year: 2010, runtime_min: 148,
    plot: "Un ladrón especializado en infiltrarse en los sueños recibe un encargo imposible: en lugar de robar una idea, tiene que implantarla.",
    genre_ids: ["ciencia-ficcion", "accion", "thriller"], rating: { avg: 8.8, count: 2140 },
    poster: "posters/inception.jpg", backdrop: "backdrops/inception.jpg", is_featured: false, created_at: "2025-02-11T10:00:00Z",
    directors: [dir(1)], cast: [cast(2, "Cobb"), cast(3, "Arthur"), cast(4, "Ariadne"), cast(5, "Eames")] },

  { _id: M(2), title: "Interestelar", original_title: "Interstellar", type: "movie", release_year: 2014, runtime_min: 169,
    plot: "Con la Tierra al borde del colapso, un grupo de astronautas atraviesa un agujero de gusano en busca de un nuevo hogar para la humanidad.",
    genre_ids: ["ciencia-ficcion", "drama", "aventura"], rating: { avg: 8.7, count: 1984 },
    poster: "posters/interstellar.jpg", backdrop: "backdrops/interstellar.jpg", is_featured: false, created_at: "2025-03-02T10:00:00Z",
    directors: [dir(1)], cast: [cast(6, "Cooper"), cast(7, "Brand")] },

  { _id: M(3), title: "Batman: El caballero de la noche", original_title: "The Dark Knight", type: "movie", release_year: 2008, runtime_min: 152,
    plot: "Batman enfrenta a un criminal que no quiere dinero ni poder: solo quiere ver cómo Ciudad Gótica se destruye a sí misma.",
    genre_ids: ["accion", "crimen", "drama"], rating: { avg: 9.0, count: 2577 },
    poster: "posters/dark-knight.jpg", backdrop: "backdrops/dark-knight.jpg", is_featured: false, created_at: "2025-01-20T10:00:00Z",
    directors: [dir(1)], cast: [cast(8, "Bruce Wayne"), cast(9, "Joker")] },

  { _id: M(4), title: "El secreto de sus ojos", type: "movie", release_year: 2009, runtime_min: 129,
    plot: "Un empleado judicial retirado decide escribir una novela sobre un crimen que investigó veinticinco años atrás y que nunca pudo olvidar.",
    genre_ids: ["drama", "misterio", "crimen"], rating: { avg: 8.2, count: 1210 },
    poster: "posters/secreto-ojos.jpg", backdrop: "backdrops/secreto-ojos.jpg", is_featured: false, created_at: "2025-06-14T10:00:00Z",
    directors: [dir(11)], cast: [cast(10, "Benjamín Espósito"), cast(12, "Irene Menéndez Hastings"), cast(13, "Pablo Sandoval")] },

  { _id: M(5), title: "Relatos salvajes", type: "movie", release_year: 2014, runtime_min: 122,
    plot: "Seis historias independientes sobre personas comunes que, empujadas al límite, pierden el control de la forma más extrema.",
    genre_ids: ["comedia", "drama", "thriller"], rating: { avg: 8.1, count: 1432 },
    poster: "posters/relatos.jpg", backdrop: "backdrops/relatos.jpg", is_featured: false, created_at: "2025-08-01T10:00:00Z",
    directors: [dir(14)], cast: [cast(10, "Simón Fischer"), cast(15, "Romina"), cast(16, "Diego")] },

  { _id: M(6), title: "Duna: Parte dos", original_title: "Dune: Part Two", type: "movie", release_year: 2024, runtime_min: 166,
    plot: "Paul Atreides se une a los Fremen en el desierto de Arrakis mientras busca venganza contra quienes destruyeron a su familia.",
    genre_ids: ["ciencia-ficcion", "aventura", "drama"], rating: { avg: 8.6, count: 1655 },
    poster: "posters/dune-2.jpg", backdrop: "backdrops/dune-2.jpg", is_featured: false, created_at: "2026-09-12T10:00:00Z",
    directors: [dir(17)], cast: [cast(18, "Paul Atreides"), cast(19, "Chani")] },

  { _id: M(7), title: "La llegada", original_title: "Arrival", type: "movie", release_year: 2016, runtime_min: 116,
    plot: "Una lingüista es convocada para comunicarse con los visitantes de doce naves que aparecieron sin aviso en distintos puntos del planeta.",
    genre_ids: ["ciencia-ficcion", "drama", "misterio"], rating: { avg: 7.9, count: 987 },
    poster: "posters/arrival.jpg", backdrop: "backdrops/arrival.jpg", is_featured: false, created_at: "2025-11-05T10:00:00Z",
    directors: [dir(17)], cast: [cast(20, "Louise Banks")] },

  { _id: M(8), title: "Parásitos", original_title: "Gisaengchung", type: "movie", release_year: 2019, runtime_min: 132,
    plot: "Una familia sin recursos se infiltra, uno por uno, en la casa de una familia millonaria. Lo que empieza como una estafa termina en algo mucho más oscuro.",
    genre_ids: ["thriller", "drama", "comedia"], rating: { avg: 8.5, count: 1802 },
    poster: "posters/parasite.jpg", backdrop: "backdrops/parasite.jpg", is_featured: false, created_at: "2026-02-18T10:00:00Z",
    directors: [dir(21)], cast: [cast(22, "Kim Ki-taek")] },

  { _id: M(9), title: "Mad Max: Furia en el camino", original_title: "Mad Max: Fury Road", type: "movie", release_year: 2015, runtime_min: 120,
    plot: "En un desierto postapocalíptico, una guerrera rebelde y un vagabundo atormentado huyen de un tirano a bordo de un camión de guerra.",
    genre_ids: ["accion", "aventura", "ciencia-ficcion"], rating: { avg: 8.1, count: 1390 },
    poster: "posters/mad-max.jpg", backdrop: "backdrops/mad-max.jpg", is_featured: false, created_at: "2026-05-09T10:00:00Z",
    directors: [dir(23)], cast: [cast(5, "Max Rockatansky"), cast(24, "Furiosa")] },

  { _id: M(10), title: "El Eternauta", type: "series", release_year: 2025,
    plot: "Una noche, en Buenos Aires, empieza a caer una nevada que mata a todo lo que toca. Juan Salvo y un grupo de sobrevivientes deben resistir una invasión que recién comienza.",
    genre_ids: ["ciencia-ficcion", "drama", "thriller"], rating: { avg: 8.4, count: 3120 },
    poster: "posters/eternauta.jpg", backdrop: "backdrops/eternauta.jpg", is_featured: true, created_at: "2026-04-30T10:00:00Z",
    directors: [dir(25)], cast: [cast(10, "Juan Salvo"), cast(26, "Elena")],
    seasons: [
      { number: 1, year: 2025, episodes: named(["Una noche de truco", "La nevada", "El refugio", "Salida", "Los cascarudos", "El estadio"], 58) },
    ] },

  { _id: M(11), title: "Dark", type: "series", release_year: 2017,
    plot: "La desaparición de dos chicos en un pequeño pueblo alemán destapa los secretos de cuatro familias y un ciclo que se repite cada 33 años.",
    genre_ids: ["ciencia-ficcion", "misterio", "drama"], rating: { avg: 8.7, count: 2290 },
    poster: "posters/dark.jpg", backdrop: "backdrops/dark.jpg", is_featured: false, created_at: "2025-09-21T10:00:00Z",
    directors: [dir(27), dir(37)], cast: [cast(28, "Jonas Kahnwald")],
    seasons: [
      { number: 1, year: 2017, episodes: named(["Secretos", "Mentiras", "Pasado y presente", "Vidas dobles", "Verdades", "Sic mundus creatus est", "Encrucijada", "Lo que siembras, cosechas", "Todo es ahora", "Alfa y omega"], 52) },
      { number: 2, year: 2019, episodes: eps(8, 55) },
      { number: 3, year: 2020, episodes: eps(8, 60) },
    ] },

  { _id: M(12), title: "Breaking Bad", type: "series", release_year: 2008,
    plot: "Un profesor de química con un diagnóstico terminal empieza a fabricar metanfetamina para asegurar el futuro de su familia.",
    genre_ids: ["drama", "crimen", "thriller"], rating: { avg: 9.5, count: 3804 },
    poster: "posters/breaking-bad.jpg", backdrop: "backdrops/breaking-bad.jpg", is_featured: false, created_at: "2025-01-05T10:00:00Z",
    directors: [dir(29)], cast: [cast(30, "Walter White"), cast(31, "Jesse Pinkman")],
    seasons: [
      { number: 1, year: 2008, episodes: eps(7, 47) }, { number: 2, year: 2009, episodes: eps(13, 47) },
      { number: 3, year: 2010, episodes: eps(13, 47) }, { number: 4, year: 2011, episodes: eps(13, 47) },
      { number: 5, year: 2012, episodes: eps(16, 47) },
    ] },

  { _id: M(13), title: "Separación", original_title: "Severance", type: "series", release_year: 2022,
    plot: "Los empleados de una corporación se someten a un procedimiento que separa por completo sus recuerdos laborales de su vida personal.",
    genre_ids: ["ciencia-ficcion", "misterio", "thriller"], rating: { avg: 8.7, count: 1150 },
    poster: "posters/severance.jpg", backdrop: "backdrops/severance.jpg", is_featured: false, created_at: "2026-07-22T10:00:00Z",
    directors: [dir(32)], cast: [cast(33, "Mark Scout")],
    seasons: [ { number: 1, year: 2022, episodes: eps(9, 50) }, { number: 2, year: 2025, episodes: eps(10, 52) } ] },

  { _id: M(14), title: "Nueve reinas", type: "movie", release_year: 2000, runtime_min: 114,
    plot: "Dos estafadores que se conocen por casualidad tienen un día para concretar el golpe de su vida: vender una plancha de estampillas falsas.",
    genre_ids: ["crimen", "thriller", "comedia"], rating: { avg: 7.9, count: 940 },
    poster: "posters/nueve-reinas.jpg", backdrop: "backdrops/nueve-reinas.jpg", is_featured: false, created_at: "2026-08-30T10:00:00Z",
    directors: [dir(34)], cast: [cast(10, "Marcos"), cast(35, "Juan")] },

  { _id: M(15), title: "Oppenheimer", type: "movie", release_year: 2023, runtime_min: 180,
    plot: "La historia del físico que dirigió el desarrollo de la primera bomba atómica y de las consecuencias que cargó por el resto de su vida.",
    genre_ids: ["drama", "thriller"], rating: { avg: 8.4, count: 1720 },
    poster: "posters/oppenheimer.jpg", backdrop: "backdrops/oppenheimer.jpg", is_featured: false, created_at: "2026-09-28T10:00:00Z",
    directors: [dir(1)], cast: [cast(36, "J. Robert Oppenheimer")] },

  { _id: M(16), title: "Duna", original_title: "Dune", type: "movie", release_year: 2021, runtime_min: 155,
    plot: "El heredero de una familia noble es enviado al planeta más peligroso del universo, el único lugar donde se encuentra la sustancia más valiosa que existe.",
    genre_ids: ["ciencia-ficcion", "aventura"], rating: { avg: 8.0, count: 1499 },
    poster: "posters/dune.jpg", backdrop: "backdrops/dune.jpg", is_featured: false, created_at: "2025-10-10T10:00:00Z",
    directors: [dir(17)], cast: [cast(18, "Paul Atreides"), cast(19, "Chani")] },
];

/* ----------------------------------------------------------------- users */
// Usuario logueado en el prototipo. watchlist = referencias a media.
// Lo "visto" no se guarda acá: se obtiene de la colección views.
const U = (n) => "665f0c" + String(n).padStart(18, "0");
DB.users = [
  { _id: U(1), username: "CineFan88", email: "cinefan@email.com", password_hash: "$2b$12$Qe1...", avatar: "avatars/cinefan88.jpg",
    birth_date: "1998-05-25T00:00:00Z", country: "Argentina", created_at: "2024-01-15T18:30:00Z",
    favorite_genre_ids: ["ciencia-ficcion", "drama", "thriller"],
    subscription: { plan: "Premium", billing: "anual", renewal_date: "2027-01-15T00:00:00Z" },
    payment_methods: [
      { type: "card", brand: "Visa", last4: "4242", expiry: "08/28", is_default: true },
      { type: "mercadopago", email: "cinefan@email.com", is_default: false },
    ],
    watchlist: [M(6), M(13), M(8), M(14), M(7)] },
];
DB.currentUserId = U(1);

/* --------------------------------------------------------------- reviews */
// user: snapshot desnormalizado (patrón de referencia extendida) para no hacer $lookup a users.
const R = (n) => "665f0d" + String(n).padStart(18, "0");
const by = (username) => ({ username, avatar: `avatars/${username.toLowerCase().replace(/[^a-z0-9]/g, "")}.jpg` });
DB.reviews = [
  { _id: R(1),  media_id: M(10), user_id: U(1), user: by("CineFan88"),    rating: 9,  created_at: "2026-05-04T22:10:00Z", comment: "Por fin una producción argentina de este nivel. La nevada da miedo de verdad y Darín carga la serie sin esfuerzo." },
  { _id: R(2),  media_id: M(10), user_id: U(2), user: by("lucia.mza"),    rating: 8,  created_at: "2026-05-02T01:45:00Z", comment: "Los primeros tres capítulos son perfectos. Después baja un poco el ritmo, pero el final deja con ganas de más." },
  { _id: R(3),  media_id: M(10), user_id: U(3), user: by("nachoreviews"), rating: 10, created_at: "2026-05-01T19:20:00Z", comment: "Crecí leyendo la historieta y no podía creer lo bien que la adaptaron. El estadio es una de las mejores escenas del año." },
  { _id: R(4),  media_id: M(10), user_id: U(4), user: by("la_vero_cine"), rating: 7,  created_at: "2026-04-30T23:59:00Z", comment: "Visualmente impecable. Me hubiera gustado más desarrollo de los personajes secundarios." },
  { _id: R(5),  media_id: M(1),  user_id: U(1), user: by("CineFan88"),    rating: 10, created_at: "2025-03-01T21:00:00Z", comment: "La vi cinco veces y todavía encuentro detalles nuevos. La escena del pasillo rotando es historia del cine." },
  { _id: R(6),  media_id: M(1),  user_id: U(5), user: by("tomasfilms"),   rating: 9,  created_at: "2025-02-20T16:40:00Z", comment: "Compleja pero nunca confusa. La música hace la mitad del trabajo." },
  { _id: R(7),  media_id: M(1),  user_id: U(6), user: by("martu_series"), rating: 8,  created_at: "2025-02-14T12:05:00Z", comment: "Me encantó la idea, aunque el último acto se me hizo largo." },
  { _id: R(8),  media_id: M(11), user_id: U(1), user: by("CineFan88"),    rating: 10, created_at: "2025-10-30T02:15:00Z", comment: "Hay que verla con un cuaderno al lado para seguir los árboles genealógicos, y vale cada minuto." },
  { _id: R(9),  media_id: M(11), user_id: U(3), user: by("nachoreviews"), rating: 9,  created_at: "2025-10-12T20:00:00Z", comment: "La mejor serie de viajes en el tiempo que vi. Todo cierra." },
  { _id: R(10), media_id: M(4),  user_id: U(2), user: by("lucia.mza"),    rating: 9,  created_at: "2025-07-01T23:30:00Z", comment: "El plano secuencia en la cancha de Huracán sigue siendo impresionante." },
  { _id: R(11), media_id: M(4),  user_id: U(1), user: by("CineFan88"),    rating: 8,  created_at: "2025-06-20T22:00:00Z", comment: "Darín y Villamil tienen una química increíble. Francella se roba cada escena en la que aparece." },
  { _id: R(12), media_id: M(5),  user_id: U(5), user: by("tomasfilms"),   rating: 8,  created_at: "2025-08-10T18:10:00Z", comment: "Bombita es el personaje más argentino que existe." },
];

/* ----------------------------------------------------------------- views */
// Time series collection: timeField = ts, metaField = meta (el usuario: cada usuario es "una serie").
// Cada documento es una sesión de reproducción.
DB.views = [
  { ts: "2026-10-03T23:10:00Z", meta: { user_id: U(1) }, media_id: M(10), episode: { season: 1, number: 4 }, minutes: 32, completed: false },
  { ts: "2026-10-03T22:05:00Z", meta: { user_id: U(1) }, media_id: M(10), episode: { season: 1, number: 3 }, minutes: 58, completed: true },
  { ts: "2026-10-02T21:40:00Z", meta: { user_id: U(1) }, media_id: M(6),  minutes: 71, completed: false },
  { ts: "2026-10-01T00:30:00Z", meta: { user_id: U(1) }, media_id: M(10), episode: { season: 1, number: 2 }, minutes: 58, completed: true },
  { ts: "2026-09-30T23:20:00Z", meta: { user_id: U(1) }, media_id: M(10), episode: { season: 1, number: 1 }, minutes: 58, completed: true },
  { ts: "2026-09-28T20:00:00Z", meta: { user_id: U(1) }, media_id: M(11), episode: { season: 2, number: 3 }, minutes: 21, completed: false },
  { ts: "2026-09-27T19:15:00Z", meta: { user_id: U(1) }, media_id: M(15), minutes: 180, completed: true },
  { ts: "2026-09-25T22:45:00Z", meta: { user_id: U(1) }, media_id: M(11), episode: { season: 2, number: 2 }, minutes: 55, completed: true },
  { ts: "2026-09-24T22:00:00Z", meta: { user_id: U(1) }, media_id: M(11), episode: { season: 2, number: 1 }, minutes: 55, completed: true },
  { ts: "2026-09-20T18:30:00Z", meta: { user_id: U(1) }, media_id: M(9),  minutes: 120, completed: true },
];

// Resultado de la agregación "Tendencias de la semana" sobre views
// (pipeline en la pantalla de Inicio). En el prototipo se usa el resultado ya calculado.
DB.trending_result = [
  { _id: M(10), views: 48210 }, { _id: M(6),  views: 39874 }, { _id: M(15), views: 31502 },
  { _id: M(13), views: 27116 }, { _id: M(14), views: 22430 }, { _id: M(12), views: 20981 },
  { _id: M(8),  views: 18744 }, { _id: M(11), views: 16020 }, { _id: M(9),  views: 12408 },
  { _id: M(1),  views: 11377 },
];
