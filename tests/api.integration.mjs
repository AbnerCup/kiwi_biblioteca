// Real HTTP integration tests against PHP + a disposable SQLite database.
// Production uses MySQL; both run the same schema and application queries.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:net';

const sandbox = resolve('tests/.runtime');
mkdirSync(sandbox, { recursive: true });
const runtime = mkdtempSync(join(sandbox, 'api-'));
const publicDir = join(runtime, 'public');
mkdirSync(join(publicDir, 'api'), { recursive: true });
copyFileSync('public/api/index.php', join(publicDir, 'api/index.php'));
const database = join(runtime, 'test.sqlite').replaceAll('\\', '/');
writeFileSync(join(runtime, 'kiwi-config.php'), `<?php return ['dsn'=>'sqlite:${database}','user'=>null,'password'=>null,'setup_token'=>'test-secret-012345678901234567890123456789','storage'=>__DIR__.'/covers'];`);
writeFileSync(join(runtime, 'init.php'), `<?php $db = new PDO('sqlite:${database}'); $db->exec(file_get_contents($argv[1]));`);
const init = spawnSync('php', [join(runtime, 'init.php'), resolve('server/schema.sql')], { encoding: 'utf8' });
assert.equal(init.status, 0, init.stderr);
const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
const port = socket.address().port; await new Promise(r => socket.close(r));
const php = spawn('php', ['-d', `session.save_path=${runtime}`, '-S', `127.0.0.1:${port}`, '-t', publicDir], { stdio: ['ignore', 'ignore', 'pipe'] });
let serverLog = ''; php.stderr.on('data', data => serverLog += data);
const base = `http://127.0.0.1:${port}/api/index.php?action=`;
let cookie = '', csrf = '';
const data = values => { const form = new FormData(); for (const [key, value] of Object.entries(values)) form.set(key, value); return form; };
async function call(action, body, authenticated = true, token = csrf) {
  const response = await fetch(base + action, { method: body ? 'POST' : 'GET', body,
    headers: { ...(authenticated && cookie ? { Cookie: cookie } : {}), ...(body ? { 'X-CSRF-Token': token } : {}) }, redirect: 'manual' });
  if (authenticated && response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  const type = response.headers.get('content-type');
  const result = type?.startsWith('application/json') ? await response.json() : new Uint8Array(await response.arrayBuffer());
  return { status: response.status, result };
}
try {
  for (let attempt = 0; ; attempt++) {
    try { await fetch(base + 'books'); break; } catch (e) { if (attempt > 50) throw e; await new Promise(r => setTimeout(r, 100)); }
  }
  assert.deepEqual((await call('books', undefined, false)).result.books, []);
  assert.equal((await call('admin-books', undefined, false)).status, 401);
  const session = (await call('session')).result; csrf = session.csrf;
  assert.equal(session.setupRequired, true);
  assert.equal((await call('setup', data({}), true, 'wrong')).status, 403);
  const credentials = { email: 'owner@example.test', password: 'a-long-test-password' };
  assert.equal((await call('setup', data({ ...credentials, setup_token: 'wrong' }))).status, 403);
  const setup = await call('setup', data({ ...credentials, setup_token: 'test-secret-012345678901234567890123456789' }));
  assert.equal(setup.status, 200); csrf = setup.result.csrf;
  assert.equal((await call('setup', data({ ...credentials, setup_token: 'test-secret-012345678901234567890123456789' }))).status, 409);
  assert.equal((await call('save-book', data({}), false)).status, 403);
  const book = { title: '<script>alert(1)</script> El libro', author: 'Autora de prueba', description: 'Una descripción\ncon dos líneas.', category: 'Novela', format: 'Físico', price: '12.50', currency: 'USD', available: '1', published: '0', featured: '1' };
  const draft = await call('save-book', data(book)); assert.equal(draft.status, 200);
  const id = draft.result.id;
  assert.equal((await call('books', undefined, false)).result.books.length, 0);
  assert.equal((await call('admin-books')).result.books.length, 1);
  assert.equal((await call('save-book', data({ ...book, id, price: '-1' }))).status, 400);
  const badFile = data({ ...book, id }); badFile.set('cover', new Blob(['<?php echo "bad";'], { type: 'image/png' }), 'cover.png');
  assert.equal((await call('save-book', badFile)).status, 400);
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1kAAAAASUVORK5CYII=', 'base64');
  const upload = data({ ...book, id }); upload.set('cover', new Blob([image], { type: 'image/png' }), 'cover.png');
  assert.equal((await call('save-book', upload)).status, 200);
  const draftCover = (await call('admin-books')).result.books[0].cover.split('file=')[1];
  assert.equal((await call(`cover&file=${draftCover}`, undefined, false)).status, 401);
  assert.equal((await call(`cover&file=${draftCover}`)).status, 200);
  assert.equal((await call('settings', data({ whatsapp: '+123' }))).status, 400);
  assert.equal((await call('settings', data({ whatsapp: '18095551234' }))).status, 200);
  assert.equal((await call('save-book', data({ ...book, id, published: '1' }))).status, 200);
  let catalog = (await call('books', undefined, false)).result;
  assert.equal(catalog.books[0].title, book.title); assert.equal(catalog.whatsapp, '18095551234');
  assert.equal(catalog.books[0].published, true); assert.equal(catalog.books[0].price, '12.50');
  assert.equal((await call(`cover&file=${draftCover}`, undefined, false)).status, 200);
  assert.equal((await call('save-book', data({ ...book, id, published: '0' }))).status, 200);
  assert.equal((await call('books', undefined, false)).result.books.length, 0);
  assert.equal((await call(`cover&file=${draftCover}`, undefined, false)).status, 401);
  assert.equal((await call('cover&file=../../kiwi-config.php', undefined, false)).status, 404);
  assert.equal((await call('logout', new FormData())).status, 200);
  assert.equal((await call('admin-books')).status, 401);
  csrf = (await call('session')).result.csrf;
  assert.equal((await call('login', data({ ...credentials, password: 'incorrect' }))).status, 401);
  const login = await call('login', data(credentials)); assert.equal(login.status, 200); csrf = login.result.csrf;
  assert.equal((await call('admin-books')).status, 200);
  for (let i = 0; i < 10; i++) assert.equal((await call('login', data({ ...credentials, password: 'incorrect' }))).status, 401);
  assert.equal((await call('login', data(credentials))).status, 429);
  console.log('PASS: setup, login, CSRF, authorization, drafts, publishing, editing, image validation, private covers, contact settings, logout and login rate limit.');
} catch (error) { console.error(serverLog); throw error; }
finally { php.kill(); await once(php, 'exit'); }
