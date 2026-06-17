import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaHeart, FaRegHeart, FaStar } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import useProductsCatalog from '../../../hooks/useProductsCatalog';
import useActiveDiscounts from '../../../hooks/useActiveDiscounts';
import { applyDiscountsToProducts } from '../../../utils/discounts';
import { getPrimaryProductImage, handleImageError } from '../../../utils/helpers';

const normalizeCategoryKey = (value) => String(value || '').trim().toLowerCase();

const compareProductRecency = (a, b) => {
  const aDate = new Date(a?.createdAt || 0).getTime();
  const bDate = new Date(b?.createdAt || 0).getTime();

  if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) {
    return bDate - aDate;
  }

  return Number(b?.id || 0) - Number(a?.id || 0);
};

const takeCategoryDiverseProducts = (products, limit) => {
  const picked = [];
  const seenCategories = new Set();

  products.forEach((product) => {
    if (picked.length >= limit) return;

    const categoryKey = normalizeCategoryKey(product.category) || `product-${product.id}`;
    if (seenCategories.has(categoryKey)) return;

    seenCategories.add(categoryKey);
    picked.push(product);
  });

  if (picked.length >= limit) return picked.slice(0, limit);

  const remaining = products.filter((product) => !picked.some((item) => item.id === product.id));
  return [...picked, ...remaining].slice(0, limit);
};

const NewArrivals = () => {
  const navigate = useNavigate();
  const { products: productsData } = useProductsCatalog();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [addedState, setAddedState] = useState({});
  const { discounts } = useActiveDiscounts();

  const discountedProducts = useMemo(
    () => applyDiscountsToProducts(productsData, discounts),
    [productsData, discounts]
  );

  const newArrivalProducts = useMemo(() => {
    const availableProducts = discountedProducts
      .filter((product) => Number(product.stockQty ?? product.stock ?? 0) > 0)
      .sort(compareProductRecency);

    const flaggedNewArrivals = availableProducts.filter((product) => Boolean(product.isNewArrival));
    const baseList = flaggedNewArrivals.length
      ? [...flaggedNewArrivals, ...availableProducts.filter((product) => !product.isNewArrival)]
      : availableProducts;

    const list = takeCategoryDiverseProducts(baseList, 6);

    return list.map((product) => ({
      id: String(product.id),
      name: product.size ? `${product.name} - ${product.size}` : product.name,
      brand: product.company,
      category: product.category,
      price: Number(product.price ?? product.salePrice ?? 0),
      salePrice: Number.isFinite(product.salePrice) ? Number(product.salePrice) : null,
      rating: Number(product.rating) > 0 ? Number(product.rating) : null,
      stock: Number(product.stockQty ?? product.stock ?? 0),
      images: product.images || [],
      image: product.image || ''
    }));
  }, [discountedProducts]);

  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;
    addToCart(product, 1);
    setAddedState((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedState((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  const handleCardClick = (productId) => {
    navigate(`/shop/product/${productId}`);
  };

  return (
    <section id="new-arrivals-section" className="py-12 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">New Arrivals</h2>
          <Link to="/shop?new=true" className="text-sm text-secondary font-semibold hover:underline">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {newArrivalProducts.map((product) => {
            const inWishlist = isInWishlist(product.id);
            const isAdded = Boolean(addedState[product.id]);

            return (
              <motion.article
                key={product.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="premium-product-card group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md"
                onClick={() => handleCardClick(product.id)}
                role="link"
                tabIndex={0}
              >
                <div className="premium-product-frame relative h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {Number.isFinite(product.salePrice) && product.salePrice < product.price && (
                    <span className="absolute top-2 left-2 z-20 bg-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      SALE
                    </span>
                  )}
                  {/* category badge removed to avoid overlay on product images */}
                  <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        inWishlist ? removeFromWishlist(product.id) : addToWishlist(product);
                      }}
                      className="w-8 h-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-secondary"
                      aria-label="Toggle wishlist"
                    >
                      {inWishlist ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
                    </button>
                    <Link
                      to={`/shop/product/${product.id}`}
                      className="w-9 h-9 rounded-full bg-primary text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"
                      aria-label="Quick view"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <FaEye size={14} />
                    </Link>
                  </div>
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={getPrimaryProductImage(product)}
                      alt={product.name}
                      loading="lazy"
                      onError={(event) => handleImageError(event, product.name)}
                      className="premium-product-image-cover"
                    />
                  </div>
                </div>

                <div className="p-4 flex flex-col items-center text-center">
                  <h3 className="font-semibold text-gray-800 line-clamp-2 min-h-[3rem] text-center w-full">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 text-center w-full">{product.brand}</p>
                  {Number.isFinite(product.rating) && (
                    <div className="flex items-center justify-center gap-1 text-sm mt-2 w-full">
                      <FaStar className="text-yellow-500" size={13} />
                      <span className="font-medium text-gray-700">{product.rating.toFixed(1)}</span>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-center gap-2 w-full">
                    <span className="text-secondary font-bold text-lg">
                      PKR {(Number.isFinite(product.salePrice) ? product.salePrice : product.price).toLocaleString()}
                    </span>
                    {Number.isFinite(product.salePrice) && product.salePrice < product.price && (
                      <span className="text-gray-400 text-sm line-through">PKR {product.price.toLocaleString()}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAddToCart(product);
                    }}
                    disabled={product.stock <= 0}
                    className={`w-full mt-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                      product.stock <= 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isAdded
                          ? 'bg-green-600 text-white'
                          : 'bg-[#facc15] text-black hover:bg-[#eab308]'
                    }`}
                  >
                    {product.stock <= 0 ? 'Out of Stock' : isAdded ? 'Added' : 'Add to Cart'}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;