/**
 * utils/vnpay.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Tiện ích VNPAY — tạo URL thanh toán & xác thực chữ ký IPN/Return.
 *
 * Tài liệu tham khảo: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/
 *
 * Thuật toán ký:
 *   1. Collect tất cả params bắt đầu bằng "vnp_" (trừ vnp_SecureHash)
 *   2. Sort theo thứ tự alphabet (key)
 *   3. Build query string (URLEncoded)
 *   4. HMAC-SHA512 với hashSecret
 */

import crypto from 'crypto';

// ── Lấy config từ env ─────────────────────────────────────────────────────────
export const VNPAY_CONFIG = {
  tmnCode:    process.env.VNPAY_TMN_CODE    || 'L8WM2GFD',
  hashSecret: process.env.VNPAY_HASH_SECRET || '3SHEM21ZUFCU8LN0MEZPCZX1VP58YHCW',
  url:        process.env.VNPAY_URL         || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl:  process.env.VNPAY_RETURN_URL  || 'http://localhost:5173/vnpay/return',
};

// ── Format date: yyyyMMddHHmmss (múi giờ VN +07:00) ───────────────────────────
export const formatVnpDate = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  // Convert to Vietnam time (UTC+7)
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const y   = vnDate.getUTCFullYear();
  const mo  = pad(vnDate.getUTCMonth() + 1);
  const d   = pad(vnDate.getUTCDate());
  const h   = pad(vnDate.getUTCHours());
  const mi  = pad(vnDate.getUTCMinutes());
  const s   = pad(vnDate.getUTCSeconds());
  return `${y}${mo}${d}${h}${mi}${s}`;
};

// ── Ký HMAC-SHA512 ────────────────────────────────────────────────────────────
export const hmacSHA512 = (data, key) =>
  crypto.createHmac('sha512', key).update(data, 'utf8').digest('hex');

// ── Sắp xếp & build query string theo đúng chuẩn VNPAY ──────────────────────
// Theo tài liệu VNPAY: sort key ASC, encode value bằng encodeURIComponent,
// thay %20 bằng +. KHÔNG dùng URLSearchParams vì nó encode khác chuẩn.
const sortAndBuildQuery = (params) => {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&');
};

/**
 * Tạo URL redirect sang cổng thanh toán VNPAY.
 *
 * @param {object} opts
 * @param {string}  opts.orderId       – Mã đơn hàng duy nhất (booking_code)
 * @param {number}  opts.amount        – Số tiền (VND, không có phần thập phân)
 * @param {string}  opts.orderInfo     – Mô tả đơn hàng (ví dụ: "Dat ve phim BK-ABCD1234")
 * @param {string}  opts.ipAddr        – IP người dùng
 * @param {Date}    opts.expireDate    – Thời hạn thanh toán (phải khớp lockExpireTime)
 * @param {string} [opts.locale]       – 'vn' | 'en'
 * @param {string} [opts.bankCode]     – Để trống = VNPAY tự chọn
 * @returns {string} URL redirect đầy đủ
 */
export const createVnpayUrl = ({
  orderId,
  amount,
  orderInfo,
  ipAddr,
  expireDate,
  locale    = 'vn',
  bankCode  = '',
}) => {
  const now = new Date();

  const params = {
    vnp_Version:     '2.1.0',
    vnp_Command:     'pay',
    vnp_TmnCode:     VNPAY_CONFIG.tmnCode,
    vnp_Amount:      String(Math.round(amount) * 100),  // VNPAY nhân 100
    vnp_CurrCode:    'VND',
    vnp_TxnRef:      orderId,                            // unique order ref
    vnp_OrderInfo:   orderInfo,
    vnp_OrderType:   'other',
    vnp_Locale:      locale,
    vnp_ReturnUrl:   VNPAY_CONFIG.returnUrl,
    vnp_IpAddr:      ipAddr || '127.0.0.1',
    vnp_CreateDate:  formatVnpDate(now),
    vnp_ExpireDate:  formatVnpDate(expireDate),          // 🔑 phòng vệ timeout
  };

  if (bankCode) params.vnp_BankCode = bankCode;

  const queryStr   = sortAndBuildQuery(params);
  const secureHash = hmacSHA512(queryStr, VNPAY_CONFIG.hashSecret);

  // ── DEBUG: In ra để kiểm tra chữ ký (xóa sau khi debug xong) ────────────
  console.log('[VNPAY DEBUG] TmnCode   :', VNPAY_CONFIG.tmnCode);
  console.log('[VNPAY DEBUG] HashSecret:', VNPAY_CONFIG.hashSecret);
  console.log('[VNPAY DEBUG] QueryStr  :', queryStr);
  console.log('[VNPAY DEBUG] SecureHash:', secureHash);
  // ─────────────────────────────────────────────────────────────────────────

  return `${VNPAY_CONFIG.url}?${queryStr}&vnp_SecureHash=${secureHash}`;
};

/**
 * Xác thực chữ ký từ VNPAY (dùng cho cả Return URL và IPN).
 *
 * @param {object} vnpParams – Toàn bộ query params nhận được từ VNPAY
 * @returns {{ valid: boolean, responseCode: string, orderId: string, amount: number }}
 */
export const verifyVnpayReturn = (vnpParams) => {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = vnpParams;

  // Lọc chỉ các param bắt đầu bằng "vnp_"
  const filtered = {};
  for (const [k, v] of Object.entries(rest)) {
    if (k.startsWith('vnp_')) filtered[k] = v;
  }

  const queryStr   = sortAndBuildQuery(filtered);
  const myHash     = hmacSHA512(queryStr, VNPAY_CONFIG.hashSecret);
  const valid      = myHash === vnp_SecureHash?.toLowerCase();

  return {
    valid,
    responseCode: vnpParams.vnp_ResponseCode,
    orderId:      vnpParams.vnp_TxnRef,           // booking_code
    amount:       Number(vnpParams.vnp_Amount) / 100, // chia lại 100
    transactionId:vnpParams.vnp_TransactionNo,
    bankCode:     vnpParams.vnp_BankCode,
    payDate:      vnpParams.vnp_PayDate,
  };
};
