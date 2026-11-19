// Node ESM resolve hook: maps the Vite alias '@/…' to 'src/…' so unit tests import
// application modules exactly as the app does.
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const CANDIDATES = ['', '.js', '.jsx', '/index.js', '/index.jsx'];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = path.join(srcDir, specifier.slice(2));
    for (const suffix of CANDIDATES) {
      const candidate = base + suffix;
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
