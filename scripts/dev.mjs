// Starts the Vite dev server (`npm run dev`).
//
// Some launchers start us from the 8.3 short path (C:\CLAUDE~1\BrickLog) because the
// real folder name contains a space. Vite cannot serve its own modules from there and
// answers every request with index.html. So we resolve the real path first and load
// Vite from it.
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = realpathSync.native(join(dirname(fileURLToPath(import.meta.url)), '..'));
process.chdir(root);

const vite = await import(pathToFileURL(join(root, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);
const server = await vite.createServer({ root, server: { port: 5173, strictPort: true } });
await server.listen();
server.printUrls();
