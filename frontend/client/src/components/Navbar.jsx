import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import {
  Menu, Search, TicketCheck, X, Home, Film,
  MapPin, Calendar, Heart, User, LogIn, LogOut, ChevronDown, Shield,
  Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useDarkMode from '../hooks/useDarkMode';

const Navbar = () => {
  const [isOpen, setIsOpen]   = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isDark, toggleTheme] = useDarkMode();

  const { user, isAdmin, isLoggedIn, logout, openAuthModal } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setIsOpen(false); setDropdownOpen(false); }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems = [
    { name: 'Trang chủ', path: '/',         icon: Home     },
    { name: 'Phim',      path: '/movies',    icon: Film     },
    { name: 'Rạp chiếu', path: '/theaters',  icon: MapPin   },
    { name: 'Lịch chiếu',path: '/releases',  icon: Calendar },
    { name: 'Yêu thích', path: '/favorites', icon: Heart    },
  ];

  const handleLinkClick = () => { scrollTo(0, 0); setIsOpen(false); };
  const handleLogout    = () => { logout(); setDropdownOpen(false); navigate('/'); };

  // User avatar initials
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)} />
      )}

      <nav className={`fixed top-0 left-0 z-50 w-full transition-all duration-500 ${
        isScrolled
          ? 'bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-2xl'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* Logo – đổi theo theme */}
            <Link to="/" className="flex-shrink-0 group" onClick={() => scrollTo(0, 0)}>
              <img
                src={isDark ? assets.logo : assets.logoLight}
                alt="TCineBook"
                className="h-8 lg:h-10 w-auto transition-all duration-500 group-hover:scale-105"
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map(({ name, path, icon: Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link key={path} to={path} onClick={handleLinkClick}
                    className={`group relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl font-medium transition-all duration-300 text-sm lg:text-base ${
                      active
                        ? 'text-dark bg-red-500/20 border border-red-500/30'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {name}
                    {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />}
                  </Link>
                );
              })}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">

              {/* Theme toggle button – Sun khi đang dark, Moon khi đang light */}
              <button
                onClick={toggleTheme}
                title={isDark ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'}
                className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-300"
              >
                {isDark
                  ? <Sun  className="w-5 h-5 text-yellow-400 transition-transform duration-300 rotate-0 hover:rotate-12" />
                  : <Moon className="w-5 h-5 text-blue-400  transition-transform duration-300" />}
              </button>

              {/* Search button */}
              <button className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-300">
                <Search className="w-5 h-5" />
              </button>

              {/* ── Auth section ── */}
              {!isLoggedIn ? (
                <button onClick={() => openAuthModal('login')}
                  className="flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-full transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-red-500/25 cursor-pointer">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </button>
              ) : (
                /* User dropdown */
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen((p) => !p)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-white/10 transition-all duration-200 group">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/20 group-hover:ring-red-500/50 transition-all">
                      {initials}
                    </div>
                    <span className="hidden lg:block text-sm font-medium text-gray-300 max-w-[100px] truncate">
                      {user.name}
                    </span>
                    {isAdmin && (
                      <span className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl py-2 overflow-hidden animate-[menuIn_0.15s_ease-out] border ${
                      isDark
                        ? 'bg-gray-900/95 backdrop-blur-xl border-white/10'
                        : 'bg-white border-slate-200 shadow-slate-200/80'
                    }`}>
                      {/* User info */}
                      <div className={`px-4 py-3 border-b ${
                        isDark ? 'border-white/10' : 'border-slate-100'
                      }`}>
                        <p className={`font-semibold text-sm truncate ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>{user.name}</p>
                        <p className={`text-xs truncate ${
                          isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>{user.email}</p>
                      </div>

                      <DropdownItem isDark={isDark} icon={TicketCheck} label="Vé đã đặt" onClick={() => { navigate('/my-booking'); setDropdownOpen(false); }} />
                      <DropdownItem isDark={isDark} icon={User} label="Hồ sơ cá nhân" onClick={() => { navigate('/profile'); setDropdownOpen(false); }} />

                      {isAdmin && (
                        <DropdownItem isDark={isDark} icon={Shield} label="Quản trị" accent onClick={() => { navigate('/admin/dashboard'); setDropdownOpen(false); }} />
                      )}

                      <div className={`border-t mt-2 pt-2 ${
                        isDark ? 'border-white/10' : 'border-slate-100'
                      }`}>
                        <DropdownItem isDark={isDark} icon={LogOut} label="Đăng xuất" danger onClick={handleLogout} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile menu toggle */}
              <button onClick={() => setIsOpen((p) => !p)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-300">
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden absolute top-full left-0 right-0 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}>
          <div className={`backdrop-blur-xl border-t shadow-2xl ${
            isDark ? 'bg-black/95 border-white/10' : 'bg-white/98 border-slate-200'
          }`}>
            <div className="px-4 py-6 space-y-1">

              {/* Mobile search */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Tìm kiếm phim..."
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:border-red-500 transition-colors ${
                    isDark
                      ? 'bg-white/10 border-white/20 text-white placeholder-gray-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`} />
              </div>

              {navItems.map(({ name, path, icon: Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link key={path} to={path} onClick={handleLinkClick}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl font-medium transition-all duration-300 ${
                      active
                        ? 'text-red-700 bg-red-500/10 border border-red-500/20'
                        : isDark
                          ? 'text-gray-300 hover:text-white hover:bg-white/10'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-lg">{name}</span>
                    {active && <div className="ml-auto w-2 h-2 bg-red-500 rounded-full" />}
                  </Link>
                );
              })}

              {/* Mobile auth */}
              <div className={`pt-4 mt-4 border-t ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}>
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                      isDark ? 'bg-white/5' : 'bg-slate-50'
                    }`}>
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {initials}
                      </div>
                      <div>
                        <p className={`font-medium ${ isDark ? 'text-white' : 'text-slate-900' }`}>{user.name}</p>
                        <p className={`text-sm ${ isDark ? 'text-gray-400' : 'text-slate-500' }`}>{user.email}</p>
                      </div>
                    </div>
                    <MobileItem isDark={isDark} icon={TicketCheck} label="Vé đã đặt" onClick={() => { navigate('/my-booking'); setIsOpen(false); }} />
                    {isAdmin && <MobileItem isDark={isDark} icon={Shield} label="Quản trị" onClick={() => { navigate('/admin/dashboard'); setIsOpen(false); }} />}
                    <MobileItem isDark={isDark} icon={LogOut} label="Đăng xuất" danger onClick={() => { handleLogout(); setIsOpen(false); }} />
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => { openAuthModal('login'); setIsOpen(false); }}
                      className="flex-1 py-3 border border-red-500/50 text-red-400 font-medium rounded-xl hover:bg-red-500/10 transition-colors">
                      Đăng nhập
                    </button>
                    <button onClick={() => { openAuthModal('register'); setIsOpen(false); }}
                      className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors">
                      Đăng ký
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-16 lg:h-20" />

      <style>{`
        @keyframes menuIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
const DropdownItem = ({ icon: Icon, label, onClick, danger, accent, isDark }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
      danger
        ? isDark
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-red-600 hover:bg-red-50 hover:text-red-700'
        : accent
          ? isDark
            ? 'text-yellow-400 hover:bg-yellow-500/10'
            : 'text-yellow-700 hover:bg-yellow-50'
          : isDark
            ? 'text-gray-300 hover:text-white hover:bg-white/10'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
    }`}>
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const MobileItem = ({ icon: Icon, label, onClick, danger, isDark }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
      danger
        ? isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
        : isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
    }`}>
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

export default Navbar;