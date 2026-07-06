// Módulo vacío para reemplazar módulos Node.js (child_process, fs, net, etc.)
// en el bundle del browser. Turbopack usa este archivo como alias cuando
// serverExternalPackages no es suficiente para aislar dependencias de Node.js.
export default {};
