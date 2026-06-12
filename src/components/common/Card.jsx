import React from 'react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const Card = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue', 
  trend,
  children, 
  className = '', 
  actions 
}) => {
  // Stats card variant
  if (value !== undefined) {
    const colorClasses = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      red: 'text-red-600 dark:text-red-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      purple: 'text-purple-600 dark:text-purple-400',
      orange: 'text-orange-600 dark:text-orange-400'
    };

    const bgClasses = {
      blue: 'bg-blue-50 dark:bg-blue-900/20',
      green: 'bg-green-50 dark:bg-green-900/20',
      red: 'bg-red-50 dark:bg-red-900/20',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
      purple: 'bg-purple-50 dark:bg-purple-900/20',
      orange: 'bg-orange-50 dark:bg-orange-900/20'
    };

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                {trend > 0 ? (
                  <FaArrowUp className="text-green-500 mr-1" size={12} />
                ) : (
                  <FaArrowDown className="text-red-500 mr-1" size={12} />
                )}
                <span className={`text-sm font-medium ${
                  trend > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {Math.abs(trend)}%
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  vs last month
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={`flex items-center justify-center ${bgClasses[color]} w-14 h-14 rounded-lg`}> 
              <Icon className={`${colorClasses[color]} text-2xl`} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular card variant
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;
