import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowRight, FaBoxOpen, FaCheckCircle, FaShippingFast } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const contentMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' }
};

const heroSlides = [
  {
    eyebrow: 'Your Trusted Hardware Store ',
    title: 'Stop & Shop',
    description: 'Reliable & Durable Products',
    primaryCta: { label: 'Shop Now', to: '/shop' },
    secondaryCta: { label: 'Our Brands', to: '/brands' },
    panelTitle: 'Premium Tools',
    panelText: 'Drills, grinders, cutters and more',
    image:
      "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=2000&q=80"
  },
  {
    eyebrow: 'Trusted Quality',
    title: 'Build Your Dream',
    description: 'Always at your Service',
    primaryCta: { label: 'Explore Now', to: '/#featured-products-section' },
    panelTitle: 'Construction Essentials',
    panelText: 'Ready stock for residential and commercial projects',
    // Append timestamp to force browser to re-fetch when image was just replaced
    image: '/images/3 slider.jpg?v=' + Date.now()
  }
];

const HeroBanner = () => {
  const handleFeaturedProductsClick = () => {
    const section = document.getElementById('featured-products-section');

    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.location.assign('/#featured-products-section');
  };

  return (
    <section className="w-full relative z-0">
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
        <Swiper
          modules={[Autoplay, EffectFade, Navigation, Pagination]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={850}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          navigation
          pagination={{ clickable: true }}
          loop
          className="hero-swiper"
        >
          {heroSlides.map((slide, index) => (
            <SwiperSlide key={slide.title}>
              <div
                className="text-white bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(102deg, rgba(8, 10, 14, 0.96) 0%, rgba(17, 24, 39, 0.9) 42%, rgba(250, 204, 21, 0.18) 100%), url('${slide.image}')`
                }}
              >
                <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 py-12 lg:py-16 grid lg:grid-cols-2 gap-8 lg:gap-10 items-center min-h-[380px] sm:min-h-[420px]">
                  <motion.div {...contentMotion}>
                    <p className="uppercase tracking-[0.2em] text-xs sm:text-sm text-amber-200 mb-3">{slide.eyebrow}</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">{slide.title}</h2>
                    <p className="text-slate-300 text-base lg:text-lg mb-6 lg:mb-7 max-w-xl">{slide.description}</p>

                    <div className="flex flex-wrap gap-3">
                      {slide.primaryCta.to === '/#featured-products-section' ? (
                        <button
                          type="button"
                          onClick={handleFeaturedProductsClick}
                          className="inline-flex items-center gap-2 bg-secondary hover:brightness-95 text-black px-5 py-3 rounded-md font-semibold"
                        >
                          {slide.primaryCta.label}
                          <FaArrowRight size={12} />
                        </button>
                      ) : (
                        <Link
                          to={slide.primaryCta.to}
                          className="inline-flex items-center gap-2 bg-secondary hover:brightness-95 text-black px-5 py-3 rounded-md font-semibold"
                        >
                          {slide.primaryCta.label}
                          <FaArrowRight size={12} />
                        </Link>
                      )}
                      {slide.secondaryCta && (
                        <Link
                          to={slide.secondaryCta.to}
                          className="inline-flex items-center border border-white/15 text-white px-5 py-3 rounded-md font-semibold hover:bg-white/10"
                        >
                          {slide.secondaryCta.label}
                        </Link>
                      )}
                    </div>
                  </motion.div>

                  <div className="hidden lg:block" />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <style>{`
        .hero-swiper .swiper-button-prev,
        .hero-swiper .swiper-button-next {
          color: #fff;
          background: rgba(15, 23, 42, 0.35);
          width: 42px;
          height: 42px;
          border-radius: 9999px;
          backdrop-filter: blur(3px);
        }

        .hero-swiper .swiper-button-prev::after,
        .hero-swiper .swiper-button-next::after {
          font-size: 14px;
          font-weight: 700;
        }

        .hero-swiper .swiper-pagination {
          bottom: 12px !important;
        }

        .hero-swiper .swiper-pagination-bullet {
          width: 9px;
          height: 9px;
          background: rgba(255, 255, 255, 0.6);
          opacity: 1;
        }

        .hero-swiper .swiper-pagination-bullet-active {
          width: 24px;
          border-radius: 9999px;
          background: #f59e0b;
        }
      `}</style>

      <div className="grid md:grid-cols-3 gap-4 mt-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="rounded-xl bg-secondary border border-white/10 text-black px-5 py-4 flex items-center gap-3"
        >
          <FaShippingFast size={22} />
          <p className="text-sm font-medium">Always at your service</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-xl bg-secondary border border-white/10 text-black px-5 py-4 flex items-center gap-3"
        >
          <FaCheckCircle size={22} />
          <p className="text-sm font-medium">Genuine Products Guaranteed</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="rounded-xl bg-secondary text-black px-5 py-4 flex items-center gap-3"
        >
          <FaBoxOpen size={22} />
          <p className="text-sm font-medium">Easy Returns within 7 days</p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBanner;