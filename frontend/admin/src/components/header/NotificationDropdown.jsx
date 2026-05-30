/**
 * NotificationDropdown.jsx — Bell icon + cinema-themed notifications
 */
import { useState } from 'react';
import { Dropdown } from '../ui/dropdown/Dropdown';

const NOTIFICATIONS = [
  {
    id: 1,
    type: 'booking',
    title: 'Đặt vé mới',
    message: 'Nguyễn Văn A vừa đặt 3 vé xem "Avengers: Endgame"',
    time: '2 phút trước',
    read: false,
    icon: '🎟️',
    color: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15',
  },
  {
    id: 2,
    type: 'revenue',
    title: 'Doanh thu cao',
    message: 'Doanh thu hôm nay đã vượt 50 triệu VNĐ!',
    time: '15 phút trước',
    read: false,
    icon: '💰',
    color: 'bg-success-50 text-success-500 dark:bg-success-500/15',
  },
  {
    id: 3,
    type: 'sold_out',
    title: 'Suất chiếu hết vé',
    message: '"Doraemon Movie" suất 19:00 tại CGV Vincom đã sold-out!',
    time: '1 giờ trước',
    read: false,
    icon: '🔥',
    color: 'bg-error-50 text-error-500 dark:bg-error-500/15',
  },
  {
    id: 4,
    type: 'new_movie',
    title: 'Phim mới thêm',
    message: 'Phim "Spider-Man: Beyond" đã được thêm vào hệ thống',
    time: '3 giờ trước',
    read: true,
    icon: '🎬',
    color: 'bg-warning-50 text-warning-500 dark:bg-warning-500/15',
  },
  {
    id: 5,
    type: 'user',
    title: 'Người dùng mới',
    message: '12 tài khoản mới đăng ký hôm nay',
    time: '5 giờ trước',
    read: true,
    icon: '👥',
    color: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15',
  },
];

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-80">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Thông báo
          </h5>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Đánh dấu đã đọc
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[.02] cursor-pointer
                ${!n.read ? 'bg-brand-25 dark:bg-brand-500/5' : ''}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${n.color}`}>
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                  {n.message}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  {n.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 px-4 py-2.5 dark:border-gray-800">
          <button className="w-full text-center text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
            Xem tất cả thông báo
          </button>
        </div>
      </Dropdown>
    </div>
  );
};

export default NotificationDropdown;
