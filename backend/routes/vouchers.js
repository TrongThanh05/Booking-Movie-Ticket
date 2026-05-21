import express from 'express';
import Voucher from '../models/Voucher.js';
import { paginate } from '../utils/paginate.js';

const router = express.Router();

// GET /api/vouchers (with pagination)
router.get('/', async (req, res) => {
  try {
    const result = await paginate(Voucher, {}, req.query, {
      defaultSort: { created_at: -1 },
      searchFields: ['code', 'description'],
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/vouchers
router.post('/', async (req, res) => {
    try {
        const voucher = new Voucher(req.body);
        await voucher.save();
        res.status(201).json(voucher);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;