import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6 transition-colors">
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <p>© {currentYear} Mian & Sons Hardware Store | All Rights Reserved</p>
        <p className="hidden sm:block">Version 1.0.0</p>
      </div>
    </footer>
  );
};

export default Footer;
