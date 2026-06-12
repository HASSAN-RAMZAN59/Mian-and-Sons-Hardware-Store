import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import HomeSectionSkeleton from '../../components/website/common/HomeSectionSkeleton';
import BrandsSlider from '../../components/website/home/BrandsSlider';
import FeaturedProducts from '../../components/website/home/FeaturedProducts';
import HeroBanner from '../../components/website/home/HeroBanner';
import BestSellers from '../../components/website/home/BestSellers';
import NewArrivals from '../../components/website/home/NewArrivals';
import NewsletterSection from '../../components/website/home/NewsletterSection';
import SpecialOffers from '../../components/website/home/SpecialOffers';
import Testimonials from '../../components/website/home/Testimonials';
import WhyChooseUs from '../../components/website/home/WhyChooseUs';
import useProductsCatalog from '../../hooks/useProductsCatalog';

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' }
  }
};

const Home = () => {
  const { products: productsData } = useProductsCatalog();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const selectedCategory = searchParams.get('category') || '';

  const featuredProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All Categories') return productsData;

    return productsData.filter((product) => String(product.category || '').trim() === selectedCategory);
  }, [productsData, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Helmet>
        <title>Mian & Sons Hardware Store | Home</title>
        <meta
          name="description"
          content="Shop tools, construction materials, plumbing, electrical, paints and safety equipment at Mian & Sons Hardware Store."
        />
        <meta
          name="keywords"
          content="hardware store, power tools, hand tools, plumbing, electrical, paints, construction materials, Pakistan"
        />
        <meta property="og:title" content="Mian & Sons Hardware Store" />
        <meta
          property="og:description"
          content="Your one-stop hardware shop for genuine products, best prices, and fast delivery."
        />
      </Helmet>

      <div className="pb-12">
        {isLoading ? (
          <>
            <section className="max-w-7xl mx-auto px-4 pt-4">
              <div className="rounded-xl bg-white border border-gray-200 p-6 animate-pulse">
                <div className="h-56 md:h-72 bg-gray-200 rounded-lg" />
              </div>
            </section>
            <HomeSectionSkeleton count={4} />
            <HomeSectionSkeleton count={4} />
            <HomeSectionSkeleton count={4} />
          </>
        ) : (
          <>
        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="pt-4">
          <HeroBanner />
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <FeaturedProducts products={featuredProducts} />
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <SpecialOffers />
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <BrandsSlider />
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <NewArrivals />
        </motion.div>

        <motion.section
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-7xl mx-auto px-4"
        >
          <div className="rounded-xl bg-[#facc15] text-black px-6 py-4 text-center font-semibold tracking-wide shadow-sm border border-black/10">
            Wholesale & Bulk Orders Available | Call: +923426435527
          </div>
        </motion.section>

        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <WhyChooseUs />
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <BestSellers />
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <Testimonials />
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <NewsletterSection />
        </motion.div>
          </>
        )}
      </div>
    </>
  );
};

export default Home;