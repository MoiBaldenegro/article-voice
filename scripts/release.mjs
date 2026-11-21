// Publica en npm solo si el dueño del paquete lo activó explícitamente.
// Activar: variable del repositorio NPM_PUBLISH_ENABLED=true (y Trusted Publishing configurado en npm).
/* eslint-disable no-console, no-undef */
import { spawnSync } from 'node:child_process';

if (process.env.NPM_PUBLISH_ENABLED !== 'true') {
  console.log('Publicación en npm desactivada (NPM_PUBLISH_ENABLED != true): no se publica nada.');
  process.exit(0);
}

const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', shell: true }).status ?? 1;

const build = run('pnpm', ['build']);
if (build !== 0) process.exit(build);
process.exit(run('pnpm', ['exec', 'changeset', 'publish']));
