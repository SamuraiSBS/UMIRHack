const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/courier/shift — get current shift status
router.get('/shift', verifyToken, requireRole('COURIER'), async (req, res) => {
  try {
    const [shift, courier] = await Promise.all([
      prisma.courierShift.findUnique({ where: { courierId: req.user.id } }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { deliveryZone: true },
      }),
    ]);
    res.json({
      isActive: shift?.isActive ?? false,
      city: courier?.deliveryZone ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

// POST /api/courier/shift/start — start shift
router.post('/shift/start', verifyToken, requireRole('COURIER'), async (req, res) => {
  const nextCity = req.body?.city?.trim();

  try {
    const courier = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { deliveryZone: true },
    });
    const city = nextCity || courier?.deliveryZone;

    if (!city) {
      return res.status(400).json({ error: 'Choose a city before starting your shift' });
    }

    const shift = await prisma.courierShift.upsert({
      where: { courierId: req.user.id },
      update: { isActive: true, startedAt: new Date() },
      create: { courierId: req.user.id, isActive: true },
    });
    await prisma.user.update({
      where: { id: req.user.id },
      data: { deliveryZone: city },
    });
    res.json({ ...shift, city });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start shift' });
  }
});

// POST /api/courier/shift/stop — stop shift
router.post('/shift/stop', verifyToken, requireRole('COURIER'), async (req, res) => {
  try {
    const shift = await prisma.courierShift.upsert({
      where: { courierId: req.user.id },
      update: { isActive: false },
      create: { courierId: req.user.id, isActive: false },
    });
    res.json(shift);
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop shift' });
  }
});

// PATCH /api/courier/city — update courier's working city without resetting shift history
router.patch('/city', verifyToken, requireRole('COURIER'), async (req, res) => {
  const city = req.body?.city?.trim();
  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  try {
    const [courier, shift] = await Promise.all([
      prisma.user.update({
        where: { id: req.user.id },
        data: { deliveryZone: city },
        select: { deliveryZone: true },
      }),
      prisma.courierShift.findUnique({ where: { courierId: req.user.id } }),
    ]);
    res.json({
      isActive: shift?.isActive ?? false,
      city: courier.deliveryZone,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update city' });
  }
});

// GET /api/courier/orders — courier's accepted/active/done orders
router.get('/orders', verifyToken, requireRole('COURIER'), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { courierId: req.user.id },
      include: {
        items: { include: { product: { select: { name: true, price: true } } } },
        customer: { select: { name: true, email: true } },
        business: { select: { name: true } },
        tradingPoint: { select: { name: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courier orders' });
  }
});

module.exports = router;
