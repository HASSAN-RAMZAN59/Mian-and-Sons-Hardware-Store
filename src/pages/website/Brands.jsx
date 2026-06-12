import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useProductsCatalog from '../../hooks/useProductsCatalog';

const alphabet = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

const Brands = () => {
  const { products: productsData } = useProductsCatalog();
  const [activeLetter, setActiveLetter] = useState('All');

  const brandData = useMemo(() => {
    const brandCounts = new Map();

    productsData.forEach((product) => {
      const brand = product.brand || product.company || 'Unknown';
      const stockValue = Number(product.stockQty ?? product.stock ?? product.currentStock ?? 0);

      if (stockValue <= 0) return;

      brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
    });

    return Array.from(brandCounts.entries())
      .map(([name, productCount]) => ({ name, productCount }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [productsData]);

  const featuredBrands = useMemo(() => {
    return [...brandData].sort((first, second) => second.productCount - first.productCount).slice(0, 6);
  }, [brandData]);

  const filteredBrands = useMemo(() => {
    if (activeLetter === 'All') return brandData;
    return brandData.filter((brand) => brand.name.toUpperCase().startsWith(activeLetter));
  }, [activeLetter, brandData]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">Our Trusted Brands</h1>
          <p className="text-gray-600 mt-2">Explore all partner brands and browse products by brand name.</p>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">Featured Brands</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredBrands.map((brand) => (
              <Link
                key={brand.name}
                to={`/shop?brand=${encodeURIComponent(brand.name)}`}
                className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-2xl font-bold text-primary group-hover:text-secondary transition-colors">{brand.name}</p>
                <p className="mt-2 text-sm text-gray-600">{brand.productCount} products</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-primary mb-3">Filter by Alphabet</h2>
          <div className="flex flex-wrap gap-2">
            {alphabet.map((letter) => {
              const isActive = activeLetter === letter;

              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setActiveLetter(letter)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-secondary hover:text-secondary'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-primary">All Brands</h2>
            <p className="text-sm text-gray-600">{filteredBrands.length} brands</p>
          </div>

          {filteredBrands.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
              No brands found for this alphabet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredBrands.map((brand) => (
                <Link
                  key={brand.name}
                  to={`/shop?brand=${encodeURIComponent(brand.name)}`}
                  className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-secondary/30 transition-all"
                >
                  <p className="text-lg font-semibold text-primary group-hover:text-secondary transition-colors">{brand.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{brand.productCount} products</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Brands;