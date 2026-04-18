import express from 'express';
import Voucher from '../models/Voucher.js';

const router = express.Router();

// GET /api/vouchers
router.get('/', async (req, res) => {
  try {
    const vouchers = await Voucher.find();
    res.json(vouchers);
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