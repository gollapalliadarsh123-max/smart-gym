import { cpSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npm', ['run', 'build', '--workspace=@smart-gym/shared']);
run('npm', ['run', 'build', '--workspace=@smart-gym/supabase']);
run('npm', ['run', 'build', '--workspace=@smart-gym/web']);

if (!existsSync('apps/web/.next')) {
  console.error('Missing apps/web/.next after build');
  process.exit(1);
}

cpSync('apps/web/.next', '.next', { recursive: true });
console.log('Copied apps/web/.next -> .next for Vercel');
