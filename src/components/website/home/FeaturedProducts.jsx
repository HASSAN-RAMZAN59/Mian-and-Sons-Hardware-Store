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

const tabs = ['All', 'New Arrivals'];

const FeaturedProducts = ({ products }) => {
  const navigate = useNavigate();
  const { products: apiProducts } = useProductsCatalog();
  const mergedProducts = Array.isArray(products) ? products : apiProducts;
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { discounts } = useActiveDiscounts();

  const discountedProducts = useMemo(
    () => applyDiscountsToProducts(mergedProducts, discounts),
    [mergedProducts, discounts]
  );

  const [activeTab, setActiveTab] = useState('All');
  const [addedState, setAddedState] = useState({});

  const scrollToNewArrivals = () => {
    const section = document.getElementById('new-arrivals-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };



  const normalizedProducts = useMemo(
    () => discountedProducts.map((product) => ({
      id: String(product.id),
      name: product.size ? `${product.name} - ${product.size}` : product.name,
      brand: product.company,
      category: product.category,
      price: Number(product.price ?? product.salePrice ?? 0),
      salePrice: Number.isFinite(product.salePrice) ? Number(product.salePrice) : null,
      discountPercent: Number(product.discountPercent ?? product.discount ?? 0),
      rating: Number(product.rating) > 0 ? Number(product.rating) : null,
      popularity: Number(product.reviewCount) || 0,
      stock: Number(product.stockQty ?? product.stock ?? 0),
      isNewArrival: Boolean(product.isNewArrival),
      isFeatured: Boolean(product.isFeatured),
      onSale: (Number.isFinite(product.salePrice) && product.salePrice < (product.price ?? 0)) || Number(product.discountPercent ?? product.discount ?? 0) > 0,
      topRated: Number(product.rating) >= 4.2,
      images: product.images || [],
      image: product.image || ''
    })),
    [discountedProducts]
  );

  const filteredProducts = useMemo(() => {
    if (activeTab === 'All') return normalizedProducts;
    if (activeTab === 'New Arrivals') {
      return normalizedProducts;
    }
    return normalizedProducts;
  }, [activeTab, normalizedProducts]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, 16), [filteredProducts]);

  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;

    addToCart(product, 1);
    setAddedState((prev) => ({ ...prev, [product.id]: true }));

    setTimeout(() => {
      setAddedState((prev) => ({ ...prev, [product.id]: false }));
    }, 1400);
  };

  const handleCardClick = (productId) => {
    navigate(`/shop/product/${productId}`);
  };

  const getStockBadge = (stock) => {
    if (stock <= 0) return { label: 'Out of Stock', classes: 'bg-red-100 text-red-600' };
    if (stock <= 5) return { label: 'Low Stock', classes: 'bg-orange-100 text-orange-600' };
    return { label: 'In Stock', classes: 'bg-green-100 text-green-600' };
  };

  const formatPkr = (value) => `PKR ${value.toLocaleString()}`;

  return (
    <section id="featured-products-section" className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Featured Products</h2>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'New Arrivals') {
                    window.setTimeout(scrollToNewArrivals, 0);
                  }
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {visibleProducts.map((product) => {
            const stockBadge = getStockBadge(product.stock);
            const inWishlist = isInWishlist(product.id);
            const isAdded = Boolean(addedState[product.id]);

            return (
              <motion.article
                key={product.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="premium-product-card group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                onClick={() => handleCardClick(product.id)}
                role="link"
                tabIndex={0}
              >
                <div className="premium-product-frame relative h-44 bg-gray-100 flex items-center justify-center overflow-hidden">

                  {product.onSale && (
                    <span className="absolute top-2 left-2 z-20 bg-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      SALE
                    </span>
                  )}
                  {/* category label removed to prevent overlap on product cards */}

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

                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 line-clamp-2 min-h-[3rem]">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{product.brand}</p>

                  {Number.isFinite(product.rating) && (
                    <div className="flex items-center gap-1 text-sm mt-2">
                      <FaStar className="text-yellow-500" size={13} />
                      <span className="font-medium text-gray-700">{product.rating.toFixed(1)}</span>
                      <span className="text-gray-400">⭐</span>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-secondary font-bold text-lg">
                      {formatPkr(Number.isFinite(product.salePrice) ? product.salePrice : product.price)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${stockBadge.classes}`}>
                      {stockBadge.label}
                    </span>
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

export default FeaturedProducts;