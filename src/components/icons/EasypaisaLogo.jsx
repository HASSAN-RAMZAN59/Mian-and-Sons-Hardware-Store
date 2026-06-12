import React from 'react';

const EasypaisaLogo = ({ className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 100 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Easypaisa">
    <rect width="100" height="32" rx="6" fill="#16a34a" />
    <g fill="#fff" fontFamily="sans-serif" fontWeight="700" fontSize="12" transform="translate(10,20)">
      <text x="0" y="0">e</text>
      <text x="18" y="0" fontWeight="600">asypaisa</text>
    </g>
  </svg>
);

export default EasypaisaLogo;
