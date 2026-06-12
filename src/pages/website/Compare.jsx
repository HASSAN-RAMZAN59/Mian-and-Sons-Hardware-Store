import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaTimes, FaTrash } from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { getPrimaryProductImage, handleImageError } from '../../utils/helpers';

const parseWarrantyMonths = (warranty) => {
  if (!warranty) return 0;
  const text = String(warranty).toLowerCase();
  const monthMatch = text.match(/(\d+)\s*month/);
  const yearMatch = text.match(/(\d+)\s*year/);

  if (monthMatch) return Number(monthMatch[1]) || 0;
  if (yearMatch) return (Number(yearMatch[1]) || 0) * 12;
  return 0;
};

const Compare = () => {
  const { addToCart } = useCart();
  const { compareItems, removeFromCompare, clearCompare } = useCompare();

  const best = useMemo(() => {
    if (!compareItems.length) return null;

    let minPrice = Infinity;
    let maxRating = -Infinity;
    let maxStock = -Infinity;
    let maxWarranty = -Infinity;

    compareItems.forEach((item) => {
      if (item.price < minPrice) minPrice = item.price;
      if (item.rating > maxRating) maxRating = item.rating;
      if (item.stock > maxStock) maxStock = item.stock;
      const warrantyMonths = parseWarrantyMonths(item.warranty);
      if (warrantyMonths > maxWarranty) maxWarranty = warrantyMonths;
    });

    return {
      minPrice,
      maxRating,
      maxStock,
      maxWarranty
    };
  }, [compareItems]);

  const renderCellClass = (isBest) =>
    `p-3 border-b border-gray-200 text-sm ${isBest ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'}`;

  if (compareItems.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Compare Products</h1>
          <p className="text-gray-500 mb-6">No products added to compare yet.</p>
          <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-secondary text-white font-semibold hover:opacity-90">
            <FaPlus size={12} />
            Add product to compare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Product Comparison</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCompare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-500 text-red-500 text-sm font-semibold hover:bg-red-500 hover:text-white transition-colors"
          >
            <FaTrash size={11} />
            Clear Comparison
          </button>
          <Link to="/shop" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-white transition-colors">
            <FaPlus size={11} />
            Add product to compare
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
        <div className="min-w-[860px]">
          <div className="grid" style={{ gridTemplateColumns: `180px repeat(4, minmax(0, 1fr))` }}>
            <div className="p-3 border-b border-gray-200 font-semibold text-primary bg-gray-50">Attribute</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];

              return (
                <div key={item?.id || `empty-${index}`} className="p-3 border-b border-gray-200 bg-gray-50">
                  {item ? (
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-primary line-clamp-2">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCompare(item.id)}
                        className="w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"
                        aria-label="Remove product"
                      >
                        <FaTimes size={11} />
                      </button>
                    </div>
                  ) : (
                    <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-primary font-semibold">
                      <FaPlus size={11} /> Add product to compare
                    </Link>
                  )}
                </div>
              );
            })}

            <div className="p-3 border-b border-gray-200 font-medium text-gray-700">Image</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              return (
                <div key={`img-${item?.id || index}`} className="p-3 border-b border-gray-200">
                  {item ? (
                    <div className="premium-product-frame h-24 rounded-md bg-gray-100 overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center bg-white">
                        <img
                          src={item.image || getPrimaryProductImage(item)}
                          alt={item.name}
                          loading="lazy"
                          onError={(event) => handleImageError(event, item.name)}
                          className="premium-product-image"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">Empty Slot</div>
                  )}
                </div>
              );
            })}

            <div className="p-3 border-b border-gray-200 font-medium text-gray-700">Name</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              return <div key={`name-${item?.id || index}`} className="p-3 border-b border-gray-200 text-sm text-gray-700">{item?.name || '-'}</div>;
            })}

            <div className="p-3 border-b border-gray-200 font-medium text-gray-700">Price</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              const isBest = item && best && item.price === best.minPrice;
              return (
                <div key={`price-${item?.id || index}`} className={renderCellClass(isBest)}>
                  {item ? `Rs. ${item.price.toLocaleString()}` : '-'}
                </div>
              );
            })}

            <div className="p-3 border-b border-gray-200 font-medium text-gray-700">Brand</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              return <div key={`brand-${item?.id || index}`} className="p-3 border-b border-gray-200 text-sm text-gray-700">{item?.brand || '-'}</div>;
            })}

            <div className="p-3 border-b border-gray-200 font-medium text-gray-700">Category</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              return <div key={`cat-${item?.id || index}`} className="p-3 border-b border-gray-200 text-sm text-gray-700">{item?.category || '-'}</div>;
            })}

            <div className="p-3 border-b border-gray-200 font-medium text-gray-700">Rating</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              const isBest = item && best && Number.isFinite(item.rating) && item.rating === best.maxRating;
              return (
                <div key={`rating-${item?.id || index}`} className={renderCellClass(isBest)}>
                  {item && Number.isFinite(item.rating) ? `${item.rating.toFixed(1)} ⭐` : '-'}
                </div>
              );
            })}

            <div className="p-3 border-b border-gray-200 font-medium text-gray-700">Stock</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              const isBest = item && best && item.stock === best.maxStock;
              return (
                <div key={`stock-${item?.id || index}`} className={renderCellClass(isBest)}>
                  {item ? (item.stock > 0 ? `${item.stock} available` : 'Out of stock') : '-'}
                </div>
              );
            })}

            <div className="p-3 border-b border-gray-200 font-medium text-gray-700">Warranty</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              const isBest = item && best && parseWarrantyMonths(item.warranty) === best.maxWarranty;
              return (
                <div key={`warranty-${item?.id || index}`} className={renderCellClass(isBest)}>
                  {item?.warranty || '-'}
                </div>
              );
            })}

            <div className="p-3 font-medium text-gray-700">Actions</div>
            {Array.from({ length: 4 }, (_, index) => {
              const item = compareItems[index];
              return (
                <div key={`action-${item?.id || index}`} className="p-3">
                  {item ? (
                    <button
                      type="button"
                      onClick={() => addToCart(item, 1)}
                      disabled={item.stock <= 0}
                      className={`w-full py-2 rounded-md text-sm font-semibold ${
                        item.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#facc15] text-black hover:bg-[#eab308]'
                      }`}
                    >
                      Add to Cart
                    </button>
                  ) : (
                    <Link to="/shop" className="block w-full text-center py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                      Add product
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compare;