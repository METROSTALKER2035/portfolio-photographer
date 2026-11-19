// Автоматична перевірка автентифікації й авторизації (Варіант 2: /api/photoshoots, Тип 2).
// Запуск: npm run check
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const BASE = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3002}`;
const URL_PATH = '/api/photoshoots';
const PASSWORD = 'Password!';

const call = (method, path, { body, token } = {}) =>
  fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

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

const stamp = Date.now();
const emailA = `a${stamp}@example.com`;
const emailB = `b${stamp}@example.com`;
let tokenA, tokenB, photoshootId, userA;

async function register(email, name) {
  return call('POST', '/api/auth/register', { body: { name, email, password: PASSWORD } });
}

async function login(email, password = PASSWORD) {
  return call('POST', '/api/auth/login', { body: { email, password } });
}

await check('register: нова адреса -> 201, без passwordHash', async () => {
  const res = await register(emailA, 'Користувач А');
  assert.equal(res.status, 201);
  userA = await res.json();
  assert.equal(userA.email, emailA);
  assert.equal(userA.role, 'user');
  assert.equal(userA.passwordHash, undefined, 'хеш пароля не повинен потрапляти у відповідь');
});

await check('register: повторний email -> 409', async () => {
  assert.equal((await register(emailA, 'Дубль')).status, 409);
});

await check('register: короткий пароль -> 400', async () => {
  const res = await call('POST', '/api/auth/register', {
    body: { name: 'Хтось', email: `x${stamp}@example.com`, password: '123' },
  });
  assert.equal(res.status, 400);
});

await check('register: поле role у тілі ігнорується', async () => {
  const res = await call('POST', '/api/auth/register', {
    body: { name: 'Хакер', email: `h${stamp}@example.com`, password: PASSWORD, role: 'admin' },
  });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).role, 'user');
});

await check('login: хибний пароль -> 401', async () => {
  assert.equal((await login(emailA, 'Wrong-password1')).status, 401);
});

await check('login: невідомий email -> 401 з таким самим повідомленням', async () => {
  const unknown = await login(`nobody${stamp}@example.com`);
  const wrong = await login(emailA, 'Wrong-password1');
  assert.equal(unknown.status, 401);
  assert.equal((await unknown.json()).error, (await wrong.json()).error);
});

await check("login: email як об'єкт (NoSQL-ін'єкція) -> 400", async () => {
  const res = await call('POST', '/api/auth/login', {
    body: { email: { $ne: null }, password: PASSWORD },
  });
  assert.equal(res.status, 400);
});

await check('login: правильні дані -> 200 і токен', async () => {
  const res = await login(emailA);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token.split('.').length === 3, 'очікується JWT із трьох частин');
  assert.equal(body.passwordHash, undefined);
  tokenA = body.token;
});

await check('GET /me без токена -> 401', async () => {
  const res = await call('GET', '/api/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('www-authenticate'), 'Bearer');
});

await check('GET /me з токеном -> 200', async () => {
  const res = await call('GET', '/api/auth/me', { token: tokenA });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, emailA);
});

await check('токен із чужим підписом -> 401', async () => {
  const forged = jwt.sign({}, 'зовсім інший секрет-який-не-знає-сервер-12345', {
    subject: userA.id,
    expiresIn: 60,
  });
  assert.equal((await call('GET', '/api/auth/me', { token: forged })).status, 401);
});

await check('прострочений токен -> 401', async () => {
  const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: userA.id, expiresIn: -10 });
  const res = await call('GET', '/api/auth/me', { token: expired });
  assert.equal(res.status, 401);
  assert.match((await res.json()).error, /Термін дії/);
});

await check('токен із alg=none -> 401', async () => {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: userA.id })}.`;
  assert.equal((await call('GET', '/api/auth/me', { token: none })).status, 401);
});

await check(`POST ${URL_PATH} без токена -> 401`, async () => {
  const res = await call('POST', URL_PATH, {
    body: { title: `Без токена ${stamp}`, category: 'portrait', price: 2000 },
  });
  assert.equal(res.status, 401);
});

await check(`POST ${URL_PATH} з токеном -> 201, власник із токена`, async () => {
  const res = await call('POST', URL_PATH, {
    token: tokenA,
    body: {
      title: `Фотосесія ${stamp}`,
      category: 'portrait',
      price: 3000,
      owner: '000000000000000000000000',
    },
  });
  assert.equal(res.status, 201);
  const photoshoot = await res.json();
  assert.equal(photoshoot.owner, userA.id, 'owner має збігатися з id користувача з токена');
  photoshootId = photoshoot.id;
});

await check(`GET ${URL_PATH} без токена (публічний) -> 200`, async () => {
  assert.equal((await call('GET', URL_PATH)).status, 200);
});

await check(`GET ${URL_PATH}/mine -> 200, лише власні записи`, async () => {
  const res = await call('GET', `${URL_PATH}/mine`, { token: tokenA });
  assert.equal(res.status, 200);
  const items = await res.json();
  assert.ok(items.length >= 1 && items.every((p) => p.owner === userA.id));
});

await check(`GET ${URL_PATH}/mine без токена -> 401`, async () => {
  assert.equal((await call('GET', `${URL_PATH}/mine`)).status, 401);
});

await check('чужий запис: PATCH і DELETE -> 403', async () => {
  await register(emailB, 'Користувач Б');
  tokenB = (await (await login(emailB)).json()).token;
  const patch = await call('PATCH', `${URL_PATH}/${photoshootId}`, {
    token: tokenB,
    body: { price: 9999 },
  });
  const del = await call('DELETE', `${URL_PATH}/${photoshootId}`, { token: tokenB });
  assert.equal(patch.status, 403);
  assert.equal(del.status, 403);
});

await check('PATCH без токена -> 401 (раніше за перевірку id)', async () => {
  assert.equal(
    (await call('PATCH', `${URL_PATH}/${photoshootId}`, { body: { price: 9999 } })).status,
    401
  );
});

await check('власник: PATCH -> 200', async () => {
  const res = await call('PATCH', `${URL_PATH}/${photoshootId}`, {
    token: tokenA,
    body: { price: 3900 },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.price, 3900);
  assert.equal(body.category, 'portrait');
});

await check('адміністратор може змінити чужий запис -> 200', async () => {
  const adminToken = (await (await login('admin@example.com')).json()).token;
  assert.ok(adminToken, 'виконайте npm run seed: адміністратора не знайдено');
  const res = await call('PATCH', `${URL_PATH}/${photoshootId}`, {
    token: adminToken,
    body: { category: 'studio' },
  });
  assert.equal(res.status, 200);
});

await check('власник не може видалити запис (Тип 2) -> 403, адмін -> 204', async () => {
  assert.equal((await call('DELETE', `${URL_PATH}/${photoshootId}`, { token: tokenA })).status, 403);
  const adminToken = (await (await login('admin@example.com')).json()).token;
  assert.equal((await call('DELETE', `${URL_PATH}/${photoshootId}`, { token: adminToken })).status, 204);
});

await check('GET /api/auth/users: звичайний користувач -> 403', async () => {
  assert.equal((await call('GET', '/api/auth/users', { token: tokenA })).status, 403);
});

await check('GET /api/auth/users: адміністратор -> 200, без passwordHash', async () => {
  const adminToken = (await (await login('admin@example.com')).json()).token;
  const res = await call('GET', '/api/auth/users', { token: adminToken });
  assert.equal(res.status, 200);
  const users = await res.json();
  assert.ok(Array.isArray(users) && users.length >= 1);
  assert.ok(users.every((u) => u.passwordHash === undefined));
});

console.log(failed === 0 ? '\nУсі перевірки пройдено.' : `\nНевдалих перевірок: ${failed}.`);
process.exitCode = failed === 0 ? 0 : 1;