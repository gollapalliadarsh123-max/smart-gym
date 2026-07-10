import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
run(npmCmd, ['run', 'build', '--workspace=@smart-gym/shared']);
run(npmCmd, ['run', 'build', '--workspace=@smart-gym/supabase']);
run(npmCmd, ['run', 'build', '--workspace=@smart-gym/web']);
