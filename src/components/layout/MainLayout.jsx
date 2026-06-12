import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import { useTheme } from '../../context/ThemeContext';

const MainLayout = () => {
  const { theme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-close mobile sidebar on resize to desktop
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toggle sidebar collapse/expand
  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  // Close mobile sidebar when clicking overlay
  const closeMobileSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  // Calculate main content margin based on sidebar state
  const getMainContentMargin = () => {
    if (isMobile) return 'ml-0';
    return isSidebarCollapsed ? 'ml-20' : 'ml-64';
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        {/* Mobile Overlay */}
        {isMobile && isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={closeMobileSidebar}
          />
        )}

        {/* Sidebar - Desktop: Fixed, Mobile: Overlay Drawer */}
        <div
          className={`
            ${isMobile ? 'fixed' : 'fixed'} 
            ${isMobile ? (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
            ${isMobile ? 'z-50' : 'z-30'}
            transition-transform duration-300 ease-in-out
            h-screen
          `}
        >
          <Sidebar 
            isCollapsed={!isMobile && isSidebarCollapsed}
            onToggle={toggleSidebar}
          />
        </div>

        {/* Main Content Area */}
        <div 
          className={`
            flex flex-col flex-1 overflow-hidden
            ${getMainContentMargin()}
            transition-all duration-300 ease-in-out
          `}
        >
          {/* Navbar */}
          <Navbar onToggleSidebar={toggleSidebar} />

          {/* Main Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
            <div className="container mx-auto px-4 sm:px-6 py-6">
              <Outlet />
            </div>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
