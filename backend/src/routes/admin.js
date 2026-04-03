const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// All admin routes require ADMIN role
router.use(verifyToken, requireRole('ADMIN'));

// GET /api/admin/stats — overview counts
router.get('/stats', async (req, res) => {
  try {
    const [userCount, businessCount, orderCount, activeShifts] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.order.count(),
      prisma.courierShift.count({ where: { isActive: true } }),
    ]);

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    res.json({
      users: userCount,
      businesses: businessCount,
      orders: orderCount,
      activeShifts,
      ordersByStatus: Object.fromEntries(ordersByStatus.map(o => [o.status, o._count.status])),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users — list all users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isBlocked: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id/block — toggle user block
router.patch('/users/:id/block', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'ADMIN') return res.status(403).json({ error: 'Cannot block admin accounts' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isBlocked: !user.isBlocked },
      select: { id: true, email: true, isBlocked: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/admin/businesses — list all businesses
router.get('/businesses', async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      include: {
        owner: { select: { email: true, name: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { id: 'desc' },
    });
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// PATCH /api/admin/businesses/:id/block — toggle business block
router.patch('/businesses/:id/block', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const updated = await prisma.business.update({
      where: { id: req.params.id },
      data: { isBlocked: !business.isBlocked },
      select: { id: true, name: true, isBlocked: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// GET /api/admin/orders — all orders (latest 50)
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: { select: { name: true, email: true } },
        courier: { select: { name: true, email: true } },
        business: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
