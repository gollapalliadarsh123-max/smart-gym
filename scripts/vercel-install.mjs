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

// Prefer npm from PATH via node resolution of global npm is unreliable;
// use `npm.cmd` on Windows when available, else `npm`.
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
run(npmCmd, ['install']);
