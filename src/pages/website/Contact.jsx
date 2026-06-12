import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORE_INFO_KEY = 'admin_store_info';
const BRANCHES_KEY = 'admin_branches';

const defaultStoreInfo = {
  storeName: 'Mian & Sons Hardware Store',
  address: '59-JB Amin Pur Road',
  city: 'Faisalabad',
  phone: '+92-342-6435527',
  whatsapp: '+92-342-6435527',
  email: 'info@miansons.pk',
  workingHours: {
    weekdaysLabel: 'Mon - Sat',
    weekdaysTime: '9:00 AM - 9:00 PM',
    sundayLabel: 'Sunday',
    sundayTime: '11:00 AM - 6:00 PM'
  }
};

const defaultBranches = [
  {
    id: 'BR-001',
    name: 'Main Branch',
    address: '59-JB Amin Pur Road',
    city: 'Faisalabad',
    phone: '+92-342-6435527',
    email: 'info@miansons.pk'
  }
];

const normalizeWhatsApp = (value) => String(value || '').replace(/\D/g, '');

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Product Inquiry',
  'Wholesale',
  'Complaint',
  'Returns Policy',
  'Warranty Information',
  'Bulk/Wholesale Inquiry',
  'FAQs',
  'Other'
];

const Contact = () => {
  const [searchParams] = useSearchParams();
  const [storeInfo, setStoreInfo] = useState(defaultStoreInfo);
  const [branches, setBranches] = useState(defaultBranches);
  const initialForm = {
    fullName: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    if (subjectParam && SUBJECT_OPTIONS.includes(subjectParam)) {
      setFormData((previous) => ({ ...previous, subject: subjectParam }));
    }
  }, [searchParams]);

  const mapQuery = useMemo(() => {
    const parts = [storeInfo.address, storeInfo.city, 'Pakistan'].filter(Boolean);
    return parts.join(', ');
  }, [storeInfo.address, storeInfo.city]);

  const workingHours = useMemo(() => {
    if (storeInfo.workingHours && typeof storeInfo.workingHours === 'object') {
      return storeInfo.workingHours;
    }

    return defaultStoreInfo.workingHours;
  }, [storeInfo.workingHours]);

  useEffect(() => {
    const loadStoreInfo = () => {
      try {
        const storedStoreInfo = JSON.parse(localStorage.getItem(STORE_INFO_KEY) || 'null');
        const storedBranches = JSON.parse(localStorage.getItem(BRANCHES_KEY) || 'null');

        if (storedStoreInfo && typeof storedStoreInfo === 'object') {
          setStoreInfo({ ...defaultStoreInfo, ...storedStoreInfo });
        }

        if (Array.isArray(storedBranches) && storedBranches.length) {
          setBranches(storedBranches);
        }
      } catch (error) {
        setStoreInfo(defaultStoreInfo);
        setBranches(defaultBranches);
      }
    };

    loadStoreInfo();

    const handleStorage = (event) => {
      if (event.key === STORE_INFO_KEY || event.key === BRANCHES_KEY) {
        loadStoreInfo();
      }
    };

    const handleCustomUpdate = (event) => {
      if (event?.detail?.key === STORE_INFO_KEY || event?.detail?.key === BRANCHES_KEY) {
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSubmitted(true);
    setFormData(initialForm);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">Contact Us</h1>
        <p className="text-gray-600 mb-8">We are here to help with products, wholesale requests, and support.</p>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-primary mb-4">Send Us a Message</h2>

            {isSubmitted && (
              <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                Your message has been sent successfully. Our team will contact you soon.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
                    placeholder="+92-3XX-XXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
                >
                  {SUBJECT_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
                  placeholder="Write your message here..."
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-secondary text-white px-5 py-2.5 font-semibold hover:bg-orange-600 transition-colors"
              >
                Submit Message
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-primary mb-4">Contact Information</h2>

              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Store Address</p>
                  <p className="flex items-start gap-2">
                    <span className="text-secondary" aria-hidden="true">
                      
                    </span>
                    <span>{storeInfo.address}{storeInfo.city ? `, ${storeInfo.city}` : ''}, Pakistan</span>
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Phone Numbers</p>
                  <ul className="space-y-1">
                    {[storeInfo.phone, storeInfo.whatsapp]
                      .filter(Boolean)
                      .filter((value, index, array) => array.indexOf(value) === index)
                      .map((value) => (
                        <li key={value}>{value}</li>
                      ))}
                  </ul>
                </div>

                <div>
                  <a
                    href={`https://wa.me/${normalizeWhatsApp(storeInfo.whatsapp || storeInfo.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md bg-green-600 text-white px-4 py-2 font-medium hover:bg-green-700 transition-colors"
                  >
                    Chat on WhatsApp
                  </a>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Email</p>
                  <a href={`mailto:${storeInfo.email}`} className="text-secondary hover:underline">
                    {storeInfo.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-primary mb-4">Working Hours</h3>
              <div className="overflow-hidden rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-800">{storeInfo.workingHours.weekdaysLabel}</td>
                      <td className="px-4 py-3 text-gray-600">{workingHours.weekdaysTime}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-800">{workingHours.sundayLabel}</td>
                      <td className="px-4 py-3 text-gray-600">{workingHours.sundayTime}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <iframe
                title="Google Maps Location"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-64 rounded-md border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold text-primary mb-4">Our Branches</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <div key={branch.id || branch.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-primary">{branch.name}</h3>
                <p className="text-sm text-gray-600 mt-2">{branch.address}{branch.city ? `, ${branch.city}` : ''}</p>
                {branch.phone && <p className="text-sm text-gray-700 mt-1">{branch.phone}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;