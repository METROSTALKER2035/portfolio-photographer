import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User.js';
import Photoshoot from './models/Photoshoot.js';

if (!process.env.MONGODB_URI) {
  console.error('Не задано MONGODB_URI. Перевірте файл .env');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

await Photoshoot.deleteMany({});
await User.deleteMany({});
await User.syncIndexes();
await Photoshoot.syncIndexes();

const PASSWORD = 'Password!';
const hashPassword = () => bcrypt.hash(PASSWORD, 10);

const [admin, alice, bob] = await User.insertMany([
  { name: 'Адміністратор', email: 'admin@example.com', passwordHash: await hashPassword(), role: 'admin' },
  { name: 'Аліса', email: 'alice@example.com', passwordHash: await hashPassword() },
  { name: 'Богдан', email: 'bob@example.com', passwordHash: await hashPassword() },
]);

const created = await Photoshoot.insertMany([
  { title: 'Індивідуальний портрет у студії', category: 'studio', price: 2500, owner: alice._id },
  { title: 'Весільна прогулянка в центрі міста', category: 'wedding', price: 6500, owner: alice._id },
  { title: 'Love Story на заході сонця', category: 'portrait', price: 3200, owner: bob._id },
  { title: 'Архітектурний urban-проєкт', category: 'reportage', price: 4200, owner: bob._id },
  { title: 'Репортаж із музичного фестивалю', category: 'reportage', price: 4800, owner: admin._id },
]);

console.log(`Додано користувачів: 3, записів: ${created.length}`);
console.log(`Для входу використовуйте пароль ${PASSWORD} (admin@example.com, alice@example.com, bob@example.com)`);

await mongoose.disconnect();