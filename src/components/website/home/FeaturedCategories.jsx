import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useProductsCatalog from '../../../hooks/useProductsCatalog';

const categoryStyles = {
  'Plumbing & Sanitary': { icon: '', bg: 'bg-gradient-to-br from-[#111827] to-[#0f172a]', iconColor: 'text-slate-100', accent: 'hover:border-secondary' },
  'Bath Accessories & Taps': { icon: '', bg: 'bg-gradient-to-br from-[#111827] to-[#0f172a]', iconColor: 'text-slate-100', accent: 'hover:border-secondary' },
  'Paints & Accessories': { icon: '', bg: 'bg-gradient-to-br from-[#111827] to-[#0f172a]', iconColor: 'text-slate-100', accent: 'hover:border-secondary' },
  'Electrical Hardware': { icon: '', bg: 'bg-gradient-to-br from-[#111827] to-[#0f172a]', iconColor: 'text-slate-100', accent: 'hover:border-secondary' }
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut'
    }
  }
};

const FeaturedCategories = () => {
  const { products: productsData } = useProductsCatalog();
  const categories = ['Plumbing & Sanitary', 'Bath Accessories & Taps', 'Paints & Accessories', 'Electrical Hardware'].map((name) => ({
    name,
    count: productsData.filter((product) => product.category === name).length,
    ...categoryStyles[name]
  }));

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Shop by Category</h2>
        </div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {categories.map((category) => (
            <motion.div key={category.name} variants={cardVariants} whileHover={{ scale: 1.04, y: -4 }}>
              <Link
                to={`/shop?category=${encodeURIComponent(category.name)}`}
                className={`block rounded-xl border border-white/10 p-5 ${category.bg} ${category.accent} transition-all duration-200 shadow-sm`}
              >
                <div className="flex flex-col items-start gap-3">
                  <span className="text-4xl leading-none">{category.icon}</span>
                  <h3 className={`font-semibold text-base md:text-lg ${category.iconColor}`}>{category.name}</h3>
                  <p className="text-sm text-slate-400">{category.count} Products</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedCategories;