import React from 'react';

const TableSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="animate-pulse">
      <table className="min-w-full">
        <thead>
          <tr>
            {[...Array(columns)].map((_, index) => (
              <th key={index} className="px-6 py-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-700">
              {[...Array(columns)].map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;
