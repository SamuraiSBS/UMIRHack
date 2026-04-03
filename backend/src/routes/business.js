const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/business — list all businesses (public)
router.get('/business', async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true, description: true },
    });
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// POST /api/business — create a business (BUSINESS role only, one per user)
router.post('/business', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const existing = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (existing) return res.status(409).json({ error: 'Business already exists for this account' });

    const business = await prisma.business.create({
      data: { name, description, ownerId: req.user.id },
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

// GET /api/business/:id/products — list products for a business (public)
router.get('/business/:id/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { businessId: req.params.id },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products — create a product (must own a business)
router.post('/products', verifyToken, requireRole('BUSINESS'), async (req, res) => {
  const { name, description, price } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Name and price are required' });

  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Create a business first' });

    const product = await prisma.product.create({
      data: { name, description, price: Number(price), businessId: business.id },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
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

module.exports = router;
