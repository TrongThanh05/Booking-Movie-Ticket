/**
 * AppHeader.jsx — Topbar chính của Admin Dashboard
 *
 * Bao gồm:
 *   - Hamburger toggle (collapse sidebar)
 *   - ThemeToggleButton (dark/light)
 *   - NotificationDropdown (bell icon)
 *   - UserDropdown (avatar + profile)
 */
import { useSidebar } from '../context/SidebarContext';
import ThemeToggleButton from '../components/header/ThemeToggleButton';
import NotificationDropdown from '../components/header/NotificationDropdown';
import UserDropdown from '../components/header/UserDropdown';

const AppHeader = () => {
  const { toggleSidebar, isExpanded, isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-99 flex h-16 items-center border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        {/* ── Left: Hamburger ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
            {(!isMobile && !isExpanded) || isMobile ? (
              /* Menu icon (3 lines) */
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            ) : (
              /* Collapse icon (lines shrinking) */
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="18" y2="18" />
              </svg>
            )}
          </button>

          {/* Search bar (desktop only) */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="h-10 w-64 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400
                  focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
                  dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500
                  dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ── Right: Actions ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <ThemeToggleButton />
          <NotificationDropdown />
          <div className="mx-1.5 h-6 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
