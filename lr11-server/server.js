import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import Photoshoot from './models/Photoshoot.js';

const PORT = Number(process.env.PORT) || 3002;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Не задано MONGODB_URI. Створіть файл .env за зразком .env.example');
  process.exit(1);
}

const app = express();

// Middleware логування
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
app.use(express.static(path.join(import.meta.dirname, 'public')));

// Екранує спеціальні символи регулярних виразів у пошуковому запиті
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Список фотосесій із пошуком (?q=) та обмеженням кількості (?limit=)
app.get('/api/photoshoots', async (req, res) => {
  const { q, limit } = req.query;
  const filter = q ? { title: { $regex: escapeRegex(String(q)), $options: 'i' } } : {};
  const max = Math.min(Number(limit) || 50, 100);

  const photoshoots = await Photoshoot.find(filter).sort({ createdAt: -1 }).limit(max);
  res.json(photoshoots);
});

// Отримання однієї фотосесії за ідентифікатором ObjectId
app.get('/api/photoshoots/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Некоректний формат id' });
  }

  const photoshoot = await Photoshoot.findById(id);
  if (!photoshoot) {
    return res.status(404).json({ error: `Фотосесію з id=${id} не знайдено` });
  }

  res.json(photoshoot);
});

// Створення нового запису
app.post('/api/photoshoots', async (req, res) => {
  const { title, category, price } = req.body ?? {};
  const photoshoot = await Photoshoot.create({ title, category, price });
  res.status(201).json(photoshoot);
});

// Навмисна помилка для перевірки централізованого обробника помилок 500
app.get('/api/error', () => {
  throw new Error('Тестова помилка сервера');
});

// Обробник 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено', path: req.originalUrl });
});

// Централізований обробник помилок
app.use((err, req, res, next) => {
  console.error(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некоректний JSON у тілі запиту' });
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Дані не пройшли перевірку', details });
  }

  const status = err.status ?? 500;
  res.status(status).json({
    error: status === 500 ? 'Внутрішня помилка сервера' : err.message,
  });
});

// з'єднання з базою даних і запускаємо сервер
try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`Підключено до MongoDB, база даних: ${mongoose.connection.name}`);
} catch (err) {
  console.error('Не вдалося підключитися до MongoDB:', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});