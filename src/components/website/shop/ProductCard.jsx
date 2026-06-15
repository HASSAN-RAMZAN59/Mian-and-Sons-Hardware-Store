import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStar, FaBalanceScale, FaEye, FaHeart, FaRegHeart } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useCompare } from '../../../context/CompareContext';
import { useWishlist } from '../../../context/WishlistContext';
import { getPrimaryProductImage, handleImageError } from '../../../utils/helpers';

const ProductCard = ({ product, view = 'grid' }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  if (!product) return null;

  const hasRating = Number(product.rating) > 0;
  const ratingValue = hasRating ? Number(product.rating).toFixed(1) : null;

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    addToCart(product, 1);
  };

  const handleCompareToggle = () => {
    if (isInCompare(product.id)) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product);
    }
  };

  const handleWishlistToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleQuickViewClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleCardClick();
  };

  const handleCardClick = () => {
    const target = `/shop/product/${product.id}`;
    // Hard fallback for cases where SPA click handling is inconsistent.
    window.location.assign(target);
  };

  const stockLabel = product.stock <= 0 ? 'Out of Stock' : product.stock <= 5 ? 'Low Stock' : 'In Stock';
  const stockClasses =
    product.stock <= 0
      ? 'bg-red-100 text-red-600'
      : product.stock <= 5
        ? 'bg-orange-100 text-orange-600'
        : 'bg-green-100 text-green-600';

  const priceTextClass = product.stock > 0 ? 'text-yellow-400 dark:text-yellow-300' : 'text-secondary';

  if (view === 'list') {
    return (
      <article
        className="premium-product-card group bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 cursor-pointer overflow-hidden"
        onClick={handleCardClick}
        role="link"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
          }
        }}
      >
        <div className="flex flex-1 flex-col sm:flex-row gap-4 min-w-0">
          <div className="premium-product-frame relative w-full sm:w-36 h-32 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            <img
              src={getPrimaryProductImage(product)}
              alt={product.name}
              loading="lazy"
              onError={(event) => handleImageError(event, product.name)}
              className="premium-product-image-cover"
            />
            <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleWishlistToggle}
                className="w-8 h-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-secondary"
                aria-label="Toggle wishlist"
              >
                {isInWishlist(product.id) ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
              </button>
              <button
                type="button"
                onClick={handleQuickViewClick}
                className="w-8 h-8 rounded-full bg-primary text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"
                aria-label="View details"
              >
                <FaEye size={13} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {product.salePrice && product.salePrice < product.price && (
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">SALE</span>
              )}
            </div>
            <h3 className="font-semibold text-primary text-lg line-clamp-2">{product.name}</h3>
            <p className="text-sm text-gray-500">{product.brand}</p>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>

            {hasRating && (
              <div className="flex items-center gap-1 text-sm mt-2">
                <FaStar className="text-yellow-500" size={13} />
                <span>{ratingValue}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <div className="flex items-center gap-2">
                <span className={`${priceTextClass} font-bold text-lg`}>PKR {Number(product.salePrice ?? product.price ?? 0).toLocaleString()}</span>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stockClasses}`}>{stockLabel}</span>
            </div>
          </div>
        </div>
        <div className="sm:w-32 flex sm:flex-col gap-2 sm:justify-center">
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={(event) => {
              event.stopPropagation();
              handleAddToCart();
            }}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-sm font-semibold ${
              product.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#facc15] text-black hover:bg-[#eab308]'
            }`}
          >
            Add to Cart
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleCompareToggle();
            }}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-sm font-semibold border transition-all ${
              isInCompare(product.id)
                ? 'border-[#facc15] bg-[#facc15]/10 text-yellow-600 font-bold'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isInCompare(product.id) ? 'Remove Compare' : 'Compare'}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleCardClick();
            }}
            className="flex-1 sm:flex-none px-3 py-2 rounded-md text-sm font-semibold border border-primary text-primary hover:bg-primary hover:text-white text-center"
          >
            View
          </button>
        </div>
      </article>
    );
  }

  return (
      <article
        className="premium-product-card group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
        role="link"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
          }
        }}
      >
      <div className="block">
        <div className="premium-product-frame h-[200px] bg-gray-100 relative rounded-t-lg overflow-hidden">
          {product.salePrice && product.salePrice < product.price && (
            <span className="absolute top-2 left-2 z-20 bg-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
              SALE
            </span>
          )}
          <img
            src={getPrimaryProductImage(product)}
            alt={product.name}
            loading="lazy"
            onError={(event) => handleImageError(event, product.name)}
            className="premium-product-image-cover"
          />
          <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="w-8 h-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-secondary"
              aria-label="Toggle wishlist"
            >
              {isInWishlist(product.id) ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
            </button>
            <button
              type="button"
              onClick={handleQuickViewClick}
              className="w-9 h-9 rounded-full bg-primary text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"
              aria-label="View details"
            >
              <FaEye size={14} />
            </button>
          </div>
          {/* category label intentionally removed to avoid overlap on product cards */}
        </div>
        <div className="p-4 flex flex-col items-center text-center">
          <h3 className="font-semibold text-primary line-clamp-2 min-h-[3rem] text-center w-full px-1">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-1 text-center w-full">{product.brand}</p>
          
          <div className="mt-2 flex items-center justify-center w-full">
            <span className={`${priceTextClass} font-bold text-lg`}>PKR {Number(product.salePrice ?? product.price ?? 0).toLocaleString()}</span>
          </div>

          <div className="mt-2 flex justify-center w-full">
            <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${stockClasses}`}>{stockLabel}</span>
          </div>

          {hasRating && (
            <div className="flex items-center justify-center gap-1 text-sm mt-2 w-full">
              <FaStar className="text-yellow-500" size={13} />
              <span>{ratingValue}</span>
            </div>
          )}

          {/* Add to Cart & Compare Buttons centered inside the padding area */}
          <div className="mt-4 flex gap-2 w-full">
            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={(event) => {
                event.stopPropagation();
                handleAddToCart();
              }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                product.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#facc15] text-black hover:bg-[#eab308]'
              }`}
            >
              Add to Cart
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleCompareToggle();
              }}
              className={`px-3 py-2 rounded-md border flex items-center justify-center transition-all ${
                isInCompare(product.id)
                  ? 'border-[#facc15] bg-[#facc15]/10 text-yellow-600'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700'
              }`}
              title={isInCompare(product.id) ? 'Remove from compare' : 'Add to compare'}
            >
              <FaBalanceScale size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;