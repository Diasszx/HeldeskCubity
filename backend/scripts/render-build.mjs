import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
for (const folder of ['backend', 'frontend']) {
  for (const args of [
    ['ci', '--include=dev'],
    ['run', 'build'],
  ]) {
    const result = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args,
      {
        cwd: `${root}/${folder}`,
        stdio: 'inherit',
        env: { ...process.env, VITE_SHOW_DEMO_CREDENTIALS: 'false' },
        shell: process.platform === 'win32',
      },
    );
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
