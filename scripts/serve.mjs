import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const page = new URL('../dist/index.html', import.meta.url);
const port = Number(process.env.PORT ?? 4173);
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end(); return;
  }
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!['/', '/index.html', '/qa/mobile'].includes(pathname)) {
    response.writeHead(404).end('Not found'); return;
  }
  try {
    const html = await readFile(pathname === '/qa/mobile' ? new URL('../test/mobile-qa.html', import.meta.url) : page);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : html);
  } catch {
    response.writeHead(503).end('Run npm run build first.');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`The perfect vibe coder. — http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
