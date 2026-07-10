// Módulo vacío para reemplazar módulos Node.js (child_process, fs, net, etc.)
// en el bundle del browser. Turbopack usa este archivo como alias cuando
// serverExternalPackages no es suficiente para aislar dependencias de Node.js.

// Re-exportar cualquier nombre que el código cliente pudiera importar.
// Todos retornan undefined o funciones no-op, lo cual es seguro porque
// estos módulos solo se usan en el servidor (Route Handlers).

// fs
export const writeFileSync = () => {};
export const mkdirSync = () => {};
export const existsSync = () => false;
export const copyFileSync = () => {};
export const readdirSync = () => [];
export const readFileSync = () => "";
export const unlinkSync = () => {};
export const statSync = () => ({});
export const rmSync = () => {};
export const readFile = () => Promise.resolve("");
export const writeFile = () => Promise.resolve();
export const mkdir = () => Promise.resolve();
export const access = () => Promise.resolve();
export const createReadStream = () => ({});
export const createWriteStream = () => ({});
export const rename = () => Promise.resolve();
export const rmdir = () => Promise.resolve();

// child_process
export const exec = () => ({});
export const execSync = () => "";
export const spawn = () => ({});
export const spawnSync = () => ({});
export const fork = () => ({});
export const execFile = () => ({});
export const execFileSync = () => "";

// path (en caso de que se alias)
export const join = (...args: string[]) => args.join("/");
export const resolve = (...args: string[]) => args.join("/");
export const basename = (p: string) => p;
export const dirname = (p: string) => p;
export const extname = (p: string) => "";

// util
export const promisify = (fn: unknown) => fn;

const emptyModule: Record<string, unknown> = {};
export default emptyModule;
