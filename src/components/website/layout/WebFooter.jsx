import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import useProductsCatalog from '../../../hooks/useProductsCatalog';
import useStoreLogo from '../../../hooks/useStoreLogo';
import { checkoutConfigService } from '../../../services/checkoutConfigService';
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope
} from 'react-icons/fa';

const STORE_INFO_KEY = 'admin_store_info';

const defaultStoreInfo = {
  storeName: 'Mian & Sons Hardware Store',
  address: '59-JB Amin Pur Road',
  city: 'Faisalabad',
  phone: '+92-342-6435527',
  whatsapp: '+92-342-6435527',
  email: 'info@miansons.pk',
  workingHours: {
    weekdaysLabel: 'Mon - Sun',
    weekdaysTime: '9:00 AM - 9:00 PM',
    sundayLabel: 'Sunday',
    sundayTime: '11:00 AM - 6:00 PM'
  }
};

const normalizeWhatsApp = (value) => String(value || '').replace(/\D/g, '');

const WebFooter = () => {
  const { products: productsData } = useProductsCatalog();
  const [storeInfo, setStoreInfo] = useState(defaultStoreInfo);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const storeLogoUrl = useStoreLogo();

  useEffect(() => {
    const loadStoreInfo = () => {
      try {
        const storedStoreInfo = JSON.parse(localStorage.getItem(STORE_INFO_KEY) || 'null');
        if (storedStoreInfo && typeof storedStoreInfo === 'object') {
          setStoreInfo({ ...defaultStoreInfo, ...storedStoreInfo });
        }
      } catch (error) {
        setStoreInfo(defaultStoreInfo);
      }
    };

    loadStoreInfo();

    const handleStorage = (event) => {
      if (event.key === STORE_INFO_KEY) {
        loadStoreInfo();
      }
    };

    const handleCustomUpdate = (event) => {
      if (event?.detail?.key === STORE_INFO_KEY) {
        loadStoreInfo();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const rows = await checkoutConfigService.getPaymentMethods();
        const methods = (Array.isArray(rows) ? rows : [])
          .filter((row) => row?.active !== false)
          .map((row) => row.label)
          .filter(Boolean);
        setPaymentMethods(methods);
      } catch {
        setPaymentMethods([]);
      }
    };

    loadPaymentMethods();
  }, []);
  const quickLinks = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'About Us', to: '/about' },
    { label: 'Contact Us', to: '/contact' },
    { label: 'Track Your Order', to: '/track-order' },
    { label: 'My Account', to: '/customer/account' },
    { label: 'Wishlist', to: '/wishlist' },
    { label: 'Brands', to: '/brands' }
  ];

  const categories = [...new Set(productsData.map((product) => product.category).filter(Boolean))];

  const customerService = [
    { label: 'FAQs', to: '/customer-service#faqs' },
    { label: 'Returns Policy', to: '/customer-service#returns-policy' },
    { label: 'Warranty Information', to: '/customer-service#warranty-info' },
    { label: 'Warranty Claim', to: '/warranty-claim' },
    { label: 'Bulk/Wholesale Inquiry', to: '/customer-service#bulk-wholesale' },
    { label: 'Complaint Portal', to: '/customer-service#complaint-portal' }
  ];

  const brands = [...new Set(productsData.map((product) => product.company).filter(Boolean))];

  const workingHoursText =
    storeInfo.workingHours && typeof storeInfo.workingHours === 'object'
      ? `${storeInfo.workingHours.weekdaysLabel}: ${storeInfo.workingHours.weekdaysTime}`
      : storeInfo.workingHours;

  return (
    <footer>
      <div className="bg-[#facc15] border-t border-black/10">
        <div className="max-w-7xl mx-auto px-4 py-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="text-black">
            <h3 className="text-xl font-bold tracking-tight">Subscribe to Our Newsletter</h3>
            <p className="text-sm text-black/75 mt-1">Get latest offers and updates</p>
          </div>
          <form
            className="w-full lg:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              toast.success('Thank you for subscribing to our newsletter!');
              event.target.reset();
            }}
          >
            <div className="flex w-full lg:w-[460px] bg-black/10 border border-black/10 rounded-full overflow-hidden shadow-sm">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 border-0 focus:ring-0 text-sm bg-transparent text-black placeholder:text-black/55 px-4 py-3"
              />
              <button
                type="submit"
                className="bg-black px-6 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Subscribe
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-[#0d1117] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">About Us</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.25fr_0.85fr_0.95fr_0.95fr] gap-10 xl:gap-14 items-start text-left">
            <div className="max-w-sm">
              <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 mb-5 group w-fit">
                <img src={storeLogoUrl} alt="Mian & Sons logo" className="w-11 h-11 rounded-full object-cover object-center ring-1 ring-white/10" />
                <div>
                  <p className="font-bold text-lg leading-tight group-hover:text-secondary transition-colors">{storeInfo.storeName}</p>
                  <span className="block mt-1 h-0.5 w-10 bg-secondary rounded-full" />
                </div>
              </Link>
              <p className="text-sm text-slate-400 leading-6 mb-5 max-w-[19rem]">
                Your trusted partner for quality hardware, construction materials, tools, and industrial supplies across Pakistan.
              </p>
              <div className="space-y-3 text-sm text-slate-400">
                <p className="flex items-start gap-2.5">
                  <FaMapMarkerAlt className="mt-1 shrink-0 text-secondary" />
                  <span className="leading-6">{storeInfo.address}{storeInfo.city ? `, ${storeInfo.city}` : ''}, Pakistan</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <FaPhoneAlt className="shrink-0 text-secondary" />
                  <a href={`tel:${storeInfo.phone}`} className="hover:text-secondary transition-colors">{storeInfo.phone}</a>
                </p>
                <p className="flex items-center gap-2.5">
                  <FaEnvelope className="shrink-0 text-secondary" />
                  <a href={`mailto:${storeInfo.email}`} className="hover:text-secondary transition-colors">{storeInfo.email}</a>
                </p>
                <p className="leading-6">{workingHoursText}</p>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-black transition-colors" aria-label="Facebook">
                  <FaFacebookF size={14} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-black transition-colors" aria-label="Instagram">
                  <FaInstagram size={14} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-black transition-colors" aria-label="YouTube">
                  <FaYoutube size={14} />
                </a>
                <a href={`https://wa.me/${normalizeWhatsApp(storeInfo.whatsapp || storeInfo.phone)}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-black transition-colors" aria-label="WhatsApp">
                  <FaWhatsapp size={14} />
                </a>
              </div>
            </div>

            <div>
              <div className="w-fit mb-4">
                <h4 className="font-semibold text-lg">Quick Links</h4>
                <span className="mt-2 block h-0.5 w-10 bg-secondary rounded-full" />
              </div>
              <ul className="space-y-3 text-sm text-slate-400 mt-1">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link 
                      to={link.to} 
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="inline-flex items-center gap-2 hover:text-secondary transition-colors group"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/25 group-hover:bg-secondary transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="w-fit mb-4">
                <h4 className="font-semibold text-lg">Product Categories</h4>
                <span className="mt-2 block h-0.5 w-10 bg-secondary rounded-full" />
              </div>
              <ul className="space-y-3 text-sm text-slate-400 mt-1">
                {categories.map((category) => (
                  <li key={category}>
                    <Link
                      to={`/shop?category=${encodeURIComponent(category)}`}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="inline-flex items-center gap-2 hover:text-secondary transition-colors group"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/25 group-hover:bg-secondary transition-colors" />
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="w-fit mb-4">
                <h4 className="font-semibold text-lg">Customer Service</h4>
                <span className="mt-2 block h-0.5 w-10 bg-secondary rounded-full" />
              </div>
              <ul className="space-y-3 text-sm text-slate-400 mt-1">
                {customerService.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        if (item.to.includes('#')) {
                          const id = item.to.split('#')[1];
                          setTimeout(() => {
                            const element = document.getElementById(id);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }, 100);
                        }
                      }}
                      className="inline-flex items-center gap-2 hover:text-secondary transition-colors group"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/25 group-hover:bg-secondary transition-colors" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h5 className="font-semibold text-white">Brands</h5>
              <span className="hidden sm:block h-px flex-1 bg-white/10" />
            </div>
            <div className="flex flex-wrap gap-2.5">
              {brands.map((brand) => (
                <Link
                  key={brand}
                  to={`/shop?brand=${encodeURIComponent(brand)}`}
                  className="px-3.5 py-1.5 bg-white/10 rounded-full text-sm text-slate-300 border border-white/5 hover:bg-secondary hover:text-black hover:border-secondary transition-all"
                >
                  {brand}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#090c11] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row items-center justify-between gap-3 text-sm text-slate-400 text-center lg:text-left">
            <p>© 2024 Mian & Sons Hardware Store. All Rights Reserved</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {paymentMethods.map((method) => (
                <span key={method} className="px-2.5 py-1 bg-white/10 rounded text-xs text-slate-300">
                  {method}
                </span>
              ))}
            </div>
            <p>Made in Pakistan</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default WebFooter;