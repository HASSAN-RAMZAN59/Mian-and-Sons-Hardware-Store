import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';
import CountdownTimer from '../common/CountdownTimer';
import { useCart } from '../../../context/CartContext';
import useProductsCatalog from '../../../hooks/useProductsCatalog';
import useActiveDiscounts from '../../../hooks/useActiveDiscounts';
import { applyDiscountsToProducts } from '../../../utils/discounts';
import { getPrimaryProductImage, handleImageError } from '../../../utils/helpers';

const getOfferDeadline = (hours = 0, minutes = 0, seconds = 0) => {
  const target = new Date();
  target.setHours(target.getHours() + hours);
  target.setMinutes(target.getMinutes() + minutes);
  target.setSeconds(target.getSeconds() + seconds);
  return target;
};

const SpecialOffers = () => {
  const navigate = useNavigate();
  const { products: productsData } = useProductsCatalog();
  const { addToCart } = useCart();
  const { discounts } = useActiveDiscounts();

  const discountedProducts = useMemo(
    () => applyDiscountsToProducts(productsData, discounts),
    [productsData, discounts]
  );

  const offerProducts = useMemo(() => {
    return discountedProducts
      .filter((product) => Number(product.stockQty ?? product.stock ?? 0) > 0)
      .filter(
        (product) =>
          (Number.isFinite(product.salePrice) && Number(product.salePrice) < Number(product.price ?? 0)) ||
          Number(product.discountPercent ?? product.discount ?? 0) > 0
      )
      .sort((a, b) => {
        const discountA = Number(a.price ?? 0) - Number(a.salePrice ?? a.price ?? 0);
        const discountB = Number(b.price ?? 0) - Number(b.salePrice ?? b.price ?? 0);
        return discountB - discountA;
      });
  }, [discountedProducts]);

  const dealOfDay = useMemo(() => {
    const firstOffer = offerProducts[0];
    if (!firstOffer) return null;

    const basePrice = Number(firstOffer.price ?? firstOffer.salePrice ?? 0);
    const salePrice = Number.isFinite(firstOffer.salePrice) ? Number(firstOffer.salePrice) : basePrice;
    const stock = Number(firstOffer.stockQty ?? firstOffer.currentStock ?? firstOffer.stock ?? 0);

    return {
      id: String(firstOffer.id || firstOffer._id),
      name: firstOffer.size ? `${firstOffer.name} - ${firstOffer.size}` : firstOffer.name,
      category: firstOffer.category,
      price: basePrice,
      salePrice,
      rating: Number(firstOffer.rating) > 0 ? Number(firstOffer.rating) : null,
      stock,
      sold: 0,
      totalStock: Math.max(stock, 1),
      endAfterHours: 2,
      endAfterMinutes: 45,
      endAfterSeconds: 30,
      description: firstOffer.description,
      images: firstOffer.images || [],
      image: firstOffer.image || ''
    };
  }, [discountedProducts]);

  const sideOffers = useMemo(() => {
    return offerProducts
      .slice(1, 3)
      .filter(Boolean)
      .map((item, index) => ({
        id: String(item.id || item._id),
        name: item.size ? `${item.name} - ${item.size}` : item.name,
        category: item.category,
        price: Number(item.price ?? item.salePrice ?? 0),
        salePrice: Number.isFinite(item.salePrice) ? Number(item.salePrice) : null,
        rating: Number(item.rating) > 0 ? Number(item.rating) : null,
        stock: item.stockQty,
        images: item.images || [],
        image: item.image || '',
        endsInHours: index === 0 ? 1 : 3,
        color: index === 0 ? 'from-red-600 to-orange-500' : 'from-orange-600 to-amber-500'
      }));
  }, [discountedProducts]);

  const mainOfferEnds = getOfferDeadline(
    dealOfDay?.endAfterHours || 0,
    dealOfDay?.endAfterMinutes || 0,
    dealOfDay?.endAfterSeconds || 0
  );

  if (!dealOfDay) return null;

  const handleCardClick = (productId) => {
    navigate(`/shop/product/${productId}`);
  };

  return (
    <section id="special-offers-section" className="py-12 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Special Offers</h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-3 bg-gradient-to-br from-[#0f1217] via-[#141a22] to-[#1f2937] text-white rounded-2xl overflow-hidden shadow-lg border border-white/10"
            onClick={() => handleCardClick(dealOfDay.id)}
            role="link"
            tabIndex={0}
          >
            <div className="grid md:grid-cols-2 h-full">
              <div className="min-h-[260px] md:min-h-full bg-black/20 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="premium-product-frame w-full h-56 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-[#0b0f14]">
                    <img
                      src={getPrimaryProductImage(dealOfDay)}
                      alt={dealOfDay.name}
                      loading="lazy"
                      onError={(event) => handleImageError(event, dealOfDay.name)}
                      className="premium-product-image-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-7">
                <p className="text-sm font-semibold text-amber-200 mb-1">Deal of the Day</p>
                <h3 className="text-2xl font-bold leading-tight mb-2">{dealOfDay.name}</h3>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-bold text-secondary">
                    Rs. {(Number.isFinite(dealOfDay.salePrice) ? dealOfDay.salePrice : dealOfDay.price).toLocaleString()}
                  </span>
                  {Number.isFinite(dealOfDay.salePrice) && dealOfDay.salePrice < dealOfDay.price && (
                    <span className="text-sm text-white/80 line-through">Rs. {dealOfDay.price.toLocaleString()}</span>
                  )}
                </div>

                {Number.isFinite(dealOfDay.rating) && (
                  <div className="flex items-center gap-1 mb-3">
                    <FaStar className="text-yellow-300" />
                    <span className="text-sm font-medium">{dealOfDay.rating.toFixed(1)}</span>
                  </div>
                )}

                <p className="text-sm text-red-50 leading-6 mb-4">{dealOfDay.description}</p>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{dealOfDay.sold} Sold out of {dealOfDay.totalStock}</span>
                    <span>{dealOfDay.stock} left</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-secondary"
                      style={{ width: `${(dealOfDay.sold / dealOfDay.totalStock) * 100}%` }}
                    />
                  </div>
                </div>

                <CountdownTimer
                  targetDate={mainOfferEnds}
                  label="Offer ends in:"
                  className="mb-5 inline-flex items-center px-3 py-2 rounded-md bg-black/30 border border-white/10"
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      addToCart(dealOfDay, 1);
                    }}
                    className="px-5 py-2.5 rounded-md bg-[#facc15] text-black font-semibold hover:bg-[#eab308]"
                  >
                    Add to Cart
                  </button>
                  <Link
                    to={`/shop/product/${dealOfDay.id}`}
                    className="px-5 py-2.5 rounded-md border border-white/15 text-white font-semibold hover:bg-white/10"
                  >
                    View Detail
                  </Link>
                </div>
              </div>
            </div>
          </motion.article>

          <div className="lg:col-span-2 space-y-5">
            {sideOffers.map((offer, index) => (
              <motion.article
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className="rounded-2xl bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0f172a] text-white p-5 shadow-lg border border-white/10"
                onClick={() => handleCardClick(offer.id)}
                role="link"
                tabIndex={0}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-amber-200 mb-1">Limited Offer</p>
                    <h4 className="text-lg font-bold leading-tight">{offer.name}</h4>
                    <div className="flex items-center gap-2 mt-2 mb-1">
                      <span className="font-bold text-xl text-secondary">
                        Rs. {(Number.isFinite(offer.salePrice) ? offer.salePrice : offer.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="premium-product-frame w-14 h-14 rounded-xl bg-white/10 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center bg-[#0b0f14]">
                      <img
                        src={getPrimaryProductImage(offer)}
                        alt={offer.name}
                        loading="lazy"
                        onError={(event) => handleImageError(event, offer.name)}
                        className="premium-product-image-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 mb-4 text-sm bg-black/30 rounded-md px-3 py-2 inline-flex items-center gap-2 border border-white/10">
                  <span>Ends in:</span>
                  <CountdownTimer
                    targetDate={getOfferDeadline(offer.endsInHours, 18, 25)}
                    compact
                    className="font-semibold tracking-wide"
                  />
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    addToCart(offer, 1);
                  }}
                  className="w-full py-2.5 rounded-md bg-[#facc15] text-black font-semibold hover:bg-[#eab308]"
                >
                  Add to Cart
                </button>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffers;