const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/courier/shift — get current shift status
router.get('/shift', verifyToken, requireRole('COURIER'), async (req, res) => {
  try {
    const shift = await prisma.courierShift.findUnique({ where: { courierId: req.user.id } });
    res.json({ isActive: shift?.isActive ?? false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

// POST /api/courier/shift/start — start shift
router.post('/shift/start', verifyToken, requireRole('COURIER'), async (req, res) => {
  try {
    const shift = await prisma.courierShift.upsert({
      where: { courierId: req.user.id },
      update: { isActive: true, startedAt: new Date() },
      create: { courierId: req.user.id, isActive: true },
    });
    res.json(shift);
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

// GET /api/courier/orders — courier's accepted/active/done orders
router.get('/orders', verifyToken, requireRole('COURIER'), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { courierId: req.user.id },
      include: {
        items: { include: { product: { select: { name: true, price: true } } } },
        customer: { select: { name: true, email: true } },
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courier orders' });
  }
});

module.exports = router;
