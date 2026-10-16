// =============================================================================
// Ejecuta todas las consultas, pantalla por pantalla.
// Uso:  mongosh consultas/todas.js
// =============================================================================

load(__dirname + "/lib.js");

for (const script of ["1_inicio.js", "2_detalle.js", "3_persona.js", "4_genero.js", "5_perfil.js", "6_escritura.js", "7_analitica.js"]) {
  load(`${__dirname}/${script}`);
}
