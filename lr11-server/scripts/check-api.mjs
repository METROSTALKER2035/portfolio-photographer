// Автоматична перевірка АРІ. Запуск: npm run check
import assert from 'node:assert/strict';

const PORT = process.env.PORT ?? 3002;
const BASE = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const URL_PATH = '/api/photoshoots';

const api = (path, options = {}) =>
  fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...options });

const send = (method, path, body) =>
  api(path, { method, body: JSON.stringify(body) });

let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`OK   ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}\n     ${err.message.split('\n')[0]}`);
  }
}

const title = `Тестова зйомка ${Date.now()}`;
let id;

await check('POST: створення -> 201, Location, id', async () => {
  const res = await send('POST', URL_PATH, { title, category: 'portrait', price: 2500 });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id, 'у відповіді немає id');
  assert.equal(res.headers.get('location'), `${URL_PATH}/${body.id}`);
  id = body.id;
});

await check('POST: дублікат унікального поля -> 409', async () => {
  const res = await send('POST', URL_PATH, { title, category: 'portrait', price: 2500 });
  assert.equal(res.status, 409);
});

await check('POST: порожні поля -> 400 і details', async () => {
  const res = await send('POST', URL_PATH, { title: '', category: '' });
  assert.equal(res.status, 400);
  assert.ok(Array.isArray((await res.json()).details));
});

await check('GET: один запис -> 200', async () => {
  const res = await api(`${URL_PATH}/${id}`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).title, title);
});

await check('GET: список -> 200, масив, X-Total-Count', async () => {
  const res = await api(`${URL_PATH}?limit=5`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(await res.json()));
  assert.ok(Number(res.headers.get('x-total-count')) >= 1);
});

await check('GET: sort за недозволеним полем -> 400', async () => {
  assert.equal((await api(`${URL_PATH}?sort=password`)).status, 400);
});

await check('GET: некоректний id -> 400', async () => {
  assert.equal((await api(`${URL_PATH}/abc`)).status, 400);
});

await check('GET: неіснуючий id -> 404', async () => {
  assert.equal((await api(`${URL_PATH}/000000000000000000000000`)).status, 404);
});

await check('PUT: повна заміна -> 200', async () => {
  const res = await send('PUT', `${URL_PATH}/${id}`, {
    title,
    category: 'wedding',
    price: 7500,
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).category, 'wedding');
});

await check("PUT: без обов'язкового поля -> 400", async () => {
  assert.equal((await send('PUT', `${URL_PATH}/${id}`, { title })).status, 400);
});

await check('PATCH: часткове оновлення -> 200', async () => {
  const res = await send('PATCH', `${URL_PATH}/${id}`, { price: 8200 });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.price, 8200);
  assert.equal(body.category, 'wedding', 'інші поля не повинні змінитися');
});

await check('PATCH: порожнє тіло -> 400', async () => {
  assert.equal((await send('PATCH', `${URL_PATH}/${id}`, {})).status, 400);
});

await check('DELETE: видалення -> 204 без тіла', async () => {
  const res = await api(`${URL_PATH}/${id}`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  assert.equal(await res.text(), '');
});

await check('DELETE: повторне видалення -> 404', async () => {
  assert.equal((await api(`${URL_PATH}/${id}`, { method: 'DELETE' })).status, 404);
});

await check('GET: після видалення -> 404', async () => {
  assert.equal((await api(`${URL_PATH}/${id}`)).status, 404);
});

console.log(failed === 0 ? '\nУсі перевірки пройдено.' : `\nНевдалих перевірок: ${failed}.`);
process.exitCode = failed === 0 ? 0 : 1;