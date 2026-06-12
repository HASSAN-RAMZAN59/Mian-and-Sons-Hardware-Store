import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';

const DEFAULT_LABELS = {
  '': 'Home',
  shop: 'Shop',
  product: 'Product',
  cart: 'Cart',
  checkout: 'Checkout',
  wishlist: 'Wishlist',
  compare: 'Compare',
  about: 'About',
  contact: 'Contact',
  brands: 'Brands',
  'track-order': 'Track Order',
  'order-success': 'Order Success',
  customer: 'Customer',
  account: 'My Account',
  orders: 'My Orders'
};

const titleCase = (value) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const Breadcrumb = ({
  items,
  className = '',
  showStructuredData = true,
  homeLabel = 'Home'
}) => {
  const location = useLocation();

  const computedItems = useMemo(() => {
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }

    const segments = location.pathname.split('/').filter(Boolean);
    const dynamicItems = [{ label: homeLabel, to: '/' }];

    segments.forEach((segment, index) => {
      const to = `/${segments.slice(0, index + 1).join('/')}`;
      const isLast = index === segments.length - 1;
      const label = DEFAULT_LABELS[segment] || titleCase(segment);
      dynamicItems.push({ label, to: isLast ? undefined : to });
    });

    return dynamicItems;
  }, [items, location.pathname, homeLabel]);

  const schemaItems = computedItems.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    item: `${window.location.origin}${item.to || location.pathname}`
  }));

  return (
    <>
      {showStructuredData && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: schemaItems
            })}
          </script>
        </Helmet>
      )}

      <nav aria-label="Breadcrumb" className={`text-sm text-gray-500 ${className}`}>
        <ol className="flex items-center flex-wrap gap-1.5">
          {computedItems.map((item, index) => {
            const isLast = index === computedItems.length - 1;

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                <li>
                    {isLast || !item.to ? (
                    <span className="text-gray-700 font-medium">{item.label}</span>
                    ) : item.forceReload ? (
                      <a href={item.to} className="hover:text-primary transition-colors">
                        {item.label}
                      </a>
                  ) : (
                    <Link to={item.to} className="hover:text-primary transition-colors">
                      {item.label}
                    </Link>
                  )}
                </li>
                {!isLast && <li className="text-gray-400">&gt;</li>}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumb;