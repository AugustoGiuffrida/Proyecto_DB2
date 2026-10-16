// =============================================================================
// Auxiliares para los scripts de consultas
// =============================================================================

if (typeof CONFIG === "undefined") load(__dirname + "/../db/config.js");

db = db.getSiblingDB(CONFIG.dbName);

// "Hoy" es la fecha fija con la que se generaron los datos (db/config.js)
globalThis.HOY = CONFIG.hoy;
globalThis.haceDias = (n) => new Date(HOY.getTime() - n * 24 * 3600 * 1000);

// Documentos semilla (vienen del prototipo, sus _id son fijos)
globalThis.IDS = {
  cinefan: ObjectId("665f0c000000000000000001"),     // usuario logueado en el prototipo
  eternauta: ObjectId("665f0a000000000000000010"),   // serie destacada
  origen: ObjectId("665f0a000000000000000001"),      // "El origen" (película)
  breakingBad: ObjectId("665f0a000000000000000012"),
  darin: ObjectId("665f0b000000000000000010"),       // Ricardo Darín
  nolan: ObjectId("665f0b000000000000000001"),       // Christopher Nolan
};

// --- Salida ------------------------------------------------------------------
globalThis.seccion = (texto) => print(`\n${"═".repeat(78)}\n  ${texto}\n${"═".repeat(78)}`);

// Formato compacto de un valor: ObjectId abreviado, fechas legibles
const corto = function (v) {
  if (v === null || v === undefined) return String(v);
  if (v._bsontype === "ObjectId") return `…${v.toHexString().slice(-6)}`;
  if (v instanceof Date) return v.toISOString().slice(0, 16).replace("T", " ");
  if (Array.isArray(v)) return `[${v.map(corto).join(", ")}]`;
  if (typeof v === "object") return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${corto(x)}`).join(", ")} }`;
  if (typeof v === "string") return `"${v}"`;
  if (typeof v === "number" && !Number.isInteger(v)) return String(Math.round(v * 100) / 100);
  return String(v);
};
globalThis.linea = (doc, max = 170) => {
  const s = corto(doc);
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

// Ejecuta una consulta, mide el tiempo y muestra el resultado.
//   mostrar("Título", () => db.coleccion.find(...), { limite: 5 })
// El tiempo es orientativo; la medición formal se hace con explain().
globalThis.mostrar = function (titulo, consulta, { limite = 5, ancho = 170 } = {}) {
  const t0 = Date.now();
  let r = consulta();
  if (r && typeof r.toArray === "function") r = r.toArray();
  const ms = Date.now() - t0;

  if (Array.isArray(r)) {
    print(`\n▸ ${titulo}   (${r.length} ${r.length === 1 ? "resultado" : "resultados"}, ${ms} ms)`);
    r.slice(0, limite).forEach((d) => print(`    ${linea(d, ancho)}`));
    if (r.length > limite) print(`    … y ${r.length - limite} más`);
  } else {
    print(`\n▸ ${titulo}   (${ms} ms)`);
    print(`    ${r === null ? "sin resultados" : linea(r, ancho * 3)}`);
  }
  return r;
};
