import React, { useEffect, useMemo, useState } from 'react';
import { FaQuoteLeft, FaStar } from 'react-icons/fa';
import useProductsCatalog from '../../../hooks/useProductsCatalog';

const PRODUCT_REVIEWS_KEY = 'website_product_reviews';

const getInitials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const Testimonials = () => {
  const { products: productsData } = useProductsCatalog();
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = useMemo(() => {
    let storedReviewsByProduct = {};
    try {
      const parsed = JSON.parse(localStorage.getItem(PRODUCT_REVIEWS_KEY) || '{}');
      if (parsed && typeof parsed === 'object') storedReviewsByProduct = parsed;
    } catch {
      storedReviewsByProduct = {};
    }

    const submittedReviews = Object.entries(storedReviewsByProduct)
      .flatMap(([productId, reviews]) => {
        if (!Array.isArray(reviews)) return [];
        const product = productsData.find((item) => String(item.id) === String(productId));

        return reviews.map((review, index) => {
          const reviewData = review && typeof review === 'object' ? review : {};

          return {
          id: `${productId}-${index}`,
          name: reviewData.name || 'Customer',
          designation: product?.category || 'Customer Review',
          rating: Number(reviewData.rating) || 0,
          review: reviewData.comment || 'Customer shared a review.',
          date: reviewData.date || ''
        };
        });
      })
      .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime());

    if (submittedReviews.length > 0) {
      return submittedReviews.slice(0, 9);
    }

    return [...productsData]
      .sort((left, right) => Number(right.reviewCount || 0) - Number(left.reviewCount || 0))
      .slice(0, 9)
      .map((product) => ({
        id: String(product.id),
        name: product.size ? `${product.name} - ${product.size}` : product.name,
        designation: product.category,
        rating: Number(product.rating) || 0,
        review: `Current rating ${Number(product.rating || 0).toFixed(1)} based on ${Number(product.reviewCount || 0)} reviews.`,
        date: ''
      }));
  }, [productsData]);

  useEffect(() => {
    if (testimonials.length <= 1) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [testimonials]);

  const visibleTestimonials = useMemo(() => {
    if (!testimonials.length) return [];

    const count = 3;
    return Array.from({ length: count }, (_, offset) => testimonials[(activeIndex + offset) % testimonials.length]).filter(Boolean);
  }, [activeIndex, testimonials]);

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">What Our Customers Say</h2>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" key={activeIndex}>
          {visibleTestimonials.map((item) => (
            <article key={`${item.id}-${activeIndex}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <FaQuoteLeft className="text-secondary mb-4" />
              <p className="text-sm text-gray-700 leading-6 mb-4">"{item.review}"</p>

              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <FaStar
                    key={`${item.id}-star-${idx}`}
                    className={idx < item.rating ? 'text-yellow-500' : 'text-gray-300'}
                    size={14}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center">
                  {getInitials(item.name)}
                </div>
                <div>
                  <p className="font-semibold text-primary leading-none">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.designation}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {testimonials.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition-all ${
                activeIndex === index ? 'w-7 bg-secondary' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;