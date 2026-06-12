import React from 'react';
import Loader from './Loader';
import Pagination from './Pagination';

const Table = ({ 
  columns, 
  data = [], 
  loading = false, 
  onRowClick,
  pagination,
  emptyMessage = 'No data available'
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`${
                    onRowClick 
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors' 
                      : ''
                  }`}
                >
                  {columns.map((column, colIndex) => (
                    <td 
                      key={column.key || colIndex} 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                    >
                      {column.render ? column.render(row, rowIndex, colIndex) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {pagination && data.length > 0 && (
        <div className="mt-4">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
};

export default Table;
