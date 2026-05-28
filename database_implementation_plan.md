# Kế hoạch Thực thi: Nâng cấp & Sửa đổi Mongoose Database Collections

Tài liệu này trình bày kế hoạch nâng cấp, sửa đổi và chuẩn hóa hệ thống MongoDB collections (Mongoose Schemas) trong thư mục `backend/models` của dự án **Booking Movie Ticket**. 

Mục tiêu là khắc phục các lỗi nghiêm trọng hiện có (như lỗi tham chiếu model `'Cinema'`), đảm bảo tính nhất quán trong cách đặt tên, đồng thời bổ sung các tính năng thực tế để hệ thống có thể tích hợp thanh toán cổng giao dịch, áp dụng voucher giảm giá, soát vé tại rạp và chống trùng lịch chiếu.

---

## User Review Required

> [!IMPORTANT]
> **Quyết định về việc đổi tên trường Rạp chiếu:**
> Để đồng bộ cấu trúc, chúng tôi đề xuất 2 phương án cho các trường trỏ tới rạp chiếu:
> *   **Phương án A (Khuyên dùng - An toàn nhất):** Giữ nguyên tên trường hiện tại (`applicable_cinemas` trong `Voucher`, `cinema` trong `Show`) để **tránh phá vỡ giao diện Frontend** hoặc các API Routes hiện có, nhưng **sửa lại các tham chiếu `ref` chính xác về `'Theater'`**.
> *   **Phương án B (Sạch sẽ nhất):** Tiến hành đổi tên đồng loạt thành `applicable_theaters` và `theater` (hoặc `theater_id`). Việc này yêu cầu sửa đổi đồng bộ cả trong các file API Routes và Frontend Components có sử dụng các trường này.
>
> *Trong bản kế hoạch này, Hãy chọn một trong 2 phương pháp làm sao để có thể sửa một cách chính xác và giảm thiểu lượng token AI bị đốt cháy

---

## Open Questions

> [!NOTE]
> Bạn có muốn chúng tôi tiến hành cập nhật trực tiếp cả logic nghiệp vụ trong API Routes để áp dụng các trường mới này hay không?
> *   Ví dụ: Tích hợp logic kiểm tra và trừ lượt dùng Voucher trong API đặt vé [routes/bookings.js](file:///f:/bai_tap_lap_trinh/reactjs/react-booking-movie-ticket/Booking-Movie-Ticket/backend/routes/bookings.js) và [services/completeBooking.js](file:///f:/bai_tap_lap_trinh/reactjs/react-booking-movie-ticket/Booking-Movie-Ticket/backend/services/completeBooking.js).
> *   Tạo API endpoint dành riêng cho nhân viên soát vé quét mã QR và đánh dấu `checked_in = true`.

---

## Proposed Changes

Chúng tôi chia kế hoạch thực thi làm 5 bước chính tương ứng với 5 tệp tin Schema cần nâng cấp trong `backend/models`:

### 1. Sửa lỗi tham chiếu và nâng cấp tính năng Voucher

#### [MODIFY] [Voucher.js](file:///f:/bai_tap_lap_trinh/reactjs/react-booking-movie-ticket/Booking-Movie-Ticket/backend/models/Voucher.js)
*   Sửa lỗi `ref: 'Cinema'` thành `ref: 'Theater'` ở trường `applicable_cinemas`.
*   Bổ sung trường `discount_type` (`fixed` hoặc `percentage`) để hỗ trợ giảm giá theo phần trăm hoặc số tiền cố định.
*   Bổ sung các ràng buộc thực tế: `min_order_value` (giá trị đơn hàng tối thiểu) và `max_discount_amount` (số tiền giảm tối đa đối với giảm giá %).

---

### 2. Tích hợp Voucher, Thanh toán và Check-in vào Booking

#### [MODIFY] [Booking.js](file:///f:/bai_tap_lap_trinh/reactjs/react-booking-movie-ticket/Booking-Movie-Ticket/backend/models/Booking.js)
*   Bổ sung tham chiếu `voucher` và trường `discount_amount` để lưu vết voucher đã sử dụng và số tiền được khấu trừ.
*   Bổ sung trường `payment_status` (`pending`, `paid`, `failed`, `refunded`) và `transaction_id` phục vụ đối soát giao dịch cổng thanh toán (MoMo/VNPAY/Stripe).
*   Bổ sung trường soát vé `checked_in`, `checked_in_at` và `checked_in_by` phục vụ kiểm soát vé vào phòng chiếu tại rạp thực tế.

---

### 3. Tự động tính toán giờ kết thúc suất chiếu và chống trùng lịch phòng

#### [MODIFY] [Show.js](file:///f:/bai_tap_lap_trinh/reactjs/react-booking-movie-ticket/Booking-Movie-Ticket/backend/models/Show.js)
*   Thêm trường `endDateTime` (Thời điểm kết thúc suất chiếu).
*   Viết một `pre-save` hook để tự động tính: `endDateTime = showDateTime + duration (phút)`.
*   Tích hợp kiểm tra trùng lịch (Overlap validation): Đảm bảo không có suất chiếu nào khác hoạt động trong cùng một phòng (`room_id`) bị chồng lấp thời gian chiếu.

---

### 4. Bổ sung Nhãn độ tuổi và Trạng thái Phim

#### [MODIFY] [Movie.js](file:///f:/bai_tap_lap_trinh/reactjs/react-booking-movie-ticket/Booking-Movie-Ticket/backend/models/Movie.js)
*   Bổ sung trường `age_rating` đại diện nhãn độ tuổi theo Luật Điện ảnh Việt Nam (`P`, `K`, `T13`, `T16`, `T18`).
*   Bổ sung trường `status` (`now_showing`, `coming_soon`, `ended`) để tối ưu hóa việc phân loại phim hiển thị trên giao diện người dùng.

---

### 5. Hỗ trợ trạng thái bảo trì cho từng ghế vật lý

#### [MODIFY] [Room.js](file:///f:/bai_tap_lap_trinh/reactjs/react-booking-movie-ticket/Booking-Movie-Ticket/backend/models/Room.js)
*   Bổ sung trường `status` (`active`, `broken`, `maintenance`) vào `seatSchema` để nhân viên rạp có thể khóa các ghế bị hỏng tạm thời mà không ảnh hưởng tới layout tổng thể của phòng.

---

## Verification Plan

Sau khi cập nhật các Schema, chúng tôi sẽ tiến hành xác thực tính ổn định của hệ thống:

### Automated Tests
1.  **Lập trình tập lệnh kiểm thử nhỏ (Scratch Script):** 
    Tạo một script chạy thử nghiệm tại thư mục `scratch/test-db-schemas.js` để kết nối vào Database local và kiểm tra các hành vi sau:
    *   Tạo thử Voucher và kiểm tra xem có `.populate('applicable_cinemas')` được không (xác nhận hết lỗi tham chiếu `'Cinema'`).
    *   Tạo thử 2 Suất chiếu trùng thời gian trong cùng một phòng để xác nhận Hook `pre-save` ngăn chặn thành công và ném ra lỗi.
    *   Tạo Booking và thử gán Voucher cùng trạng thái thanh toán cổng điện tử.
2.  **Chạy ứng dụng Backend:** Khởi động server backend và kiểm tra xem Mongoose có biên dịch thành công các Model mới hay không, đảm bảo không có lỗi cú pháp hoặc xung đột index.

### Manual Verification
*   Kiểm tra API đặt vé hiện tại thông qua Postman hoặc trực tiếp trên Frontend để đảm bảo API hoạt động bình thường, không bị ảnh hưởng bởi việc thay đổi Schema (với việc áp dụng Phương án A an toàn).
