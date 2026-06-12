import React from 'react';
import { FaInbox, FaPlus } from 'react-icons/fa';

const EmptyState = ({ 
  icon: Icon = FaInbox,
  title = 'No Data Available', 
  message = 'There are no items to display at the moment.',
  actionLabel,
  onAction,
  emoji
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {emoji ? (
        <div className="text-6xl mb-4">{emoji}</div>
      ) : (
        <Icon className="text-6xl text-gray-400 dark:text-gray-600 mb-4" />
      )}
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <FaPlus className="mr-2" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
