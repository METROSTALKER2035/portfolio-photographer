import { Router } from 'express';
import mongoose from 'mongoose';
import Photoshoot from '../models/Photoshoot.js';

const router = Router();

const FIELDS = ['title', 'category', 'price'];
const SORT_FIELDS = ['title', 'price', 'createdAt'];

// Беремо з тіла запиту лише дозволені поля (захист від Mass Assignment)
const pick = (body) =>
  Object.fromEntries(
    FIELDS.filter((f) => body?.[f] !== undefined).map((f) => [f, body[f]])
  );

// Екранує спеціальні символи регулярних виразів у пошуковому запиті ?q=
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Middleware перевіряє формат ObjectId (24 hex-символи) у шляху /:id
function validateId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ error: 'Некоректний формат id' });
  }
  next();
}

// Middleware знаходить документ у базі й зберігає його в req.photoshoot
async function findPhotoshoot(req, res, next) {
  const photoshoot = await Photoshoot.findById(req.params.id);
  if (!photoshoot) {
    return res.status(404).json({ error: `Фотосесію з id=${req.params.id} не знайдено` });
  }
  req.photoshoot = photoshoot;
  next();
}

const withPhotoshoot = [validateId, findPhotoshoot];

// GET /api/photoshoots — список із пошуком ?q=, фільтром ?category=, сортуванням та пагінацією
router.get('/', async (req, res) => {
  const { q, category, sort = '-createdAt' } = req.query;
  const page = Math.max(Number.parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit) || 10, 1), 100);

  const sortName = String(sort);
  const sortField = sortName.replace(/^-/, '');
  if (!SORT_FIELDS.includes(sortField)) {
    return res.status(400).json({ error: `sort: допустимі поля ${SORT_FIELDS.join(', ')}` });
  }

  const filter = {};
  if (q) filter.title = { $regex: escapeRegex(String(q)), $options: 'i' };
  if (category) filter.category = String(category);

  const [items, total] = await Promise.all([
    Photoshoot.find(filter)
      .sort({ [sortField]: sortName.startsWith('-') ? -1 : 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Photoshoot.countDocuments(filter),
  ]);

  res.set('X-Total-Count', String(total));
  res.json(items);
});

// GET /api/photoshoots/:id — отримання одного запису
router.get('/:id', withPhotoshoot, (req, res) => {
  res.json(req.photoshoot);
});

// POST /api/photoshoots — створення нового запису
router.post('/', async (req, res) => {
  const photoshoot = await Photoshoot.create(pick(req.body));
  res.status(201).location(`${req.baseUrl}/${photoshoot.id}`).json(photoshoot);
});

// PUT /api/photoshoots/:id
router.put('/:id', withPhotoshoot, async (req, res) => {
  const data = pick(req.body);
  req.photoshoot.set(Object.fromEntries(FIELDS.map((f) => [f, data[f]])));
  await req.photoshoot.save();
  res.json(req.photoshoot);
});

// PATCH /api/photoshoots/:id
router.patch('/:id', withPhotoshoot, async (req, res) => {
  const data = pick(req.body);
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: `Передайте хоча б одне з полів: ${FIELDS.join(', ')}` });
  }
  req.photoshoot.set(data);
  await req.photoshoot.save();
  res.json(req.photoshoot);
});

// DELETE /api/photoshoots/:id
router.delete('/:id', withPhotoshoot, async (req, res) => {
  await req.photoshoot.deleteOne();
  res.status(204).end();
});

export default router;