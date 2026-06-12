import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useProductsCatalog from '../../../hooks/useProductsCatalog';

const BrandsSlider = () => {
  const { products: productsData } = useProductsCatalog();

  const brands = useMemo(() => {
    const uniqueBrands = Array.from(new Set(productsData.map((product) => product.company).filter(Boolean)));
    return uniqueBrands.length ? uniqueBrands : ['Master', 'Adam G', 'Local', 'Fine', 'Capital', 'Hi-Fine', 'Pak'];
  }, [productsData]);

  const marqueeBrands = [...brands, ...brands];

  return (
    <section className="py-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6">Top Brands We Carry</h2>

        <div className="relative overflow-hidden rounded-2xl border border-[#f2c94c]/30 bg-gradient-to-r from-[#1a1406] via-[#231909] to-[#1a1406] shadow-sm py-4 sm:py-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-14 bg-gradient-to-r from-[#1a1406] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-14 bg-gradient-to-l from-[#1a1406] to-transparent z-10" />

          <div className="flex w-max animate-[marquee_24s_linear_infinite] hover:[animation-play-state:paused]">
            {marqueeBrands.map((brand, index) => (
              <Link
                key={`${brand}-${index}`}
                to={`/shop?brand=${encodeURIComponent(brand)}`}
                className="mx-2 sm:mx-2.5 min-w-[148px] sm:min-w-[180px] h-16 sm:h-20 rounded-xl border border-[#f2c94c]/30 bg-gradient-to-b from-[#f9e7a1] to-[#f2c94c] flex items-center justify-center px-4 text-center text-sm font-semibold text-[#2a2008] hover:text-black hover:border-[#f6d65c] transition-all shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default BrandsSlider;