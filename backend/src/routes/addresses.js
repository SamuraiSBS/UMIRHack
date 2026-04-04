const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/addresses — list saved delivery addresses for current customer
router.get('/', verifyToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const addresses = await prisma.deliveryAddress.findMany({
      where: { customerId: req.user.id },
      orderBy: { id: 'asc' },
    });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// POST /api/addresses — save a new delivery address
// Body: { label, address }
router.post('/', verifyToken, requireRole('CUSTOMER'), async (req, res) => {
  const { label, address } = req.body;
  if (!label || !address) return res.status(400).json({ error: 'label and address are required' });

  try {
    const saved = await prisma.deliveryAddress.create({
      data: { label, address, customerId: req.user.id },
    });
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save address' });
  }
});

// DELETE /api/addresses/:id — delete a saved address
router.delete('/:id', verifyToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const deleted = await prisma.deliveryAddress.deleteMany({
      where: { id: req.params.id, customerId: req.user.id },
    });
    if (deleted.count === 0) return res.status(404).json({ error: 'Address not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

module.exports = router;
