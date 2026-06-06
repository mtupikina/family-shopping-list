import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER = '%%API_BASE_URL%%';
const envFile = join(dirname(fileURLToPath(import.meta.url)), '../src/environments/environment.prod.ts');
const apiBaseUrl = process.env.API_BASE_URL?.trim().replace(/\/$/, '');

const content = readFileSync(envFile, 'utf8');

if (!apiBaseUrl) {
  if (content.includes(PLACEHOLDER)) {
    console.error(
      'API_BASE_URL is required for production builds.\n' +
        'Example: https://family-api.onrender.com',
    );
    process.exit(1);
  }

  console.log('API_BASE_URL not set; using existing environment.prod.ts');
  process.exit(0);
}

writeFileSync(envFile, content.replaceAll(PLACEHOLDER, apiBaseUrl));
console.log(`Injected API_BASE_URL: ${apiBaseUrl}`);
