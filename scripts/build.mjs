import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(root, 'public');
const templatePath = join(root, 'diary', 'templates', 'index.html');
const staticPath = join(root, 'diary', 'static');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const template = await readFile(templatePath, 'utf8');
const html = template.replace(
    /\{\{\s*url_for\('static',\s*filename='([^']+)'\)\s*\}\}/g,
    '/static/$1'
);

if (html.includes('{{') || html.includes('url_for(')) {
    throw new Error('Unconverted Flask template expressions remain in index.html.');
}

await writeFile(join(outputDirectory, 'index.html'), html);
await cp(staticPath, join(outputDirectory, 'static'), { recursive: true });
console.log('Built Netlify static site in public/.');