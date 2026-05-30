/**
 * SidebarContext.jsx — Sidebar collapse/expand state
 * Responsive: auto-collapse trên mobile, overlay mode
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const previousWidth = useRef(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const wasMobile = previousWidth.current < 1024;
      const nowMobile = w < 1024;

      if (!wasMobile && nowMobile) {
        setIsMobileOpen(false);
        setIsExpanded(false);
      }
      if (wasMobile && !nowMobile) {
        setIsExpanded(true);
        setIsMobileOpen(false);
      }
      setIsMobile(nowMobile);
      previousWidth.current = w;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsExpanded(prev => !prev);
    }
  }, [isMobile]);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen(prev => !prev);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        isMobileOpen,
        isMobile,
        toggleSidebar,
        toggleMobileSidebar,
        setIsExpanded,
        setIsMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used inside <SidebarProvider>');
  return ctx;
};

export default SidebarContext;
