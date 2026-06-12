import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useProductsCatalog from '../../hooks/useProductsCatalog';

const values = [
  {
    title: 'Quality',
    text: 'We provide durable, genuine, and industry-standard hardware products.',
    icon: ''
  },
  {
    title: 'Trust',
    text: 'Thousands of customers rely on our transparent pricing and reliable support.',
    icon: ''
  },
  {
    title: 'Service',
    text: 'Our team helps customers choose the right product for every project need.',
    icon: ''
  },
  {
    title: 'Affordability',
    text: 'Competitive prices with wholesale and bulk options for all customer segments.',
    icon: ''
  }
];

const team = [
  { name: 'Store Management', role: 'Operations & Customer Care' },
  { name: 'Sales Desk', role: 'Product Guidance' },
  { name: 'Technical Support', role: 'Tools & Hardware Advice' },
  { name: 'Inventory Team', role: 'Stock & Fulfillment' }
];

const branches = [
  { name: 'Main Branch', location: '59-JB Amin Pur Road, Faisalabad', contact: '+92-342-6435527' }
];

const CounterCard = ({ value, label, suffix }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame;
    let start;
    const duration = 1200;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 text-center">
      <p className="text-3xl font-bold text-secondary">
        {count}
        {suffix}
      </p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </div>
  );
};

const About = () => {
  const { products: productsData } = useProductsCatalog();

  const brandList = useMemo(() => {
    const names = new Set();
    productsData.forEach((product) => {
      const brand = product.brand || product.company;
      if (brand) names.add(brand);
    });

    return Array.from(names).sort((first, second) => first.localeCompare(second));
  }, [productsData]);

  const stats = useMemo(
    () => [
      { label: 'Products', value: productsData.length, suffix: '' },
      { label: 'Brands', value: brandList.length, suffix: '' },
      { label: 'Years in Business', value: 2, suffix: '' },
      { label: 'Branches', value: branches.length, suffix: '' }
    ],
    [brandList.length]
  );

  return (
    <div className="bg-gray-50">
      <section className="bg-gradient-to-r from-primary via-blue-700 to-blue-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold">About Mian & Sons Hardware Store</h1>
          <p className="mt-3 text-blue-100 max-w-2xl mx-auto">
            Serving professionals, contractors, and households with quality hardware and trusted service.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-3">Our Story</h2>
          <p className="text-gray-700 leading-7">
            Founded in 2024, Mian & Sons Hardware Store began with a simple goal: provide genuine hardware products, honest pricing, and dependable service for local builders, contractors, and households. In just two years, we have built a curated catalog of essentials and strong relationships with trusted brands.
          </p>
          <p className="text-gray-700 leading-7 mt-3">
            We currently serve customers from our main Faisalabad branch at 59-JB Amin Pur Road and continue to grow with the same commitment to quality, trust, and service excellence.
          </p>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((item) => (
            <CounterCard key={item.label} value={item.value} suffix={item.suffix} label={item.label} />
          ))}
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-5">Our Values</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {values.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              className="bg-white border border-gray-200 rounded-xl p-5"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-primary mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-6">{item.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-5">Our Team</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {team.map((member) => (
            <motion.article key={member.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary text-white font-bold flex items-center justify-center text-lg mb-3">
                {member.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <h3 className="font-semibold text-primary">{member.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{member.role}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-5">Our Branches</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <motion.article key={branch.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-primary">{branch.name}</h3>
              <p className="text-sm text-gray-600 mt-2">{branch.location}</p>
              <p className="text-sm text-secondary font-semibold mt-2">{branch.contact}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-5">Brands We Carry</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {brandList.map((item) => (
            <div key={item} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="pb-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-4"
        >
          <div className="rounded-2xl bg-gradient-to-r from-secondary to-orange-500 text-white text-center px-6 py-10">
            <h2 className="text-2xl md:text-3xl font-bold">Visit Our Store Today</h2>
            <p className="mt-2 text-orange-100">Explore our curated product range and get expert support for your next project.</p>
            <Link to="/shop" className="inline-block mt-5 px-6 py-3 rounded-md bg-white text-secondary font-semibold hover:bg-gray-100">
              Explore Products
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default About;