import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

test('build is one standalone HTML with valid embedded JavaScript and no external assets', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: new URL('../', import.meta.url) });
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /<title>The perfect vibe coder\.<\/title>/);
  assert.match(html, /Who is JSON\?/);
  assert.doesNotMatch(html, /<(script|link|img)[^>]+(?:src|href)=["'](?:https?:|\/\/)/);
  assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
  const code = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Script(code));
  assert.doesNotMatch(code, /^import /m);
  assert.match(code, /"id":"colors"/);
  assert.match(code, /"id":"origins"/);
});
