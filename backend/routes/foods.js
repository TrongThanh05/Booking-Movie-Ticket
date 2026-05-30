import express from 'express';
import Food from '../models/Food.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// GET /api/foods — Danh sách đồ ăn thức uống (PUBLIC)
// Query: ?category=combo|popcorn|drink
// ============================================================
router.get('/', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const foods = await Food.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ data: foods });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// GET /api/foods/:id — Chi tiết một món
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Food not found' });
    res.json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// POST /api/foods — Tạo món mới (ADMIN only)
// ============================================================
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const food = await Food.create(req.body);
    res.status(201).json(food);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ============================================================
// PUT /api/foods/:id — Cập nhật món (ADMIN only)
// ============================================================
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!food) return res.status(404).json({ message: 'Food not found' });
    res.json(food);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ============================================================
// DELETE /api/foods/:id — Xóa món (ADMIN only, soft delete)
// ============================================================
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!food) return res.status(404).json({ message: 'Food not found' });
    res.json({ message: 'Đã ẩn món ăn', food });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// POST /api/foods/seed — Seed dữ liệu mẫu (ADMIN only)
// ============================================================
router.post('/seed', adminMiddleware, async (req, res) => {
  try {
    const count = await Food.countDocuments();
    if (count > 0) {
      return res.json({ message: `Đã có ${count} món, bỏ qua seed.` });
    }

    const sampleFoods = [
      // Combo
      {
        name: 'Combo Đôi Cổ Điển',
        description: '2 bắp rang bơ cỡ vừa + 2 nước ngọt lớn',
        price: 150000,
        imageUrl: 'https://placehold.co/300x200/orange/white?text=Combo+Doi',
        category: 'combo',
        sortOrder: 1,
      },
      {
        name: 'Combo Gia Đình',
        description: '1 bắp rang bơ cỡ lớn + 4 nước ngọt vừa + 1 khoai tây chiên',
        price: 280000,
        imageUrl: 'https://placehold.co/300x200/orange/white?text=Combo+GD',
        category: 'combo',
        sortOrder: 2,
      },
      {
        name: 'Combo Solo',
        description: '1 bắp rang bơ cỡ nhỏ + 1 nước ngọt vừa',
        price: 89000,
        imageUrl: 'https://placehold.co/300x200/orange/white?text=Combo+Solo',
        category: 'combo',
        sortOrder: 3,
      },
      // Bắp
      {
        name: 'Bắp Rang Bơ Nhỏ',
        description: 'Bắp rang bơ thơm ngon, cỡ nhỏ (~150g)',
        price: 45000,
        imageUrl: 'https://placehold.co/300x200/yellow/black?text=Bap+Nho',
        category: 'popcorn',
        sortOrder: 1,
      },
      {
        name: 'Bắp Rang Bơ Vừa',
        description: 'Bắp rang bơ thơm ngon, cỡ vừa (~250g)',
        price: 65000,
        imageUrl: 'https://placehold.co/300x200/yellow/black?text=Bap+Vua',
        category: 'popcorn',
        sortOrder: 2,
      },
      {
        name: 'Bắp Rang Bơ Lớn',
        description: 'Bắp rang bơ thơm ngon, cỡ lớn (~400g)',
        price: 85000,
        imageUrl: 'https://placehold.co/300x200/yellow/black?text=Bap+Lon',
        category: 'popcorn',
        sortOrder: 3,
      },
      {
        name: 'Bắp Rang Caramel',
        description: 'Bắp rang vị caramel ngọt ngào, cỡ vừa',
        price: 70000,
        imageUrl: 'https://placehold.co/300x200/brown/white?text=Bap+Caramel',
        category: 'popcorn',
        sortOrder: 4,
      },
      // Nước
      {
        name: 'Coca-Cola (M)',
        description: 'Nước ngọt Coca-Cola cỡ vừa, có đá',
        price: 35000,
        imageUrl: 'https://placehold.co/300x200/red/white?text=Coca+M',
        category: 'drink',
        sortOrder: 1,
      },
      {
        name: 'Coca-Cola (L)',
        description: 'Nước ngọt Coca-Cola cỡ lớn, có đá',
        price: 45000,
        imageUrl: 'https://placehold.co/300x200/red/white?text=Coca+L',
        category: 'drink',
        sortOrder: 2,
      },
      {
        name: 'Pepsi (M)',
        description: 'Nước ngọt Pepsi cỡ vừa, có đá',
        price: 35000,
        imageUrl: 'https://placehold.co/300x200/blue/white?text=Pepsi+M',
        category: 'drink',
        sortOrder: 3,
      },
      {
        name: 'Nước Suối Aquafina',
        description: 'Nước khoáng tinh khiết 500ml',
        price: 20000,
        imageUrl: 'https://placehold.co/300x200/cyan/white?text=Aquafina',
        category: 'drink',
        sortOrder: 4,
      },
    ];

    await Food.insertMany(sampleFoods);
    res.status(201).json({ message: `Đã seed ${sampleFoods.length} món ăn thành công.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
