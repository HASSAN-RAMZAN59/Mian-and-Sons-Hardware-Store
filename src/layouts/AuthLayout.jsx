import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaMoon, FaSun } from 'react-icons/fa';

const AuthLayout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4 relative">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {theme === 'dark' ? (
          <FaSun className="text-yellow-500 text-xl" />
        ) : (
          <FaMoon className="text-gray-700 text-xl" />
        )}
      </button>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Mian & Sons Hardware
          </h1>
          <p className="text-white/80">Store Management System</p>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
