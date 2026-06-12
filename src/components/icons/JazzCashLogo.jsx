import React from 'react';

const JazzCashLogo = ({ className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 100 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="JazzCash">
    <rect width="100" height="32" rx="6" fill="#ff6a00" />
    <g fill="#fff" fontFamily="sans-serif" fontWeight="700" fontSize="12" transform="translate(10,20)">
      <text x="0" y="0">JAZZ</text>
      <text x="40" y="0" fontWeight="600">CASH</text>
    </g>
  </svg>
);

export default JazzCashLogo;
