// =============================================================================
// Funciones auxiliares para los scripts de carga
// =============================================================================

// --- Generador pseudoaleatorio con semilla (mulberry32) ----------------------
// Math.random() daría datos distintos en cada corrida; con semilla, la base
// generada es siempre la misma y las mediciones de rendimiento son comparables.
globalThis.crearAzar = function (semilla) {
  let s = semilla >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const azar = {
    num: rnd,                                                  // [0, 1)
    entero: (min, max) => min + Math.floor(rnd() * (max - min + 1)),
    elegir: (lista) => lista[Math.floor(rnd() * lista.length)],
    prob: (p) => rnd() < p,                                    // true con probabilidad p
    // n elementos distintos de la lista
    varios: (lista, n) => {
      const copia = lista.slice();
      const out = [];
      while (out.length < n && copia.length) out.push(copia.splice(Math.floor(rnd() * copia.length), 1)[0]);
      return out;
    },
    // normal aproximada (suma de uniformes)
    normal: (media, desvio) => media + desvio * ((rnd() + rnd() + rnd() + rnd() - 2) / 0.8165),
    fecha: (desde, hasta) => new Date(desde.getTime() + rnd() * (hasta.getTime() - desde.getTime())),
  };

  // Elección ponderada: devuelve una función que elige según los pesos.
  // Se usa para que algunos títulos sean mucho más populares que otros.
  azar.ponderado = function (items, pesos) {
    const acumulado = [];
    let total = 0;
    for (const p of pesos) { total += p; acumulado.push(total); }
    return () => {
      const x = rnd() * total;
      let lo = 0, hi = acumulado.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (acumulado[mid] < x) lo = mid + 1; else hi = mid; }
      return items[lo];
    };
  };
  return azar;
};

// --- Conversión de los datos del prototipo -----------------------------------
// interfaces/assets/data.js guarda ObjectId y fechas como strings para poder
// usarse en el navegador. Acá se convierten a tipos BSON reales.
globalThis.aBSON = function aBSON(v) {
  if (Array.isArray(v)) return v.map(aBSON);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = aBSON(x);
    return out;
  }
  if (typeof v === "string") {
    if (/^[0-9a-f]{24}$/.test(v)) return ObjectId(v);
    if (/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(v)) return new Date(v);
  }
  return v;
};

globalThis.slug = (texto) =>
  texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// --- Inserción por lotes con progreso -----------------------------------------
// generar(i) devuelve el documento número i (o null para saltearlo).
globalThis.insertarEnLotes = function (coleccion, cantidad, generar) {
  const tam = CONFIG.lote;
  let lote = [];
  let insertados = 0;
  const inicio = Date.now();
  const vaciar = () => {
    if (!lote.length) return;
    coleccion.insertMany(lote, { ordered: false });
    insertados += lote.length;
    lote = [];
    if (cantidad >= tam * 5) print(`    ${coleccion.getName()}: ${insertados.toLocaleString("es-AR")} / ${cantidad.toLocaleString("es-AR")}`);
  };
  for (let i = 0; i < cantidad; i++) {
    const doc = generar(i);
    if (doc) lote.push(doc);
    if (lote.length >= tam) vaciar();
  }
  vaciar();
  return { insertados, ms: Date.now() - inicio };
};

// --- Mensajes -----------------------------------------------------------------
globalThis.titulo = (texto) => print(`\n=== ${texto} ${"=".repeat(Math.max(0, 70 - texto.length))}`);
globalThis.paso = (texto) => print(`  - ${texto}`);
globalThis.cronometro = () => {
  const t0 = Date.now();
  return () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;
};
