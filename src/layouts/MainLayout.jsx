import React, { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import ScrollToTop from '../components/common/ScrollToTop';

const MainLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen((prev) => !prev);
      return;
    }
    setIsSidebarCollapsed((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  const getMainContentMargin = () => {
    if (isMobile) return 'ml-0';
    return isSidebarCollapsed ? 'ml-20' : 'ml-64';
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={closeMobileSidebar}
        />
      )}

      <div
        className={`
          fixed
          ${isMobile ? (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
          ${isMobile ? 'z-50' : 'z-30'}
          transition-transform duration-300 ease-in-out
          h-screen
        `}
      >
        <Sidebar isCollapsed={!isMobile && isSidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      <div className={`flex-1 flex flex-col overflow-hidden ${getMainContentMargin()} transition-all duration-300 ease-in-out`}>
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8 page-transition">
            {children}
          </div>
        </main>
      </div>
      <ScrollToTop />
    </div>
  );
};

export default MainLayout;
