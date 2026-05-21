/**
 * AppLayout.jsx — Layout chính của Admin Dashboard
 *
 * Cấu trúc:
 *   ┌─────────┬──────────────────────────────┐
 *   │         │         AppHeader             │
 *   │ Sidebar ├──────────────────────────────│
 *   │         │       Main Content            │
 *   │         │       (<Outlet />)            │
 *   └─────────┴──────────────────────────────┘
 */
import { Outlet } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import Backdrop from './Backdrop';

const LayoutContent = () => {
  const { isExpanded, isMobile } = useSidebar();

  // Content margin-left tuỳ thuộc sidebar state
  const contentMargin = isMobile
    ? 'ml-0'
    : isExpanded
      ? 'ml-[280px]'
      : 'ml-[90px]';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <AppSidebar />

      {/* Backdrop (mobile only) */}
      <Backdrop />

      {/* Main wrapper */}
      <div className={`flex flex-col transition-all duration-300 ease-in-out ${contentMargin}`}>
        {/* Header */}
        <AppHeader />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppLayout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
