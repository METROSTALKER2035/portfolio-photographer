import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import authRouter from './routes/auth.js';
import photoshootsRouter from './routes/photoshoots.js';
import { logger } from './middleware/logger.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const PORT = process.env.PORT ?? 3002;
const { MONGODB_URI, JWT_SECRET, NODE_ENV } = process.env;

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!MONGODB_URI) {
  console.error('Не задано MONGODB_URI. Створіть файл .env за зразком .env.example');
  process.exit(1);
}

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET не задано або він коротший за 32 символи. Див. .env.example');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);

app.use(logger);
app.use(
  cors({
    origin: allowedOrigins,
    exposedHeaders: ['X-Total-Count', 'Location'],
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(import.meta.dirname, 'public')));

app.get('/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    db: dbReady,
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/photoshoots', photoshootsRouter);

if (NODE_ENV !== 'production') {
  app.get('/api/error', () => {
    throw new Error('Тестова помилка сервера');
  });
}

app.use(notFound);
app.use(errorHandler);

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