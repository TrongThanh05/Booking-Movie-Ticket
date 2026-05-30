import React from 'react';

/**
 * NewReleaseTag – Ribbon chéo góc trên-phải kiểu "quấn qua góc".
 *
 * Kỹ thuật:
 *  1. Outer div (w-[88px] h-[88px], overflow-hidden) ghim chặt vào góc card.
 *  2. Inner div xoay 45°, clip-path polygon tạo hình bình hành → 2 đầu bị
 *     cắt chéo 45° sắc nét, tạo cảm giác dải ruy băng "khuyết" vào poster.
 *
 * Props:
 *  - label : string  – Nội dung (mặc định 'PHIM MỚI')
 *  - show  : boolean – Bật/tắt tag
 *
 * Yêu cầu: card cha phải có class `relative`.
 */
const NewReleaseTag = ({ label = 'PHIM MỚI', show = true }) => {
  if (!show) return null;

  return (
    /* Outer container ghim ở góc, overflow-hidden cắt phần thừa ra ngoài */
    <div
      aria-label={label}
      className="absolute top-0 right-0 w-[88px] h-[88px] overflow-hidden pointer-events-none z-10"
    >
      {/*
       * Inner ribbon:
       * - rotate(45deg): xoay dải băng theo đường chéo góc
       * - clip-path polygon: hình bình hành (4 góc lệch nhau ~12px)
       *   → khi kết hợp rotate(45deg), 2 đầu xuất hiện là đường cắt thẳng đứng
       *     trong khung card, tạo hiệu ứng ribbon "khuyết" hoàn toàn vào góc
       */}
      <div
        className="absolute flex items-center justify-center bg-red-700 shadow-lg"
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

export default NewReleaseTag;
