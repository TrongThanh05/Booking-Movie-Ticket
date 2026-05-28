import React from 'react';

/**
 * ComingSoonTag – Ribbon chéo góc trên-trái kiểu "quấn qua góc".
 *
 * Đối xứng với NewReleaseTag (góc trên-phải đỏ), tag này nằm ở
 * góc trên-trái với màu xanh dương (indigo) để phân biệt rõ ràng.
 *
 * Kỹ thuật giống NewReleaseTag:
 *  1. Outer div (w-[88px] h-[88px], overflow-hidden) ghim chặt góc trên-trái.
 *  2. Inner div xoay -45°, clip-path polygon tạo hình bình hành → ribbon chéo.
 *
 * Props:
 *  - label : string  – Nội dung (mặc định 'SẮP CHIẾU')
 *  - show  : boolean – Bật/tắt tag
 *
 * Yêu cầu: card cha phải có class `relative`.
 */
const ComingSoonTag = ({ label = 'SẮP CHIẾU', show = true }) => {
  if (!show) return null;

  return (
    /* Outer container ghim ở góc trên-trái, overflow-hidden cắt phần thừa */
    <div
      aria-label={label}
      className="absolute top-0 right-0 w-[88px] h-[88px] overflow-hidden pointer-events-none z-10"
    >
      {/*
       * Inner ribbon:
       * - rotate(-45deg): xoay ngược chiều → góc trên-trái
       * - clip-path polygon: hình bình hành (4 góc lệch ~12px)
       *   → 2 đầu bị cắt chéo 45° sắc nét khi kết hợp rotate
       */}
      <div
        className="absolute flex items-center justify-center bg-blue-500 shadow-lg"
        style={{
          top: '16px',
          right: '-28px',
          width: '112px',
          padding: '6px 0',
          transform: 'rotate(45deg)',
          clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 100%, 0% 100%)',
        }}
      >
        <span className="text-[10px] font-bold tracking-[0.15em] text-white uppercase leading-none select-none">
          {label}
        </span>
      </div>
    </div>
  );
};

export default ComingSoonTag;
