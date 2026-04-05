const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Create business owner
  const owner1 = await prisma.user.upsert({
    where: { email: 'pizza@demo.com' },
    update: {},
    create: { email: 'pizza@demo.com', password: hash('demo123'), name: 'Иван Петров', role: 'BUSINESS' },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'sushi@demo.com' },
    update: {},
    create: { email: 'sushi@demo.com', password: hash('demo123'), name: 'Ольга Сидорова', role: 'BUSINESS' },
  });

  // Create courier
  await prisma.user.upsert({
    where: { email: 'courier@demo.com' },
    update: {},
    create: { email: 'courier@demo.com', password: hash('demo123'), name: 'Алексей Курьеров', role: 'COURIER' },
  });

  // Create customer
  await prisma.user.upsert({
    where: { email: 'customer@demo.com' },
    update: {},
    create: { email: 'customer@demo.com', password: hash('demo123'), name: 'Мария Заказова', role: 'CUSTOMER' },
  });

  // Create businesses
  const biz1 = await prisma.business.upsert({
    where: { ownerId: owner1.id },
    update: {},
    create: { name: 'Пицца Экспресс', description: 'Лучшая пицца в городе', ownerId: owner1.id },
  });

  const biz2 = await prisma.business.upsert({
    where: { ownerId: owner2.id },
    update: {},
    create: { name: 'Суши Мастер', description: 'Японская кухня с доставкой', ownerId: owner2.id },
  });

  await prisma.tradingPoint.upsert({
    where: { id: `${biz1.id}-main-point` },
    update: {
      name: 'Пицца Экспресс на Буденновском',
      address: 'Ростов-на-Дону, Буденновский проспект, 42',
      lat: 47.2267,
      lng: 39.7096,
      businessId: biz1.id,
    },
    create: {
      id: `${biz1.id}-main-point`,
      name: 'Пицца Экспресс на Буденновском',
      address: 'Ростов-на-Дону, Буденновский проспект, 42',
      lat: 47.2267,
      lng: 39.7096,
      businessId: biz1.id,
    },
  });

  await prisma.tradingPoint.upsert({
    where: { id: `${biz2.id}-main-point` },
    update: {
      name: 'Суши Мастер в центре',
      address: 'Ростов-на-Дону, улица Пушкинская, 154',
      lat: 47.2298,
      lng: 39.7284,
      businessId: biz2.id,
    },
    create: {
      id: `${biz2.id}-main-point`,
      name: 'Суши Мастер в центре',
      address: 'Ростов-на-Дону, улица Пушкинская, 154',
      lat: 47.2298,
      lng: 39.7284,
      businessId: biz2.id,
    },
  });

  // Create products for Pizza
  const pizzaProducts = [
    { name: 'Маргарита', description: 'Томат, моцарелла, базилик', price: 450 },
    { name: 'Пепперони', description: 'Томат, моцарелла, пепперони', price: 550 },
    { name: 'Четыре сыра', description: 'Моцарелла, горгонзола, пармезан, чеддер', price: 620 },
    { name: 'Кола 0.5л', description: 'Газированный напиток', price: 80 },
  ];

  for (const p of pizzaProducts) {
    await prisma.product.upsert({
      where: { id: `${biz1.id}-${p.name}` },
      update: {},
      create: { id: `${biz1.id}-${p.name}`, ...p, businessId: biz1.id },
    });
  }

  // Create products for Sushi
  const sushiProducts = [
    { name: 'Ролл Филадельфия', description: 'Лосось, сливочный сыр, огурец', price: 380 },
    { name: 'Ролл Калифорния', description: 'Краб, авокадо, огурец', price: 320 },
    { name: 'Мисо суп', description: 'Традиционный японский суп', price: 150 },
    { name: 'Гункан с лососем', description: '6 штук', price: 280 },
  ];

  for (const p of sushiProducts) {
    await prisma.product.upsert({
      where: { id: `${biz2.id}-${p.name}` },
      update: {},
      create: { id: `${biz2.id}-${p.name}`, ...p, businessId: biz2.id },
    });
  }

  console.log('Seed complete!');
  console.log('Demo accounts:');
  console.log('  Business 1: pizza@demo.com / demo123');
  console.log('  Business 2: sushi@demo.com / demo123');
  console.log('  Courier:    courier@demo.com / demo123');
  console.log('  Customer:   customer@demo.com / demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
