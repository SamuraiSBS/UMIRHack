const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/orders — customer creates an order
// Body: { businessId, city, address, deliveryLat, deliveryLng, items: [{ productId, quantity }], tradingPointId?, distanceKm? }
router.post('/', verifyToken, requireRole('CUSTOMER'), async (req, res) => {
  const { businessId, city, address, deliveryLat, deliveryLng, items, tradingPointId, distanceKm } = req.body;

  if (!businessId || !city || !address || !items?.length || deliveryLat == null || deliveryLng == null) {
    return res.status(400).json({ error: 'businessId, city, address, deliveryLat, deliveryLng, and items are required' });
  }

  try {
    // Fetch all products to calculate total price
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Some products not found in this business' });
    }

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
    const totalPrice = items.reduce((sum, item) => sum + productMap[item.productId].price * item.quantity, 0);

    // Auto-calculate delivery fee: base 50 ₽ + 15 ₽/km (minimum 50)
    const km = distanceKm ? Number(distanceKm) : null;
    const deliveryFee = km != null ? Math.max(50, Math.round(50 + km * 15)) : 150;

    const order = await prisma.order.create({
      data: {
        businessId,
        city,
        address,
        deliveryLat: Number(deliveryLat),
        deliveryLng: Number(deliveryLng),
        totalPrice,
        distanceKm: km,
        deliveryFee,
        customerId: req.user.id,
        ...(tradingPointId && { tradingPointId }),
        items: {
          create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      },
      include: { items: { include: { product: true } }, tradingPoint: { select: { name: true, address: true } } },
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders/my — customer sees their own orders
router.get('/my', verifyToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      include: {
        items: { include: { product: true } },
        business: { select: { name: true } },
        courier: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/available — courier sees unaccepted orders (must have active shift)
router.get('/available', verifyToken, requireRole('COURIER'), async (req, res) => {
  try {
    const shift = await prisma.courierShift.findUnique({ where: { courierId: req.user.id } });
    if (!shift?.isActive) {
      return res.status(403).json({ error: 'Start your shift first' });
    }

    const courier = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { deliveryZone: true },
    });

    const orders = await prisma.order.findMany({
      where: {
        status: 'CREATED',
        ...(courier?.deliveryZone
          ? {
              OR: [
                { city: courier.deliveryZone },
                { city: null },
              ],
            }
          : {}),
      },
      include: {
        business: { select: { id: true, name: true } },
        // Only show item count and total — not full address until accepted
        items: { select: { quantity: true, product: { select: { name: true } } } },
        // Pickup point address is shown before accepting
        tradingPoint: { select: { name: true, address: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch available orders' });
  }
});

// POST /api/orders/:id/accept — courier accepts an order (atomic to prevent race)
router.post('/:id/accept', verifyToken, requireRole('COURIER'), async (req, res) => {
  try {
    const shift = await prisma.courierShift.findUnique({ where: { courierId: req.user.id } });
    if (!shift?.isActive) {
      return res.status(403).json({ error: 'Start your shift first' });
    }

    // Check courier doesn't already have an active order
    const activeOrder = await prisma.order.findFirst({
      where: { courierId: req.user.id, status: { in: ['ACCEPTED', 'DELIVERING'] } },
    });
    if (activeOrder) {
      return res.status(409).json({ error: 'You already have an active order' });
    }

    // Atomic: only update if still CREATED
    const updated = await prisma.order.updateMany({
      where: { id: req.params.id, status: 'CREATED' },
      data: { status: 'ACCEPTED', courierId: req.user.id },
    });

    if (updated.count === 0) {
      return res.status(409).json({ error: 'Order no longer available' });
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        customer: { select: { name: true, email: true } },
        business: { select: { name: true } },
        tradingPoint: { select: { name: true, address: true } },
      },
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

// POST /api/orders/:id/cancel — customer cancels a CREATED order
router.post('/:id/cancel', verifyToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const updated = await prisma.order.updateMany({
      where: { id: req.params.id, customerId: req.user.id, status: 'CREATED' },
      data: { status: 'CANCELLED' },
    });

    if (updated.count === 0) {
      return res.status(409).json({ error: 'Order cannot be cancelled (not found or already in progress)' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// PATCH /api/orders/:id/status — courier updates order status
// Body: { status: 'DELIVERING' | 'DONE' }
router.patch('/:id/status', verifyToken, requireRole('COURIER'), async (req, res) => {
  const { status } = req.body;
  const allowed = ['DELIVERING', 'DONE'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use DELIVERING or DONE' });
  }

  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.courierId !== req.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// PATCH /api/orders/:id/location — courier updates current location for customer's live tracking
router.patch('/:id/location', verifyToken, requireRole('COURIER'), async (req, res) => {
  const { lat, lng } = req.body;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.courierId !== req.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['ACCEPTED', 'DELIVERING'].includes(order.status)) {
      return res.status(409).json({ error: 'Location can only be updated for active orders' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        courierLat: Number(lat),
        courierLng: Number(lng),
      },
      select: {
        id: true,
        courierLat: true,
        courierLng: true,
        status: true,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update courier location' });
  }
});

module.exports = router;
