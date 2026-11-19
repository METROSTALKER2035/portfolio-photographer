import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const SALT_ROUNDS = 10;
const TOKEN_TTL_SECONDS = 15 * 60; // Варіант 2: 15 хвилин (900 с)

const DUMMY_HASH = await bcrypt.hash('dummy-password', SALT_ROUNDS);

function signToken(user) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

// POST /api/auth/register — реєстрація нового користувача
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Пароль має бути рядком не коротше 8 символів' });
  }
  if (Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Пароль занадто довгий: не більше 72 байтів' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  // Роль не береться з тіла запиту: нові користувачі завжди отримують роль user
  const user = await User.create({ name, email, passwordHash });
  res.status(201).json(user);
});

// POST /api/auth/login — вхід, повертає підписаний JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Передайте email і password у вигляді рядків' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    return res.status(401).json({ error: 'Невірний email або пароль' });
  }

  res.json({
    token: signToken(user),
    tokenType: 'Bearer',
    expiresIn: TOKEN_TTL_SECONDS,
    user,
  });
});

// GET /api/auth/me — приватний маршрут: профіль поточного користувача
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// GET /api/auth/users — список користувачів, доступний лише адміністратору
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }));
});

export default router;