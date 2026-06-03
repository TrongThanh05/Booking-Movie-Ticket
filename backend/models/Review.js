/**
 * Model: Review.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Collection `reviews` lưu trữ đánh giá của người dùng về phim.
 *
 * Thiết kế theo nguyên tắc:
 *  - "Verified Purchase" — chỉ người đã đặt vé + xem phim mới được đánh giá.
 *  - Mỗi user chỉ được đánh giá MỘT lần cho mỗi phim (unique index).
 *  - Admin có thể duyệt / ẩn bình luận trước khi hiển thị công khai.
 *  - vote_average và vote_count trên Movie được cập nhật tự động qua
 *    Mongoose post-hooks khi review được tạo, sửa, hoặc xóa.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

// ─── Sub-schema: Reaction (like / dislike) ────────────────────────────────────
// Cho phép người dùng khác react vào review (helpful / not helpful).
const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 'like'    → review này hữu ích
    // 'dislike' → review này không hữu ích / có vấn đề
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  { _id: false } // không cần _id riêng cho từng reaction
);

// ─── Main Schema: Review ──────────────────────────────────────────────────────
const reviewSchema = new mongoose.Schema(
  {
    // ── 1. Liên kết tới tài khoản người đánh giá ───────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Đánh giá phải thuộc về một người dùng.'],
      index: true, // query nhanh "tất cả review của user X"
    },

    // ── 2. Liên kết tới phim được đánh giá ────────────────────────────────
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Đánh giá phải thuộc về một bộ phim.'],
      index: true, // query nhanh "tất cả review của phim Y"
    },

    // ── 3. [Nâng cao] Liên kết tới booking — xác minh "Verified Purchase" ──
    // Nếu trường này tồn tại, hệ thống biết user đã thực sự mua vé bộ phim này.
    // Backend cần kiểm tra booking.movie === review.movie && booking.user === review.user
    // và booking.status === 'confirmed' trước khi cho phép tạo review.
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      // null = không xác minh được (ví dụ: import data cũ, hoặc tính năng tắt)
    },

    // ── 4. Điểm đánh giá — thang 1–10 ────────────────────────────────────
    rating: {
      type: Number,
      required: [true, 'Điểm đánh giá là bắt buộc.'],
      min: [1, 'Điểm tối thiểu là 1.'],
      max: [10, 'Điểm tối đa là 10.'],
      // Chỉ chấp nhận số nguyên hoặc .5 (ví dụ: 7, 7.5)
      validate: {
        validator: (v) => Number.isFinite(v) && v * 2 === Math.round(v * 2),
        message: 'Điểm phải là số nguyên hoặc kết thúc bằng .5 (VD: 7 hoặc 7.5).',
      },
    },

    // ── 5. Nội dung bình luận ─────────────────────────────────────────────
    comment: {
      type: String,
      required: [true, 'Nội dung bình luận là bắt buộc.'],
      trim: true,
      minlength: [10, 'Bình luận phải có ít nhất 10 ký tự.'],
      maxlength: [2000, 'Bình luận không được vượt quá 2000 ký tự.'],
    },

    // ── 6. Cảnh báo SPOILER ───────────────────────────────────────────────
    // true → nội dung review tiết lộ cốt truyện, giao diện sẽ che và hiện nút "Xem spoiler"
    isSpoiler: {
      type: Boolean,
      default: false,
    },

    // ── 7. Trạng thái duyệt bởi Admin ────────────────────────────────────
    // 'pending'  → chờ admin duyệt (chế độ pre-moderation)
    // 'approved' → đã duyệt, hiển thị công khai
    // 'rejected' → bị từ chối (vi phạm nội quy, spam, v.v.)
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: 'Trạng thái không hợp lệ. Phải là: pending | approved | rejected.',
      },
      default: 'approved',
      index: true, // query nhanh "tất cả review pending"
    },

    // ── 8. Lý do từ chối (Admin điền khi status = 'rejected') ─────────────
    // Có thể dùng để thông báo cho user biết lý do review bị ẩn.
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Lý do từ chối không được vượt quá 500 ký tự.'],
      default: null,
    },

    // ── 9. Đã được xác minh mua vé (Verified Purchase badge) ─────────────
    // true  → user có booking hợp lệ cho phim này (được tính từ field `booking`)
    // false → review thông thường, chưa xác minh
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },

    // ── 10. Reactions của người xem review (like / dislike) ───────────────
    // Dùng để sắp xếp review theo mức độ hữu ích.
    reactions: {
      type: [reactionSchema],
      default: [],
    },

    // ── 11. Số lần bị báo cáo (report) ───────────────────────────────────
    // Khi reportCount vượt ngưỡng (VD: >= 5), có thể tự động chuyển về 'pending'.
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── 12. Phiên bản chỉnh sửa ───────────────────────────────────────────
    // Mỗi lần user sửa review, tăng lên 1. Hiển thị "(đã chỉnh sửa)" trên UI.
    editCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── 13. Thời điểm chỉnh sửa lần cuối ─────────────────────────────────
    lastEditedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // tự động thêm createdAt & updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// UNIQUE: mỗi user chỉ đánh giá MỘT LẦN cho một phim.
reviewSchema.index({ user: 1, movie: 1 }, { unique: true });

// Index phức hợp: lấy review của phim X đã approved, sắp xếp mới nhất
reviewSchema.index({ movie: 1, status: 1, createdAt: -1 });

// Index phức hợp: lấy review của phim X theo rating (dùng cho thống kê)
reviewSchema.index({ movie: 1, rating: 1 });

// ─── Virtuals ────────────────────────────────────────────────────────────────

// Tổng số like
reviewSchema.virtual('likeCount').get(function () {
  return this.reactions.filter((r) => r.type === 'like').length;
});

// Tổng số dislike
reviewSchema.virtual('dislikeCount').get(function () {
  return this.reactions.filter((r) => r.type === 'dislike').length;
});

// ─── Static Method: tính và cập nhật vote_average + vote_count lên Movie ─────
/**
 * Gọi sau mỗi thao tác create / update / delete review.
 * Tính lại điểm trung bình và tổng số review của phim (chỉ tính approved),
 * sau đó cập nhật vào 2 trường có sẵn trên Movie:
 *   - vote_average: điểm trung bình (thang 10)
 *   - vote_count  : tổng số lượt đánh giá đã duyệt
 */
reviewSchema.statics.recalculateMovieRating = async function (movieId) {
  const Movie = mongoose.model('Movie');

  const stats = await this.aggregate([
    {
      $match: {
        movie: new mongoose.Types.ObjectId(movieId),
        status: 'approved', // chỉ tính review đã được duyệt
      },
    },
    {
      $group: {
        _id: '$movie',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Movie.findByIdAndUpdate(movieId, {
      // Làm tròn 1 chữ số thập phân (VD: 7.666... → 7.7)
      vote_average: Math.round(stats[0].avgRating * 10) / 10,
      vote_count: stats[0].count,
    });
  } else {
    // Không còn review nào approved → reset về 0
    await Movie.findByIdAndUpdate(movieId, {
      vote_average: 0,
      vote_count: 0,
    });
  }
};

// ─── Hooks: tự động cập nhật vote_average / vote_count sau mỗi thay đổi ──────

// Sau khi TẠO mới review
reviewSchema.post('save', async function () {
  await this.constructor.recalculateMovieRating(this.movie);
});

// Sau khi XÓA review (findByIdAndDelete / deleteOne)
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await doc.constructor.recalculateMovieRating(doc.movie);
});

// Sau khi CẬP NHẬT (findByIdAndUpdate — ví dụ: admin duyệt/từ chối)
reviewSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) await doc.constructor.recalculateMovieRating(doc.movie);
});

// ─── Pre-save Hook: cập nhật trường phụ trợ khi user sửa review ─────────────
reviewSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('comment')) {
    this.editCount += 1;
    this.lastEditedAt = new Date();
  }
  next();
});

// ─── Export ──────────────────────────────────────────────────────────────────
const Review = mongoose.model('Review', reviewSchema);
export default Review;
