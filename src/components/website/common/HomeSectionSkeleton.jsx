import React from 'react';

const HomeSectionSkeleton = ({ count = 4 }) => {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="h-8 w-60 bg-gray-200 rounded animate-pulse mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
            <div className="h-28 bg-gray-200 rounded-md mb-4" />
            <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-3/5" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeSectionSkeleton;
