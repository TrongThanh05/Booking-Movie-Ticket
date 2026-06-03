# 🎬 Phân Tích Hệ Thống & Thiết Kế Admin Dashboard
### Movie Ticket Booking System — Vai trò: System Architect + Senior Full-stack Dev

---

## PHẦN 1 — Kiểm Tra & Đánh Giá Database Hiện Tại

### 1.1 Bản đồ 10 Collections Hiện Có

| Collection | Mức độ hoàn thiện | Nhận xét nhanh |
|---|---|---|
| `users` | ⚠️ 75% | Thiếu `status` (active/banned), `refresh_token`; role chỉ có 2 giá trị |
| `movies` | ✅ 90% | Rất tốt — có cast, genres, age_rating, status |
| `theaters` | ⚠️ 70% | Thiếu `city`, `coordinates` (lat/lng), `operating_hours` |
| `rooms` | ✅ 95% | Rất hoàn thiện — có layout, seats[], price_multiplier, status |
| `shows` | ✅ 90% | Tốt — có seat locking, overlap detection, booked_seats |
| `bookings` | ✅ 90% | Tốt — có payment fields, checked_in, F&B snapshot |
| `favorites` | ✅ 100% | Đơn giản nhưng đủ dùng |
| `foods` | ✅ 85% | Thiếu `theater_id` (F&B theo từng rạp) |
| `vouchers` | ✅ 90% | Rất đầy đủ — có applicable_cinemas, applicable_movies |
| `reviews` | ✅ 95% | Rất nâng cao — verified purchase, moderation, reactions |

---

### 1.2 Các Thiếu Sót & Điểm Mù Nghiêm Trọng

#### ❌ Thiếu sót 1: `payments` collection độc lập
**Vấn đề:** `Booking.js` lưu `transaction_id` + `payment_status` nhưng **không lưu toàn bộ payload VNPAY**. Khi khách tranh chấp giao dịch hoặc cần đối soát với ngân hàng, bạn không có dữ liệu đầy đủ.

```js
// Cần thêm collection payments:
{
  booking_id: ObjectId,       // ref Booking
  user_id: ObjectId,          // ref User
  gateway: 'vnpay' | 'momo' | 'zalopay',
  amount: Number,
  currency: 'VND',
  status: 'pending' | 'success' | 'failed' | 'refunded',
  gateway_transaction_id: String,  // vnp_TransactionNo
  gateway_response: Object,        // toàn bộ raw payload từ VNPAY (cho audit)
  initiated_at: Date,
  completed_at: Date,
  refunded_at: Date,
  refund_amount: Number,
}
```

> **Lý do cần:** Báo cáo doanh thu, đối soát tài chính, xử lý hoàn tiền — đây là yêu cầu bắt buộc của mọi hệ thống có tích hợp thanh toán.

---

#### ❌ Thiếu sót 2: `news` / `banners` collection
**Vấn đề:** Không có chỗ lưu bài viết tin tức, banner quảng cáo, thông báo khuyến mãi. Đây là nội dung thay đổi thường xuyên và cần Admin quản lý.

```js
// news collection:
{
  title: String,
  slug: String,           // SEO-friendly URL
  content: String,        // HTML/Markdown
  thumbnail: String,
  category: 'news' | 'promotion' | 'event',
  related_movie: ObjectId, // ref Movie (optional)
  related_theater: ObjectId, // ref Theater (optional)
  published_at: Date,
  is_published: Boolean,
  author: ObjectId,       // ref User (admin)
  views: Number,
}
```

---

#### ⚠️ Thiếu sót 3: `users.role` không đủ granular cho RBAC
**Vấn đề hiện tại:** `role` chỉ có `['user', 'admin']` nhưng thực tế hệ thống đã dùng `theater_id` để phân biệt **Super Admin** (không có `theater_id`) và **Theater Manager** (có `theater_id`). Logic này **implicit** và dễ lỗi.

```js
// Đề xuất thêm role 'staff':
role: { type: String, enum: ['user', 'staff', 'admin', 'superadmin'] }
// - user       : khách hàng thường
// - staff      : nhân viên rạp (soát vé, xem báo cáo ca)
// - admin      : quản lý rạp (có theater_id) — Theater Manager
// - superadmin : toàn quyền (không có theater_id)
```

---

#### ⚠️ Thiếu sót 4: `users` thiếu quản lý trạng thái tài khoản
```js
// Cần thêm vào User schema:
status: { type: String, enum: ['active', 'banned', 'unverified'], default: 'active' },
ban_reason: String,
email_verified: { type: Boolean, default: false },
last_login_at: Date,
```

---

#### ⚠️ Thiếu sót 5: `theaters` thiếu thông tin địa lý & vận hành
```js
// Cần bổ sung Theater schema:
city: String,                          // 'Hà Nội', 'TP.HCM'
coordinates: { lat: Number, lng: Number }, // tích hợp Google Maps
operating_hours: { open: String, close: String }, // '08:00' - '24:00'
is_active: { type: Boolean, default: true },
```

---

#### ⚠️ Thiếu sót 6: `foods` thiếu phân biệt theo rạp
```js
// Cần thêm vào Food schema:
theater_id: { type: ObjectId, ref: 'Theater', default: null }
// null = F&B áp dụng toàn hệ thống
// ObjectId = F&B chỉ bán tại rạp đó (giá/menu khác nhau giữa các rạp)
```

---

### 1.3 Tóm Tắt Đề Xuất Bổ Sung Collections

| Collection | Ưu tiên | Lý do |
|---|---|---|
| `payments` | 🔴 CRITICAL | Audit tài chính, đối soát VNPAY, xử lý hoàn tiền |
| `news` / `banners` | 🟡 HIGH | CMS nội dung trang chủ, quản lý khuyến mãi |
| Cập nhật `users.role` | 🟡 HIGH | RBAC rõ ràng thay vì implicit qua `theater_id` |
| Cập nhật `users.status` | 🟡 HIGH | Block tài khoản vi phạm |
| Cập nhật `theaters` | 🟢 MEDIUM | Tìm kiếm theo thành phố, Google Maps |
| Cập nhật `foods.theater_id` | 🟢 MEDIUM | Menu F&B riêng cho từng rạp |

---

## PHẦN 2 — Đánh Giá & Hoàn Thiện Các Module Quản Lý Đã Có

### 2.1 Bản Đồ: Collection → Module Admin

```
users        ──→  [M1] Quản lý Người Dùng
movies       ──→  [M2] Quản lý Phim
theaters     ──→  [M3] Quản lý Rạp Chiếu
  └─ rooms   ──→  [M4] Quản lý Phòng Chiếu & Sơ Đồ Ghế
shows        ──→  [M5] Quản lý Lịch Chiếu
bookings     ──→  [M6] Quản lý Đơn Đặt Vé / Check-in
foods        ──→  [M7] Quản lý F&B (Đồ ăn/Thức uống)
vouchers     ──→  [M8] Quản lý Voucher & Khuyến Mãi
reviews      ──→  [M9] Quản lý Đánh Giá & Kiểm Duyệt
favorites    ──→  (Dữ liệu thống kê — không cần UI quản lý riêng)
```

---

### 2.2 Chi Tiết Từng Module — Tính Năng & Khoảng Trống Logic

#### [M1] Quản Lý Người Dùng (`users`)
**Trang hiện có:** `UserList.jsx` (1 file, ~4.9KB)

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Xem danh sách users | ✅ Có | |
| Tìm kiếm/filter theo role | ⚠️ Cần kiểm tra | |
| Xem chi tiết user | ❌ Thiếu | Cần UserDetail page |
| Chỉnh sửa thông tin user | ❌ Thiếu | Admin sửa role, theater_id |
| Ban/Unban tài khoản | ❌ Thiếu | Cần trường `status` trước |
| Phân quyền Theater Manager | ⚠️ Partial | Gán `theater_id` cho admin |
| Xem lịch sử đặt vé của user | ❌ Thiếu | Link sang Bookings |

**⚠️ Khoảng trống logic:** Hiện không có cơ chế tạo tài khoản Admin/Theater Manager trực tiếp từ Dashboard — Super Admin phải vào DB thủ công hoặc dùng script seed.

---

#### [M2] Quản Lý Phim (`movies`)
**Trang hiện có:** `MovieList.jsx` + `MovieForm.jsx`

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Xem/tìm kiếm phim | ✅ Có | |
| Tạo phim mới | ✅ Có | |
| Cập nhật phim | ✅ Có | |
| Xóa phim | ⚠️ Cần logic cascade | **Khi xóa phim → phải xử lý Shows đang chiếu!** |
| Filter theo status | ⚠️ Cần kiểm tra | `now_showing`, `coming_soon`, `ended` |
| Upload poster/backdrop | ⚠️ Cần kiểm tra | Local vs Cloud storage |
| Xem thống kê phim | ❌ Thiếu | Doanh thu, lượt đặt vé theo phim |

**🔴 Khoảng trống logic CASCADE quan trọng:**
```
Khi Admin XÓA một PHIM:
  1. Tìm tất cả Shows có movie = phim này
  2. Trong mỗi Show: nếu có booked_seats → KHÔNG cho xóa (hoặc chuyển status = 'ended')
  3. Tìm tất cả Bookings liên quan (qua show) → thông báo/refund
  4. Xóa Favorites liên quan
  5. Xóa Reviews liên quan (hoặc archive)
  → Đề xuất: KHÔNG hard-delete phim, chỉ set status = 'ended'
```

---

#### [M3] Quản Lý Rạp Chiếu (`theaters`)
**Trang hiện có:** `TheaterList.jsx` + `TheaterForm.jsx`

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Xem danh sách rạp | ✅ Có | |
| Tạo/sửa rạp | ✅ Có | |
| Xóa rạp | ⚠️ Cần logic cascade | Phải check Rooms, Shows |
| Gán Theater Manager | ❌ Thiếu | Cần link sang Users |
| Xem danh sách phòng của rạp | ✅ Có (trong Theaters) | Qua `RoomList.jsx` |

---

#### [M4] Quản Lý Phòng Chiếu & Sơ Đồ Ghế (`rooms`)
**Trang hiện có:** `RoomList.jsx` (~23KB — khá đầy đủ)

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Xem phòng theo rạp | ✅ Có | |
| Tạo phòng + sinh ghế tự động | ✅ Có | Qua `generateSeats()` hook |
| Cấu hình layout (rows/cols) | ✅ Có | |
| Đánh dấu ghế hỏng/bảo trì | ⚠️ Partial | Schema có nhưng UI? |
| Xóa phòng | ⚠️ Cần logic | **Xem mục CASCADE bên dưới** |

**🔴 Khoảng trống logic CASCADE — Xóa Phòng:**
```
Khi Admin XÓA/VÔ HIỆU HÓA một PHÒNG CHIẾU:
  1. Query: tìm Shows với room_id = phòng này, is_active = true, showDateTime > now()
  2. Nếu tồn tại Shows tương lai:
     a. BLOCK xóa → hiển thị cảnh báo danh sách shows bị ảnh hưởng
     b. Hoặc cho phép "Force deactivate" → set is_active = false trên tất cả shows
  3. Nếu Shows tương lai có Bookings:
     a. Tạo notification cho users
     b. Trigger refund flow
  4. Chỉ set room.status = 'inactive' (KHÔNG hard delete)
     → Vì booked_seats history cần được giữ lại cho audit
```

---

#### [M5] Quản Lý Lịch Chiếu (`shows`)
**Trang hiện có:** `ShowList.jsx` + `ShowForm.jsx`

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Xem lịch chiếu | ✅ Có | |
| Tạo suất chiếu mới | ✅ Có | |
| Kiểm tra trùng lịch phòng | ✅ Có | Schema có pre-save hook |
| Filter theo ngày/rạp/phim | ⚠️ Cần kiểm tra | |
| Xem Calendar view | ❌ Thiếu | Visualize lịch chiếu theo tuần/tháng |
| Hủy suất chiếu | ⚠️ Cần logic | Phải thông báo users đã đặt vé |
| Sao chép lịch chiếu | ❌ Thiếu | "Clone show" tiết kiệm thời gian tạo lặp lại |

---

#### [M6] Quản Lý Đơn Đặt Vé (`bookings`)
**Trang hiện có:** `BookingList.jsx` (~5.7KB — còn khá đơn giản)

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Xem danh sách bookings | ✅ Có | |
| Filter theo status | ⚠️ Cần kiểm tra | pending/confirmed/cancelled |
| Xem chi tiết booking | ❌ Thiếu | BookingDetail page |
| Check-in soát vé (QR) | ❌ Thiếu | Dùng `booking_code` để scan |
| Hủy booking thủ công | ❌ Thiếu | Admin cancel + trigger refund |
| Xem lịch sử thanh toán | ❌ Thiếu | Cần `payments` collection |
| Xuất báo cáo CSV/PDF | ❌ Thiếu | |

---

#### [M7] Quản Lý F&B (`foods`)
**Trang hiện có:** ❌ **KHÔNG CÓ** (chưa có trang Admin cho Foods!)

| Tính năng cần có | Ghi chú |
|---|---|
| Xem danh sách món F&B | Filter theo category: combo/popcorn/drink |
| Thêm/sửa/xóa món | Upload ảnh, set giá, bật/tắt `isActive` |
| Sắp xếp thứ tự hiển thị | `sortOrder` field đã có sẵn |
| Quản lý theo rạp | Sau khi thêm `theater_id` vào schema |

---

#### [M8] Quản Lý Voucher (`vouchers`)
**Trang hiện có:** `VoucherList.jsx` + `VoucherForm.jsx`

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Xem/tạo/sửa voucher | ✅ Có | |
| Xóa voucher | ⚠️ Cần logic | Kiểm tra voucher đang được dùng? |
| Filter: hết hạn, sắp hết | ⚠️ Cần kiểm tra | `expires_at` < now() |
| Xem thống kê sử dụng | ❌ Thiếu | `used_count` / `usage_limit` |
| Phân quyền RBAC | ❌ Thiếu | Theater Manager chỉ tạo voucher cho rạp của mình |

---

#### [M9] Quản Lý Đánh Giá (`reviews`)
**Trang hiện có:** ❌ **KHÔNG CÓ** (chưa có trang Admin cho Reviews!)

| Tính năng cần có | Ghi chú |
|---|---|
| Xem danh sách reviews | Filter: pending/approved/rejected, theo phim |
| Duyệt / Từ chối review | `status` field đã có sẵn |
| Điền lý do từ chối | `rejectionReason` field đã có sẵn |
| Xóa review vi phạm | Hard delete cho spam |
| Xem reviews bị report | `reportCount >= threshold` |
| Thống kê rating theo phim | Aggregate từ approved reviews |

---

## PHẦN 3 — Thiết Kế Bổ Sung Các Module Còn Thiếu

### 3.1 [M10] Hệ Thống Thống Kê & Báo Cáo Doanh Thu

**Mapping dữ liệu:**
```
bookings (total_amount, status, booked_at) 
  + shows (movie, cinema, showDateTime)
  + movies (title, genres)
  + theaters (name, city)
  → Analytics Engine
```

**Các Dashboard Widget cần có:**

| Widget | Query | Scope |
|---|---|---|
| Tổng doanh thu hôm nay/tháng | `SUM(total_amount) WHERE payment_status='paid'` | Super Admin: tất cả; Theater Manager: rạp của mình |
| Tổng đơn đặt vé | `COUNT(bookings)` group by status | |
| Phim đang chiếu hot nhất | JOIN shows → bookings, sort by ticket count | |
| Doanh thu theo rạp | GROUP BY cinema_id | Chỉ Super Admin |
| Doanh thu theo tháng (line chart) | GROUP BY month(booked_at) | |
| Tỉ lệ ghế lấp đầy | `booked_seats.length / room.capacity` | Theo từng show |
| Top voucher được dùng nhiều | GROUP BY voucher, COUNT | |
| Doanh thu F&B | SUM từ `bookings.foods` | |

**Biểu đồ đề xuất:**
- Line chart: Doanh thu 12 tháng qua (tháng so sánh YoY)
- Bar chart: Top 5 phim doanh thu cao nhất
- Pie chart: Cơ cấu doanh thu (Vé / F&B / Voucher discount)
- Heatmap: Giờ chiếu nào bán chạy nhất trong tuần

---

### 3.2 [M11] Hệ Thống Phân Quyền RBAC Chi Tiết

**Thiết kế phân quyền 4 tầng:**

```
ROLE: superadmin (không có theater_id)
├── Quản lý toàn bộ hệ thống
├── Xem báo cáo tất cả rạp
├── Tạo/xóa Theater Manager
├── Quản lý Phim (global)
└── Xem payments toàn hệ thống

ROLE: admin (có theater_id = X)
├── Quản lý Phòng thuộc rạp X
├── Quản lý Lịch chiếu tại rạp X
├── Xem Bookings tại rạp X
├── Tạo voucher cho rạp X
├── Quản lý F&B tại rạp X
└── Xem báo cáo doanh thu rạp X

ROLE: staff (có theater_id = X) [Mới]
├── CHECK-IN soát vé tại rạp X
├── Xem lịch chiếu hôm nay tại rạp X
└── Xem thông tin booking khi scan QR

ROLE: user
└── Khách hàng thường (không vào admin)
```

**Middleware RBAC đề xuất:**
```js
// backend/middleware/rbac.js
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  next();
};

export const requireSameTheater = (req, res, next) => {
  // Theater Manager chỉ thao tác trên dữ liệu của rạp mình
  if (req.user.role === 'admin' && req.user.theater_id) {
    req.scopedTheaterId = req.user.theater_id;
  }
  next();
};
```

---

### 3.3 [M12] Quản Lý Tin Tức & Nội Dung (CMS)

**Tính năng cần có:**

| Tính năng | Ghi chú |
|---|---|
| Danh sách bài viết | Filter: đã đăng / bản nháp / đã ẩn |
| Tạo/sửa bài viết | Rich text editor (TipTap/Quill), upload ảnh đại diện |
| Phân loại bài viết | `category`: 'news' | 'promotion' | 'event' |
| Liên kết phim/rạp | `related_movie`, `related_theater` |
| Quản lý Banner trang chủ | Slider ảnh, URL đích, thời gian hiển thị |
| Lên lịch đăng bài | `published_at` — đăng tự động theo lịch |
| Thống kê lượt xem | `views` counter |

---

### 3.4 [M13] Quản Lý F&B — Module Bị Bỏ Sót

**Route đề xuất:**
```
GET    /api/admin/foods         → Danh sách (có filter isActive, category)
POST   /api/admin/foods         → Tạo mới (upload ảnh)
PUT    /api/admin/foods/:id     → Cập nhật
DELETE /api/admin/foods/:id     → Xóa / Vô hiệu hóa
PATCH  /api/admin/foods/reorder → Cập nhật sortOrder hàng loạt
```

---

### 3.5 [M14] Quản Lý Đánh Giá — Module Bị Bỏ Sót

**Route đề xuất:**
```
GET    /api/admin/reviews                    → Danh sách (filter: status, movie, reportCount)
PATCH  /api/admin/reviews/:id/approve       → Duyệt review
PATCH  /api/admin/reviews/:id/reject        → Từ chối + lý do
DELETE /api/admin/reviews/:id               → Xóa cứng (spam)
GET    /api/admin/reviews/reported          → Danh sách review bị report nhiều
```

---

## TỔNG KẾT — Roadmap Hoàn Thiện Admin Dashboard

### Phase 1 — Hoàn thiện ngay (Cao nhất)
- [ ] Tạo trang **Foods Management** (FoodList + FoodForm)
- [ ] Tạo trang **Reviews Management** (ReviewList + ReviewDetail)
- [ ] Nâng cấp **BookingList** → thêm BookingDetail + Check-in QR
- [ ] Hoàn thiện **UserList** → thêm ban/unban, gán role, gán theater

### Phase 2 — Logic nghiệp vụ & Cascade
- [ ] Implement cascade delete logic cho Movie, Room, Show
- [ ] Thêm `payments` collection + Payment History UI
- [ ] Cập nhật `User.role` enum → 4 tầng (superadmin/admin/staff/user)
- [ ] RBAC middleware chặt chẽ hơn

### Phase 3 — Nâng cấp & Analytics
- [ ] **Dashboard Analytics** với recharts/chart.js
- [ ] **CMS News & Banners** module
- [ ] Calendar view cho Lịch chiếu (react-big-calendar)
- [ ] Export báo cáo CSV/PDF
- [ ] Thêm `theater.city`, `theater.coordinates`, `theater.is_active`

### Phase 4 — Nâng cao
- [ ] Check-in app cho Staff (giao diện scan QR riêng)
- [ ] Real-time dashboard (WebSocket cho live booking updates)
- [ ] F&B menu theo từng rạp (`food.theater_id`)
- [ ] Hệ thống thông báo Push (khi show bị hủy, refund)
