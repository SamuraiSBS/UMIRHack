const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/business — list all businesses (public)
router.get('/business', async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { isBlocked: false },
      select: { id: true, name: true, description: true, deliveryZone: true },
    });
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// POST /api/business — create a business (BUSINESS role only, one per user)
router.post('/business', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  const { name, description, deliveryZone } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const existing = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (existing) return res.status(409).json({ error: 'Business already exists for this account' });

    const business = await prisma.business.create({
      data: { name, description, deliveryZone, ownerId: req.user.id },
    });
    res.status(201).json(business);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// GET /api/business/my — get current user's business
router.get('/business/my', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// PATCH /api/business/my — update business info
router.patch('/business/my', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  const { name, description, deliveryZone } = req.body;
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(deliveryZone !== undefined && { deliveryZone }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// GET /api/business/my/trading-points — list trading points
router.get('/business/my/trading-points', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });

    const points = await prisma.tradingPoint.findMany({ where: { businessId: business.id } });
    res.json(points);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trading points' });
  }
});

// POST /api/business/my/trading-points — add trading point
router.post('/business/my/trading-points', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  const { name, address } = req.body;
  if (!name || !address) return res.status(400).json({ error: 'Name and address are required' });

  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });

    const point = await prisma.tradingPoint.create({
      data: { name, address, businessId: business.id },
    });
    res.status(201).json(point);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create trading point' });
  }
});

// DELETE /api/business/my/trading-points/:id — remove trading point
router.delete('/business/my/trading-points/:id', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });

    const point = await prisma.tradingPoint.findUnique({ where: { id: req.params.id } });
    if (!point || point.businessId !== business.id) return res.status(404).json({ error: 'Trading point not found' });

    await prisma.tradingPoint.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete trading point' });
  }
});

// PATCH /api/business/my/trading-points/:id — update trading point
router.patch('/business/my/trading-points/:id', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  const { name, address } = req.body;
  if (!name || !address) return res.status(400).json({ error: 'Name and address are required' });
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });

    const point = await prisma.tradingPoint.findFirst({
      where: { id: req.params.id, businessId: business.id },
    });
    if (!point) return res.status(404).json({ error: 'Trading point not found' });

    const updated = await prisma.tradingPoint.update({
      where: { id: req.params.id },
      data: { name, address },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update trading point' });
  }
});

// GET /api/business/my/products — all products for owner (including unavailable)
router.get('/business/my/products', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });
    const products = await prisma.product.findMany({ where: { businessId: business.id } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/business/:id/products — list products for a business (public, available only)
router.get('/business/:id/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { businessId: req.params.id, isAvailable: true },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products — create a product (must own a business)
router.post('/products', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  const { name, description, price, imageUrl, category } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Name and price are required' });

  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Create a business first' });

    const product = await prisma.product.create({
      data: { name, description, price: Number(price), imageUrl: imageUrl || null, category: category || null, businessId: business.id },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PATCH /api/products/:id — update a product
router.patch('/products/:id', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  const { name, description, price, imageUrl, isAvailable, category } = req.body;
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.businessId !== business.id) return res.status(404).json({ error: 'Product not found' });

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price != null && { price: Number(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(category !== undefined && { category }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id — delete a product
router.delete('/products/:id', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.businessId !== business.id) return res.status(404).json({ error: 'Product not found' });

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET /api/business/my/orders — orders for the business owner
router.get('/business/my/orders', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });

    const orders = await prisma.order.findMany({
      where: { businessId: business.id },
      include: {
        items: { include: { product: true } },
        customer: { select: { name: true, email: true } },
        courier: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/business/my/orders/:id/reject — reject order (BUSINESS only, only CREATED orders)
router.post('/business/my/orders/:id/reject', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });

    const updated = await prisma.order.updateMany({
      where: { id: req.params.id, businessId: business.id, status: 'CREATED' },
      data: { status: 'REJECTED' },
    });
    if (updated.count === 0) return res.status(400).json({ error: 'Cannot reject this order' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

// GET /api/business/my/stats — analytics for business owner
router.get('/business/my/stats', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'No business found' });

    const [totalOrders, doneOrders, revenueAgg, byStatus, topItems] = await Promise.all([
      prisma.order.count({ where: { businessId: business.id } }),
      prisma.order.count({ where: { businessId: business.id, status: 'DONE' } }),
      prisma.order.aggregate({
        where: { businessId: business.id, status: 'DONE' },
        _sum: { totalPrice: true },
        _avg: { totalPrice: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { businessId: business.id },
        _count: { _all: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { businessId: business.id } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const productIds = topItems.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

    res.json({
      totalOrders,
      doneOrders,
      revenue: revenueAgg._sum.totalPrice || 0,
      avgCheck: revenueAgg._avg.totalPrice || 0,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count._all])),
      topProducts: topItems.map(i => ({
        name: productMap[i.productId] || i.productId,
        quantity: i._sum.quantity,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
