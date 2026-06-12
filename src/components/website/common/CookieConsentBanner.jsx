import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'website_cookie_consent';

const CookieConsentBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    setShowBanner(!consent);
  }, []);

  const handleConsent = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[70] border-t border-gray-200 bg-white/95 backdrop-blur"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-700">
              We use cookies and local storage to improve your shopping experience.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleConsent('necessary')}
                className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium"
              >
                Necessary Only
              </button>
              <button
                type="button"
                onClick={() => handleConsent('all')}
                className="px-3 py-2 rounded-md bg-secondary text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsentBanner;
