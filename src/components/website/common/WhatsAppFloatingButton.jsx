import React from 'react';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppFloatingButton = () => {
  return (
    <motion.a
      href="https://wa.me/923426435527"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-20 right-5 z-[60] group"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      aria-label="Chat with us on WhatsApp"
    >
      <motion.span
        className="absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-primary text-white text-xs px-3 py-1.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Chat with us
      </motion.span>

      <motion.span
        className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <FaWhatsapp size={24} />
      </motion.span>
    </motion.a>
  );
};

export default WhatsAppFloatingButton;
