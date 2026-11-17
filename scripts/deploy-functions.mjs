// Deploys every Edge Function that uses the shared engine, so none is left with an old copy of it
// (e.g. an old list of games to unlock). Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in the env.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const ref = process.env.SUPABASE_PROJECT_REF;
if (!ref || !process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('Set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN first.');
  process.exit(1);
}
execFileSync('node', ['scripts/sync-engine.mjs'], { stdio: 'inherit' });
const dir = 'supabase/functions';
const fns = readdirSync(dir).filter((f) => !f.startsWith('_') && existsSync(`${dir}/${f}/index.ts`) && readFileSync(`${dir}/${f}/index.ts`, 'utf8').includes('_shared/'));
for (const f of fns) {
  console.log(`deploying ${f}…`);
  execFileSync('npx', ['-y', 'supabase@3.1.0', 'functions', 'deploy', f, '--project-ref', ref, '--use-api', '--yes'], { stdio: 'inherit' });
}
console.log(`done: ${fns.join(', ')}`);
