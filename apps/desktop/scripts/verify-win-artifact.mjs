import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve, sep } from 'node:path';

const resources = resolve(process.argv[2] ?? '../../release/win-unpacked/resources');
const unpacked = join(resources, 'app.asar.unpacked');
const collectorEntry = join(unpacked, 'node_modules/@telemetry-desk/collector/dist/main.js');
const runtimeModules = [
  '@telemetry-desk/application',
  '@telemetry-desk/domain',
  '@telemetry-desk/infrastructure',
  '@telemetry-desk/platform',
  '@telemetry-desk/shared',
  'drizzle-orm/node-sqlite',
  'zod',
];

await access(join(resources, 'app.asar'));
await access(collectorEntry);

const requireFromCollector = createRequire(collectorEntry);
for (const moduleName of runtimeModules) {
  const modulePath = requireFromCollector.resolve(moduleName);
  if (!modulePath.startsWith(`${unpacked}${sep}`)) {
    throw new Error(`${moduleName} resolved outside app.asar.unpacked: ${modulePath}`);
  }
  await access(modulePath);
}

console.log(`Windows artifact runtime closure verified: ${resources}`);
