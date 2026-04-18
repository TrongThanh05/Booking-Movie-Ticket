# KẾ HOẠCH TÁI CẤU TRÚC HỆ THỐNG MOVIE TICKET BOOKING

Bản kế hoạch (Technical Specification) chi tiết dành cho trí tuệ nhân tạo (Claude Sonnet 4.6 hoặc tương đương) để đọc, hiểu và thực thi từng bước quá trình chuyển đổi (Migration) cấu trúc Database MongoDB, đồng thời kết nối lại Backend và Frontend chuẩn hóa.

## User Review Required

> [!WARNING]
> Mọi thay đổi này sẽ **phá vỡ tính tương thích** (Breaking Changes) đối với code Frontend và Backend hiện hành ở màn hình chọn ghế. AI Agent thực thi cần phải tiến hành cẩn thận từ Phase 1 sang Phase 3. Vui lòng cho phép phê duyệt plan này trước khi bắt đầu sửa code.

## Proposed Changes

---

### Phase 1: Database Migration - Schema Definition ✅ COMPLETED

> [!NOTE]
> Database hiện tại đang gán cứng ghế vào Frontend, không khả thi mở rộng. Thiết kế mới tuân thủ nguyên tắc Embedded Data đối với cấu hình tĩnh (Room Layout) và Dynamic Arrays Array có khóa đối với luồng check-out (Show Booked Seats).

#### [NEW] `backend/models/Cinema.js`
Thay thế hoàn toàn cho `Theater.js` cũ.
- **Schema Fields**: `name` (String, required), `location` (String, required), `address` (String), `phone`, `email`, `image`. Bỏ thuộc tính không cần thiết `totalRooms` vì sau này Room có Model riêng rồi.

#### [NEW] `backend/models/Room.js`
Nơi cấu hình sơ đồ ghế động của từng rạp.
- **Schema Fields**:
  - `cinema_id`: `mongoose.Schema.Types.ObjectId`, ref: `Cinema`
  - `name`: Tên phòng (VD: "Phòng chiếu 1")
  - `screen_type`: String (VD: Định dạng 2D, IMAX)
  - `layout`: Nhúng Sơ Đồ Cấu Hình
    - `rows`: Number
    - `columns`: Number
    - `row_configs`: Mảng các Objects `[ { row: "A", type: "regular", price_multiplier: 1.0 }, { row: "H", type: "vip", price_multiplier: 1.5 } ]`

#### [MODIFY] `backend/models/Show.js` (Showtimes)
Thay đổi quan trọng nhất: Quản lí ghế realtime bằng Mảng nhúng `reserved_seats`.
- **Schema Updates**:
  - Đổi field `theater` trỏ thành `cinema` (`ref: 'Cinema'`).
  - Đổi field String `room` thành ObjectId `room_id` (`ref: 'Room'`).
  - Xóa field `occupiedSeats` dạng Map lỗi thời.
  - Thêm `base_price` (Number, Base giá gốc).
  - Thêm `reserved_seats`: Mảng chứa các Record giữ ghế lúc checkout:
    ```json
    [{
       seat_id: { type: String, required: true },
       user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
       status: { type: String, enum: ['locked', 'paid'] },
       hold_until: { type: Date } // Expiration TTL
    }]
    ```

#### [MODIFY] `backend/models/Booking.js`
Hiện đại hóa model thanh toán.
- **Schema Updates**:
  - Sửa mảng string `bookedSeats: [{type: String}]` thành mảng object lưu thêm giá: `tickets: [{ seat_id: String, price: Number }]`.

---

### Phase 2: Core API Endpoints Implementation ✅ COMPLETED

> [!IMPORTANT]
> Agent hãy chú trọng vào logic giải quyết Race Condition (trùng vé).

#### [MODIFY] `backend/routes/shows.js` - API Realtime Seat Management
1. **[NEW] API `GET /api/shows/:id/seat-map`**
   - API trả về tổng quan sơ đồ cho View hiển thị:
   - Truy vấn `Show` bằng `:id` -> Từ đó populate `room_id` ra field `layout.row_configs`. 
   - Mapping danh sách `reserved_seats` trong show để chèn thuộc tính trang thái (`Trống`, `Đang khóa khóa`, `Đã bán`) vào sơ đồ ghế để Frontend xài luôn.

2. **[NEW] API Khóa Ghế Trước Khi Mua: `POST /api/shows/:id/lock-seats`**
   - Payload: `{ seat_ids: ["F5", "F6"], user_id: "..." }`.
   - **Xử lý Concurrent Lock:**
     Dùng vòng lặp / MongoDB `$elemMatch` check trong mảng `show.reserved_seats`. Nếu bất kì `seat_id` nào đang là `locked` (chưa hết hạn `hold_until`) hoặc đã `paid` -> Trả về `HTTP 409 Conflict` (Ghế đã có người xí phần).
   - Nếu trống 100%: Sử dụng `$push` hàng loạt vào `reserved_seats` với trạng thái `locked`, thời hạn `hold_until = Date.now() + 10 mins`. Trả về `200 OK`.

#### [MODIFY] `backend/routes/bookings.js` - Thanh Toán
1. **[NEW/MOD] API Xác nhận thanh toán Booking: `POST /api/bookings`**
   - Payload: `{ show_id, seat_ids, total_amount, payment_method }`.
   - Lưu record mới vào Database Collection `Bookings`.
   - **Unlock và Confirm:** Find lại `Show`, cập nhật các phần tử bên trong `reserved_seats` (của những `seat_ids` tương ứng) sửa status từ `locked` -> `paid` và nullify/delete field `hold_until` đi (Dùng `$set` và `$arrayFilter` của Mongoose).

#### [NEW] `backend/scripts/cronUnlock.js` (Tuỳ chọn)
- Code 1 block Background Interval quét Collection `Shows`, dùng lệnh `$pull` xóa toàn bộ các items nằm trong Array `reserved_seats` nếu có `status === "locked"` VÀ `hold_until < new Date()`.

---

### Phase 3: Frontend UI Adaptation ✅ COMPLETED

> [!TIP]
> Tẩy trắng hoàn toàn logic hardcode array. Tôn trọng duy nhất dữ liệu API đổ cấu hình xuống.

#### [MODIFY] `src/pages/SeatLayout.jsx`
- Xóa bỏ hằng số khai báo `const vipRows = ['F', 'G', 'H'];`, vv.
- Tại `useEffect`, Fetch API `GET /api/shows/:id/seat-map`. Render dãy ghế dựa hoàn toàn trên `room_id.layout`.
- Viết lại hàm `calculateTotal` tự lấy hệ số nhân `price_multiplier` do API cung cấp theo loại ghế nhân với `base_price` của `Show`.
- **Luồng Đặt**: Khi user click "Tiếp Tục", Submit `POST /api/shows/:id/lock-seats`. Thành công thì lật UI component sang `<PaymentStep>`.
- Hiển thị Timer 10 Phút đếm ngược ở màn thanh toán, hết giờ Javascript force reload lại Page.

#### [MODIFY] `src/pages/MyBooking.jsx`
- Dùng `useEffect` Fetch thẳng data từ `/api/bookings/my-bookings` của Backend (loại bỏ dummyBooking) và parse dữ liệu tickets show history.

## Open Questions

- Backend chưa chạy một Cronjob worker nào, project này cho phép `setInterval` ngay tại file `server.js` hoặc dùng thư viện Node-cron không? (Sẽ ảnh hưởng đến script giải phóng vé quá hạn).

## Verification Plan

### Test kịch bản giữ ghế (Locking Race-condition Tự Động Giải Quá Tải)
1. Dựng lại database mẫu với các Collection Schema trên.
2. Mock 2 Request API POST gọi đồng thời với payload cố tình mâu thuẫn (cùng lock 1 ghế `F3`).
3. Xác nhận Request 1 trả về HTTP 200, Request 2 sẽ phải đập lỗi Exception HTTP 409 Conflict.
4. Set thử `hold_until` lui về 1 phút trước. Gọi Script unlock. Verify lại ghế đã bị remove khỏi array. Cấu trúc DB thông suốt trọn vẹn từ Backend tới Database.
