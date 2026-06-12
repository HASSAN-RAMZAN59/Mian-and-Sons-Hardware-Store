import React from 'react';

const Loader = ({ size = 'md', fullPage = false, text = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
    xl: 'w-24 h-24 border-4'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} border-primary dark:border-blue-400 border-t-transparent rounded-full animate-spin`}></div>
      {text && (
        <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">{text}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-80 dark:bg-opacity-80">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loader;
