// Removes stale TypeScript build state (composite-project .d.ts output and *.tsbuildinfo).
// Run `npm run clean:ts` if tsc reports missing properties that exist in the source schema.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skip = new Set(['node_modules', '.git']);
let removed = 0;
const rm = (p) => { fs.rmSync(p, { recursive: true, force: true }); removed++; console.log('removed', path.relative(root, p)); };
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const full = path.join(d, e.name);
    if (e.isFile() && (e.name.endsWith('.tsbuildinfo'))) rm(full);
    else if (e.isDirectory()) {
      if (e.name === 'dist' && fs.existsSync(path.join(d, 'tsconfig.json')) && path.relative(root, d).startsWith(path.join('backend', 'lib'))) rm(full);
      else walk(full);
    }
  }
})(root);
console.log(removed ? `Cleaned ${removed} stale item(s).` : 'Nothing to clean.');
