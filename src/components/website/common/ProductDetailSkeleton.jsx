import React from 'react';

const ProductDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-4 w-56 bg-gray-200 rounded mb-6" />
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-xl border border-gray-200 bg-white p-4">
          <div className="h-96 bg-gray-200 rounded-lg mb-3" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-14 bg-gray-200 rounded-md" />
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-gray-200 bg-white p-5">
          <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-1/2 bg-gray-200 rounded mb-4" />
          <div className="h-10 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-20 w-full bg-gray-200 rounded mb-4" />
          <div className="h-10 w-full bg-gray-200 rounded mb-3" />
          <div className="h-10 w-full bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
};

export default ProductDetailSkeleton;
