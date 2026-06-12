import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaArrowUp } from 'react-icons/fa';
import { Outlet, useLocation } from 'react-router-dom';
import CookieConsentBanner from '../common/CookieConsentBanner';
import WhatsAppFloatingButton from '../common/WhatsAppFloatingButton';
import MiniCart from '../cart/MiniCart';
import WebFooter from './WebFooter';
import WebNavbar from './WebNavbar';

const WebLayoutContent = ({ children }) => {
  const location = useLocation();

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingBar, setShowLoadingBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setShowLoadingBar(true);
    setLoadingProgress(20);

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 80);

    const completeTimeout = setTimeout(() => {
      setLoadingProgress(100);

      setTimeout(() => {
        setShowLoadingBar(false);
        setLoadingProgress(0);
      }, 220);
    }, 420);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimeout);
    };
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="website-dark-theme min-h-screen bg-[#0b0f14] text-slate-100 flex flex-col relative">
      <AnimatePresence>
        {showLoadingBar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 w-full h-1 bg-transparent z-[70]"
          >
            <motion.div
              className="h-full bg-secondary"
              animate={{ width: `${loadingProgress}%` }}
              transition={{ ease: 'easeOut', duration: 0.2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <WebNavbar />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="flex-1"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children || <Outlet />}
        </motion.main>
      </AnimatePresence>

      <WebFooter />
      <MiniCart />
      <WhatsAppFloatingButton />
      <CookieConsentBanner />

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-secondary text-white shadow-lg hover:opacity-90 z-[60] flex items-center justify-center"
            aria-label="Back to top"
          >
            <FaArrowUp size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

const WebLayout = ({ children }) => {
  return <WebLayoutContent>{children}</WebLayoutContent>;
};

export default WebLayout;