const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const migrations = [
  // Order table — location & pricing columns added after initial deploy
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "city" TEXT`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLat" DOUBLE PRECISION`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLng" DOUBLE PRECISION`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierLat" DOUBLE PRECISION`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierLng" DOUBLE PRECISION`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryFee" DOUBLE PRECISION`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tradingPointId" TEXT`,

  // User table — delivery zone filter for couriers
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deliveryZone" TEXT`,

  // TradingPoint table
  `CREATE TABLE IF NOT EXISTS "TradingPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "businessId" TEXT NOT NULL,
    CONSTRAINT "TradingPoint_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "TradingPoint" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION`,
  `ALTER TABLE "TradingPoint" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION`,
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'TradingPoint_businessId_fkey'
    ) THEN
      ALTER TABLE "TradingPoint" ADD CONSTRAINT "TradingPoint_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,

  // Foreign key from Order to TradingPoint
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'Order_tradingPointId_fkey'
    ) THEN
      ALTER TABLE "Order" ADD CONSTRAINT "Order_tradingPointId_fkey"
        FOREIGN KEY ("tradingPointId") REFERENCES "TradingPoint"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,

  // DeliveryAddress table
  `CREATE TABLE IF NOT EXISTS "DeliveryAddress" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "DeliveryAddress_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'DeliveryAddress_customerId_fkey'
    ) THEN
      ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
];

async function main() {
  console.log('Running migrations...');
  for (const sql of migrations) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('Migrations complete.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
