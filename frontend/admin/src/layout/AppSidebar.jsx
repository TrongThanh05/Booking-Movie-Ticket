import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../lib/useAuth';
import logoDark  from '../assets/logo_dark.png';
import logoLight from '../assets/logo_light.png';
import {
  GridIcon,
  VideoIcon,
  BoxCubeIcon,
  CalenderIcon,
  ListIcon,
  GroupIcon,
  DollarLineIcon,
  FoodIcon,
  ReviewIcon,
  PlugInIcon,
} from '../icons';

// ── Menu builder: thay đổi theo role ─────────────────────────────────────────
/**
 * Phân quyền hiển thị menu:
 *   admin           → tất cả, vào /admin/theaters (quản lý toàn bộ rạp)
 *   theater-manager → phim(xem), phòng(/admin/rooms), lịch chiếu, đơn hàng, đồ ăn, đánh giá
 *   staff           → lịch chiếu, đơn hàng, đồ ăn (chỉ xem, không sửa)
 */
const buildMenuSections = ({ isAdmin, isTheaterManager, isStaff }) => {
  const sections = [];

  // ── QUẢN LÝ CHÍNH ──────────────────────────────────────────────────────────
  const mainItems = [
    { label: 'Dashboard', icon: GridIcon, path: '/admin' },
  ];

  // Phim: admin & theater-manager xem được
  if (isAdmin || isTheaterManager) {
    mainItems.push({ label: 'Quản lý Phim', icon: VideoIcon, path: '/admin/movies' });
  }

  // Rạp & Phòng: admin → tất cả rạp; theater-manager/staff → phòng rạp mình
  if (isAdmin) {
    mainItems.push({ label: 'Cụm Rạp & Phòng', icon: BoxCubeIcon, path: '/admin/theaters' });
  } else {
    mainItems.push({ label: 'Danh sách phòng', icon: BoxCubeIcon, path: '/admin/rooms' });
  }

  // Lịch chiếu: tất cả có quyền xem
  mainItems.push({ label: 'Lịch Chiếu', icon: CalenderIcon, path: '/admin/shows' });

  sections.push({ title: 'QUẢN LÝ CHÍNH', items: mainItems });

  // ── VẬN HÀNH ───────────────────────────────────────────────────────────────
  const opsItems = [
    { label: 'Đơn đặt vé', icon: ListIcon, path: '/admin/bookings' },
    { label: 'Đồ ăn & Uống',  icon: FoodIcon, path: '/admin/foods' },
  ];

  // Đánh giá: admin và theater-manager
  if (isAdmin || isTheaterManager) {
    opsItems.push({ label: 'Đánh giá', icon: ReviewIcon, path: '/admin/reviews' });
  }

  // Người dùng + Khuyến mãi: chỉ admin
  if (isAdmin) {
    opsItems.push({ label: 'Người dùng', icon: GroupIcon,      path: '/admin/users' });
    opsItems.push({ label: 'Khuyến mãi', icon: DollarLineIcon, path: '/admin/vouchers' });
  }

  sections.push({ title: 'VẬN HÀNH', items: opsItems });

  // ── KHÁC ───────────────────────────────────────────────────────────────────
  if (isAdmin) {
    sections.push({ title: 'KHÁC', items: [{ label: 'Cài đặt', icon: PlugInIcon, path: '/admin/settings' }] });
  }

  return sections;
};



const AppSidebar = () => {
  const { isExpanded, isMobileOpen, isMobile, setIsMobileOpen } = useSidebar();
  const { isAdmin, isTheaterManager, isStaff } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const sidebarRef = useRef(null);

  // Xây menu động theo role mỗi lần render
  const menuSections = buildMenuSections({ isAdmin, isTheaterManager, isStaff });

  // Subtitle theo role
  const roleSubtitle = isAdmin ? 'Quản trị hệ thống'
    : isTheaterManager ? 'Quản lý rạp của tôi'
    : isStaff ? 'Nhân viên rạp'
    : 'Admin';

  // Đóng mobile sidebar khi navigate
  useEffect(() => {
    if (isMobile) setIsMobileOpen(false);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kiểm tra active state
  const isActive = useCallback(
    (path) => {
      if (path === '/admin') return location.pathname === '/admin';
      return location.pathname.startsWith(path);
    },
    [location.pathname],
  );


  // Sidebar visibility & width
  const sidebarClasses = isMobile
    ? `fixed top-0 left-0 z-999 h-full w-[280px] transition-transform duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : `fixed top-0 left-0 z-99 h-full transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-[280px]' : 'w-[90px]'
      }`;

  return (
    <aside
      ref={sidebarRef}
      className={`${sidebarClasses} flex flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900`}
    >
      {/* ── Logo ──────────────────────────────────────────────────────────────── */}
      {(isExpanded || isMobileOpen) ? (
        /* Expanded: logo ngang full-width + text bên dưới */
        <div className="flex flex-col items-start gap-1 border-b border-gray-200 px-4 pt-4 pb-3 dark:border-gray-800">
          <img
            className="w-full max-h-10 object-contain object-left"
            src={isDark ? logoDark : logoLight}
            alt="tcinebook"
          />
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              TCineAdmin
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {roleSubtitle}
            </p>
          </div>
        </div>
      ) : (
        /* Collapsed: chỉ hiện logo nhỏ căn giữa */
        <div className="flex h-16 items-center justify-center border-b border-gray-200 px-2 dark:border-gray-800">
          <img
            className="h-8 w-full object-contain"
            src={isDark ? logoDark : logoLight}
            alt="tcinebook"
          />
        </div>
      )}

      {/* ── Navigation Menu ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3">
        {menuSections.map((section, sIdx) => (
          <div key={sIdx} className="mb-6">
            {/* Section Title */}
            {(isExpanded || isMobileOpen) && (
              <h4 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.title}
              </h4>
            )}
            {!isExpanded && !isMobileOpen && sIdx > 0 && (
              <div className="mx-auto mb-3 h-px w-8 bg-gray-200 dark:bg-gray-800" />
            )}

            {/* Menu Items */}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path} className="group">
                    <Link
                      to={item.path}
                      className={`menu-item ${active ? 'menu-item-active' : 'menu-item-inactive'}
                        ${!isExpanded && !isMobileOpen ? 'justify-center px-0' : ''}`}
                      title={!isExpanded && !isMobileOpen ? item.label : undefined}
                    >
                      <span className={`menu-item-icon-size ${active ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`}>
                        <item.icon />
                      </span>
                      {(isExpanded || isMobileOpen) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      {(isExpanded || isMobileOpen) && (
        <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-800">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
            © 2025 CineAdmin v1.0
          </p>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
