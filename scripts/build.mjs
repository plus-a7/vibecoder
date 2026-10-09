import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { validateQuestions } from '../src/game.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const questions = validateQuestions(JSON.parse(await read('data/questions.json')));
const sources = await Promise.all(['src/game.mjs', 'src/app.mjs'].map(read));
const script = `const QUESTIONS = ${JSON.stringify(questions)};\n` + sources.map(source => source
  .replace(/^import .*;\n/gm, '')
  .replace(/^export /gm, '')).join('\n');
const output = (await read('src/index.html'))
  .replace('/* STYLES */', await read('src/styles.css'))
  .replace('/* APP */', script.replace(/<\/script/gi, '<\\/script'));
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/index.html', root), output);
console.log(`Built dist/index.html (${Buffer.byteLength(output)} bytes, ${questions.length} questions). No runtime dependencies or network requests.`);
