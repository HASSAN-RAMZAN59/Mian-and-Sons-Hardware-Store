import React from 'react';
import { motion } from 'framer-motion';

const NewsletterSection = () => {
  return (
    <section className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto px-4"
      >
        <div className="rounded-2xl bg-gradient-to-r from-[#0b0f14] via-[#111827] to-[#facc15] p-6 md:p-10 text-white border border-[#facc15]/25">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Stay Updated with Latest Offers</h2>
          <p className="text-yellow-100/90 mb-5">Subscribe to receive discounts, new arrivals, and bulk deal alerts.</p>

          <form onSubmit={(event) => event.preventDefault()} className="max-w-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-md border border-white/10 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#facc15] focus:border-[#facc15]"
              />
              <button type="submit" className="px-5 py-3 bg-[#facc15] text-black rounded-md font-semibold hover:bg-[#eab308]">
                Subscribe
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </section>
  );
};

export default NewsletterSection;