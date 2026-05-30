/**
 * UserDropdown.jsx — Admin avatar + dropdown (Profile, Settings, Logout)
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dropdown } from '../ui/dropdown/Dropdown';
import { DropdownItem } from '../ui/dropdown/DropdownItem';
import { useAuth } from '../../lib/useAuth';

const UserDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-full p-1 pr-3 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
      >
        {/* Avatar */}
        {user?.avatar ? (
          <img src={user.avatar} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
            {initials}
          </div>
        )}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate max-w-[120px]">
            {user?.name || 'Admin'}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Quản trị viên
          </p>
        </div>
        {/* Chevron */}
        <svg className="hidden md:block h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-56 p-2">
        {/* User info */}
        <div className="mb-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-white/5">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {user?.name || 'Admin'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user?.email || 'admin@cineadmin.vn'}
          </p>
        </div>

        <DropdownItem onClick={() => { setIsOpen(false); }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Hồ sơ cá nhân
        </DropdownItem>

        <Link to="/admin/settings" onClick={() => setIsOpen(false)}>
          <DropdownItem>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Cài đặt
          </DropdownItem>
        </Link>

        <div className="my-1 h-px bg-gray-200 dark:bg-gray-800" />

        <DropdownItem onClick={handleLogout} danger>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Đăng xuất
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

export default UserDropdown;
