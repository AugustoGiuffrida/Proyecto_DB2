// =============================================================================
// Configuración compartida por todos los scripts de db/
// Se puede cambiar el volumen de datos sin tocar el resto del código.
// =============================================================================

globalThis.CONFIG = {
  dbName: "fotograma",

  // Cantidades que genera 02_datos_masivos.js (se suman a los datos semilla)
  cantidades: {
    people: 4000,
    media: 3000,
    users: 10000,
    reviews: 150000,
    views: 1000000,
  },

  // Rango de fechas de las reproducciones (views): últimos N días
  diasDeViews: 90,

  // "Hoy" para la generación de datos (fijo para que los datos sean reproducibles)
  hoy: new Date("2026-10-06T12:00:00Z"),

  // Semilla del generador pseudoaleatorio: mismo número -> mismos datos (salvo los _id)
  semilla: 2026,

  // Tamaño de lote para insertMany
  lote: 10000,
};
