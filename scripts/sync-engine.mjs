// Copies the pure TypeScript engine into supabase/functions/_shared/engine so Edge Functions run the
// exact same rules as the app. Run before `supabase functions deploy` (CI checks it is up to date).
import { cpSync, rmSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const src = new URL('../src/engine', import.meta.url).pathname;
const dst = new URL('../supabase/functions/_shared/engine', import.meta.url).pathname;
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true, filter: (p) => !p.includes('__tests__') });
const count = (d) => readdirSync(d).reduce((n, f) => n + (statSync(join(d, f)).isDirectory() ? count(join(d, f)) : 1), 0);
writeFileSync(join(dst, 'README.md'), '# Generated\nCopied from src/engine by scripts/sync-engine.mjs — do not edit here.\n');
console.log(`engine synced: ${count(dst)} files`);
