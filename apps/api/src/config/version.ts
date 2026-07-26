import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg: { version: string } = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8'),
) as { version: string };
export const APP_VERSION: string = pkg.version;
