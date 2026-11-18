import mongoose from 'mongoose';
import Photoshoot from './models/Photoshoot.js';

if (!process.env.MONGODB_URI) {
  console.error('Не задано MONGODB_URI. Запускайте скрипт через: npm run seed');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Підключено до бази: ${mongoose.connection.name}`);

  await Photoshoot.deleteMany({});

  const created = await Photoshoot.insertMany([
    { title: 'Індивідуальний портрет у студії', category: 'studio', price: 2500 },
    { title: 'Весільна прогулянка в центрі міста', category: 'wedding', price: 6500 },
    { title: 'Love Story на заході сонця', category: 'portrait', price: 3200 },
    { title: 'Архітектурний urban-проєкт', category: 'reportage', price: 4200 },
    { title: 'Репортаж із музичного фестивалю', category: 'reportage', price: 4800 },
  ]);

  console.log(`Додано початкових записів: ${created.length}`);
} catch (err) {
  console.error('Помилка під час наповнення бази даних:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}