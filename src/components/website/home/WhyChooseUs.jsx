import React from 'react';
import { motion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';

const features = [
  {
    icon: '',
    title: 'Genuine Products',
    description: '100% original brands guaranteed',
    accent: 'from-[#facc15] to-[#f59e0b]'
  },
  {
    icon: '',
    title: 'Fast Delivery',
    description: 'Same day delivery in city',
    accent: 'from-[#facc15] to-[#f59e0b]'
  },
  {
    icon: '',
    title: 'Best Prices',
    description: 'Price match guarantee',
    accent: 'from-[#facc15] to-[#f59e0b]'
  },
  {
    icon: '',
    title: 'Expert Advice',
    description: 'Technical support available',
    accent: 'from-[#facc15] to-[#f59e0b]'
  }
];

const WhyChooseUs = () => {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Why Choose Mian & Sons?</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group rounded-xl bg-[#11161d] border border-white/10 p-5 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.accent} text-black flex items-center justify-center text-2xl mb-4 shadow-sm`}>
                <FaStar size={12} className="text-black" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-6">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;