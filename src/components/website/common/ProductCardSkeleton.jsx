import React from 'react';

const ProductCardSkeleton = ({ count = 6, list = false }) => {
  return (
    <div className={list ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`rounded-xl border border-gray-200 bg-white p-4 animate-pulse ${list ? 'flex gap-4 items-start' : ''}`}>
          <div className={`${list ? 'w-24 h-24' : 'h-32 w-full'} bg-gray-200 rounded-md shrink-0`} />
          <div className="flex-1 w-full">
            <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-3/5 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-2/5 mb-4" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductCardSkeleton;
