import express from 'express';
import path from 'node:path';

const app = express();
const PORT = Number(process.env.PORT) || 3002;

const photoshoots = [
  { id: 1, title: 'Індивідуальний портрет у студії', category: 'Портретна', price: 2500 },
  { id: 2, title: 'Весільна прогулянка в центрі міста', category: 'Весільна', price: 6500 },
  { id: 3, title: 'Love Story на заході сонця', category: 'Романтична', price: 3200 },
  { id: 4, title: 'Сімейна фотосесія в парку', category: 'Сімейна', price: 2800 },
  { id: 5, title: 'Предметна зйомка для бренду одягу', category: 'Комерційна', price: 4500 },
];

let nextId = photoshoots.length + 1;

// Middleware логування Тип 2
function logger(req, res, next) {
  res.on('finish', () => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode}`
    );
  });
  next();
}

app.use(logger);
app.use(express.json());
// роздача статичних файлів портфоліо
app.use(express.static(path.join(import.meta.dirname, 'public')));

// Список фотосесій + пошук ?q= за полем title
app.get('/api/photoshoots', (req, res) => {
  const { q } = req.query;
  if (q) {
    const search = String(q).trim().toLowerCase();
    const result = photoshoots.filter((p) =>
      p.title.toLowerCase().includes(search)
    );
    return res.json(result);
  }
  res.json(photoshoots);
});

// Створення нового запису (POST) із валідацією
app.post('/api/photoshoots', (req, res) => {
  const { title, category, price } = req.body ?? {};

  if (
    typeof title !== 'string' || title.trim() === '' ||
    typeof category !== 'string' || category.trim() === ''
  ) {
    return res.status(400).json({
      error: "Поля title і category є обов'язковими і мають бути непорожніми рядками",
    });
  }

  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({
      error: "Поле price є обов'язковим і має бути додатним числом (тип number)",
    });
  }

  const photoshoot = {
    id: nextId++,
    title: title.trim(),
    category: category.trim(),
    price,
  };

  photoshoots.push(photoshoot);
  res.status(201).json(photoshoot);
});

// Один запис за :id
app.get('/api/photoshoots/:id', (req, res) => {
  const id = Number(req.params.id);
  const photoshoot = photoshoots.find((p) => p.id === id);

  if (!photoshoot) {
    return res.status(404).json({
      error: `Фотосесію з id=${req.params.id} не знайдено`,
    });
  }

  res.json(photoshoot);
});

// навмисна помилка для перевірки статусу 500
app.get('/api/error', () => {
  throw new Error('Тестова помилка сервера');
});

// обробка неіснуючих маршрутів (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Маршрут не знайдено',
    path: req.originalUrl,
  });
});

// централізований обробник помилок
app.use((err, req, res, next) => {
  console.error(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Некоректний JSON у тілі запиту',
    });
  }

  const status = err.status ?? 500;
  res.status(status).json({
    error: status === 500 ? 'Внутрішня помилка сервера' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});