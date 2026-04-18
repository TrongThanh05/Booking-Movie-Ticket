import Show from '../models/Show.js';

/**
 * Giải phóng các ghế locked đã hết hạn hold_until.
 * Chạy mỗi 60 giây bằng setInterval trong server.js.
 *
 * Schema mới (lockedSeatSchema KHÔNG có field `status`):
 *   reserved_seats[]: { seat_id, user_id, hold_until, locked_at }
 *
 * Logic: $pull tất cả phần tử trong reserved_seats có hold_until < now
 */
const releaseExpiredLocks = async () => {
  try {
    const now = new Date();

    const result = await Show.updateMany(
      // Filter: chỉ xử lý shows đang có lock hết hạn
      { 'reserved_seats.hold_until': { $lt: now } },
      {
        $pull: {
          // Xóa tất cả lock đã hết hạn — không cần check status (field không còn tồn tại)
          reserved_seats: { hold_until: { $lt: now } },
        },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(
        `🔓 [CronUnlock] Đã giải phóng lock hết hạn trong ${result.modifiedCount} suất chiếu`,
      );
    }
  } catch (error) {
    console.error('❌ [CronUnlock] Lỗi khi giải phóng ghế:', error.message);
  }
};

/**
 * Khởi chạy cron job — gọi sau khi kết nối DB trong server.js
 * @param {number} intervalMs - Khoảng cách mỗi lần quét (ms). Mặc định 60s.
 */
export const startCronUnlock = (intervalMs = 60000) => {
  console.log(
    `⏰ [CronUnlock] Bắt đầu quét ghế hết hạn mỗi ${intervalMs / 1000}s`,
  );
  releaseExpiredLocks(); // Chạy ngay lần đầu
  setInterval(releaseExpiredLocks, intervalMs);
};

export default releaseExpiredLocks;
