import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaExpandAlt, FaStar } from 'react-icons/fa';
import useProductsCatalog from '../../../hooks/useProductsCatalog';
import useActiveDiscounts from '../../../hooks/useActiveDiscounts';
import { applyDiscountsToProducts } from '../../../utils/discounts';
import { getPrimaryProductImage, handleImageError } from '../../../utils/helpers';

const pickUniqueProducts = (products, limit) => {
  const picked = [];
  const seen = new Set();

  products.forEach((product) => {
    if (picked.length >= limit) return;
    const key = String(product?.id || product?._id || '');
    if (!key || seen.has(key)) return;

    seen.add(key);
    picked.push(product);
  });

  return picked;
};

const getRatingClass = () => 'bg-[#facc15]';

const formatPkr = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

const ProductColumn = ({ title, products, accent }) => {
  return (
    <div className="rounded-xl border border-[#facc15]/20 bg-[#10151d] overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
        <h3 className="text-lg md:text-xl font-semibold text-slate-100">{title}</h3>
        <span className="h-1.5 w-12 rounded-full bg-[#facc15]" />
      </div>

      <div className="divide-y divide-white/10">
        {products.map((product) => {
          const rating = Number(product.rating) > 0 ? Number(product.rating) : 0;
          const salePrice = Number.isFinite(product.salePrice) ? product.salePrice : null;
          const price = Number(product.price ?? 0);

          return (
            <Link
              key={product.id}
              to={`/shop/product/${product.id}`}
              className="premium-product-card group flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors"
            >
              <div className="premium-product-frame relative w-28 h-20 shrink-0 rounded-md bg-[#0b0f14] border border-white/10 overflow-hidden flex items-center justify-center">
                <img
                  src={getPrimaryProductImage(product)}
                  alt={product.name}
                  loading="lazy"
                  onError={(event) => handleImageError(event, product.name)}
                  className="premium-product-image-cover"
                />
                    <FaExpandAlt className="absolute top-2 right-2 text-[#facc15]/80 opacity-0 group-hover:opacity-100 transition-opacity" size={12} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100 line-clamp-2 leading-snug">{product.name}</p>

                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <FaStar
                      key={`${product.id}-star-${index}`}
                      size={12}
                      className={index < Math.round(rating) ? 'text-[#facc15]' : 'text-slate-500'}
                    />
                  ))}
                  <span className="text-xs text-slate-400 ml-1">{product.reviewCount || product.popularity || 0} Reviews</span>
                </div>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold text-black ${getRatingClass(rating)}`}>
                    {title === 'Special Offers' ? 'SALE' : title === 'Top Rated Products' ? 'TOP' : 'HOT'}
                  </span>
                  <span className="text-base font-semibold text-slate-100">
                    {formatPkr(Number.isFinite(salePrice) ? salePrice : price)}
                  </span>
                  {Number.isFinite(salePrice) && salePrice < price && (
                    <span className="text-sm text-slate-500 line-through">{formatPkr(price)}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const BestSellers = () => {
  const { products: productsData } = useProductsCatalog();
  const { discounts } = useActiveDiscounts();

  const discountedProducts = useMemo(
    () => applyDiscountsToProducts(productsData, discounts),
    [productsData, discounts]
  );

  const productsBySection = useMemo(() => {
    const available = discountedProducts.filter((product) => Number(product.stockQty ?? product.stock ?? 0) > 0);

    const topRated = pickUniqueProducts(
      [...available].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0)),
      3
    );

    const specialOffers = pickUniqueProducts(
      [...available]
        .filter(
          (product) =>
            (Number.isFinite(product.salePrice) && Number(product.salePrice) < Number(product.price ?? 0)) ||
            Number(product.discountPercent ?? product.discount ?? 0) > 0
        )
        .sort((a, b) => {
          const discountA = Number(a.price ?? 0) - Number(a.salePrice ?? a.price ?? 0);
          const discountB = Number(b.price ?? 0) - Number(b.salePrice ?? b.price ?? 0);
          return discountB - discountA;
        }),
      3
    );

    const bestsellers = pickUniqueProducts(
      [...available].sort((a, b) => (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0)),
      3
    );

    const fallbackPool = pickUniqueProducts([...available], 9);

    return {
      topRated: topRated.length ? topRated : fallbackPool.slice(0, 3),
      specialOffers: specialOffers.length ? specialOffers : fallbackPool.slice(3, 6),
      bestsellers: bestsellers.length ? bestsellers : fallbackPool.slice(6, 9)
    };
  }, [discountedProducts]);

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-6">
          <ProductColumn title="Top Rated Products" accent="bg-[#facc15]" products={productsBySection.topRated} />
          <ProductColumn title="Special Offers" accent="bg-[#facc15]" products={productsBySection.specialOffers} />
          <ProductColumn title="Bestsellers" accent="bg-[#facc15]" products={productsBySection.bestsellers} />
        </div>
      </div>
    </section>
  );
};

export default BestSellers;