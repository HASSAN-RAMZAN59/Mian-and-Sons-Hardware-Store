import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaQuestionCircle, FaUndo, FaShieldAlt, FaTruck, FaHeadset } from 'react-icons/fa';

const PolicySection = ({ title, icon: Icon, children }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
        <Icon size={24} />
      </div>
      <h2 className="text-xl font-bold text-primary dark:text-white">{title}</h2>
    </div>
    <div className="text-gray-600 dark:text-slate-400 space-y-3 text-sm leading-relaxed text-left">
      {children}
    </div>
  </motion.div>
);

const CustomerServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f14] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-primary dark:text-white mb-4">Customer Service</h1>
          <p className="text-gray-500 dark:text-slate-400">Everything you need to know about our policies and support.</p>
        </div>

        {/* FAQ Section */}
        <section id="faqs">
          <PolicySection title="Frequently Asked Questions (FAQs)" icon={FaQuestionCircle}>
            <div>
              <p className="font-semibold text-primary dark:text-secondary">Q: What are your delivery timings?</p>
              <p>A: We deliver across Pakistan within 3-5 working days. Same-day delivery is available in Faisalabad for orders placed before 12 PM.</p>
            </div>
            <div>
              <p className="font-semibold text-primary dark:text-secondary">Q: Do you offer bulk discounts?</p>
              <p>A: Yes! For construction projects or wholesalers, please contact us via our Bulk Inquiry portal or call +92342-6435527.</p>
            </div>
            <div>
              <p className="font-semibold text-primary dark:text-secondary">Q: Can I return a product after use?</p>
              <p>A: Items can only be returned in their original packaging and condition within 7 days. Used items are not eligible for returns.</p>
            </div>
          </PolicySection>
        </section>

        {/* Returns Section */}
        <section id="returns-policy" className="mt-8">
          <PolicySection title="Returns & Exchange Policy" icon={FaUndo}>
            <p>At Mian & Sons, customer satisfaction is our priority. If you are not satisfied with your purchase:</p>
            <ul className="list-disc ml-5 space-y-2">
              <li>You can return or exchange items within 7 days of delivery.</li>
              <li>Proof of purchase (invoice) is mandatory.</li>
              <li>Items must be unused, with original tags and packaging.</li>
              <li>Liquid items (paints/solvents) are non-returnable once opened.</li>
            </ul>
          </PolicySection>
        </section>

        {/* Warranty Section */}
        <section id="warranty-info" className="mt-8">
          <PolicySection title="Warranty Information" icon={FaShieldAlt}>
            <p>We provide brand warranties for electrical hardware and power tools as per manufacturer policies:</p>
            <ul className="list-disc ml-5 space-y-2">
              <li>Electrical components carry a 6-month to 1-year limited warranty.</li>
              <li>Warranty covers manufacturing defects only.</li>
              <li>Any physical damage or short-circuiting due to improper installation is not covered.</li>
              <li>Please keep your warranty card safe to claim service.</li>
            </ul>
            <Link
              to="/warranty-claim"
              className="inline-flex items-center mt-3 px-4 py-2 rounded-lg bg-secondary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Open Warranty Claim Form
            </Link>
          </PolicySection>
        </section>

        {/* Bulk Inquiry Section */}
        <section id="bulk-wholesale" className="mt-8">
          <PolicySection title="Bulk & Wholesale Inquiry" icon={FaTruck}>
            <p>For contractors, developers, and retailers:</p>
            <p>We offer specialized pricing for bulk orders of cement, plumbing pipes, and sanitary fittings.</p>
            <div className="bg-primary/5 dark:bg-white/5 p-4 rounded-lg border border-primary/10">
              <p className="font-bold">Contact Bulk Desk:</p>
              <p>Email: wholesale@miansons.pk</p>
              <p>Call/WhatsApp: +92-342-6435527</p>
            </div>
          </PolicySection>
        </section>

        {/* Complaint Portal Section */}
        <section id="complaint-portal" className="mt-8">
          <PolicySection title="Complaint Portal" icon={FaHeadset}>
            <p>If you have any issues with your order or staff behavior:</p>
            <p>Please reach out to our management directly at <strong>complaints@miansons.pk</strong>. We aim to resolve all issues within 48 working hours.</p>
          </PolicySection>
        </section>
      </div>
    </div>
  );
};

export default CustomerServicePage;
