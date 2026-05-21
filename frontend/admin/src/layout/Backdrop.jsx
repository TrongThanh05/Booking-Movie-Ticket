/**
 * Backdrop.jsx — Overlay khi sidebar mở trên mobile
 */
import { useSidebar } from '../context/SidebarContext';

const Backdrop = () => {
  const { isMobileOpen, setIsMobileOpen } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <div
      className="fixed inset-0 z-99 bg-gray-900/50 backdrop-blur-sm lg:hidden"
      onClick={() => setIsMobileOpen(false)}
      aria-hidden="true"
    />
  );
};

export default Backdrop;
