import { useCallback, useEffect, useState } from 'react';
import { request, getToken, setToken, clearToken } from './api.js';

function AuthForm({ onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await request('/api/auth/register', { method: 'POST', body: form });
      }
      const { data } = await request('/api/auth/login', {
        method: 'POST',
        body: { email: form.email, password: form.password },
      });
      setToken(data.token);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>{mode === 'login' ? 'Вхід до системи' : 'Реєстрація'}</h2>
      {mode === 'register' && (
        <label>
          Ім&apos;я <input name="name" value={form.name} onChange={change} required />
        </label>
      )}
      <label>
        Email <input name="email" type="email" value={form.email} onChange={change} required />
      </label>
      <label>
        Пароль{' '}
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={change}
          required
          minLength={8}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button disabled={loading}>
        {loading ? 'Зачекайте...' : mode === 'login' ? 'Увійти' : 'Зареєструватися'}
      </button>
      <button
        type="button"
        className="link"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Немає акаунта? Зареєструватися' : 'Вже є акаунт? Увійти'}
      </button>
    </form>
  );
}

function Photoshoots({ user }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const limit = 5;

  const [form, setForm] = useState({ title: '', category: 'portrait', price: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, total } = await request(
        `/api/photoshoots?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`
      );
      setItems(data);
      setTotal(total);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        title: form.title,
        category: form.category,
        price: Number(form.price),
      };
      await request('/api/photoshoots', { method: 'POST', body: payload });
      setForm({ title: '', category: 'portrait', price: '' });
      setPage(1);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    setError('');
    try {
      await request(`/api/photoshoots/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const canModify = (p) => p.owner === user.id || user.role === 'admin';
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / limit));

  return (
    <section>
      <form onSubmit={create} className="card row">
        <input
          placeholder="Назва фотосесії"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          <option value="portrait">portrait (Портретна)</option>
          <option value="wedding">wedding (Весільна)</option>
          <option value="studio">studio (Студійна)</option>
          <option value="reportage">reportage (Репортажна)</option>
        </select>
        <input
          type="number"
          min="0"
          max="100000"
          placeholder="Ціна (грн)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <button>Додати</button>
      </form>

      <input
        className="search"
        type="search"
        placeholder="Пошук фотосесії за назвою..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
          setLoading(true);
        }}
      />

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {loading ? (
        <p>Завантаження... (перший запит після простою може тривати до хвилини)</p>
      ) : items.length === 0 ? (
        <p>Записів не знайдено.</p>
      ) : (
        <ul className="list">
          {items.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{p.title}</strong> — {p.category} ({p.price} грн)
              </span>
              {canModify(p) && (
                <button className="link" onClick={() => remove(p.id)}>
                  Видалити
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="row">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Попередня
        </button>
        <span>
          Сторінка {page} з {totalPages}
        </span>
        <button
          type="button"
          disabled={page * limit >= (total ?? 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          Наступна
        </button>
      </div>

      {total !== null && <p className="muted">Усього записів: {total}</p>}
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    request('/api/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  function logout() {
    clearToken();
    setUser(null);
  }

  if (checking) return <p>Перевірка сесії...</p>;

  return (
    <main>
      <header className="top">
        <h1>Портфоліо фотографа</h1>
        {user && (
          <span>
            {user.name} ({user.role}){' '}
            <button className="link" onClick={logout}>
              Вийти
            </button>
          </span>
        )}
      </header>
      {user ? <Photoshoots user={user} /> : <AuthForm onLoggedIn={setUser} />}
    </main>
  );
}