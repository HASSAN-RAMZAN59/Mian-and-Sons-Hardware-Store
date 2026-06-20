import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaFilter, FaList, FaThLarge } from 'react-icons/fa';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import Breadcrumb from '../../components/website/common/Breadcrumb';
import ProductCardSkeleton from '../../components/website/common/ProductCardSkeleton';
import ProductFilters from '../../components/website/shop/ProductFilters';
import ProductCard from '../../components/website/shop/ProductCard';
import useProductsCatalog from '../../hooks/useProductsCatalog';
import useActiveDiscounts from '../../hooks/useActiveDiscounts';
import { applyDiscountsToProducts } from '../../utils/discounts';
import { getProductImageList } from '../../utils/helpers';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
  { value: 'rated', label: 'Best Rated' },
  { value: 'popular', label: 'Most Popular' }
];

const parseCsvParam = (value) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);

const normalizeFilterValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseParamsToState = (searchParams) => {
  const min = Number(searchParams.get('minPrice'));
  const max = Number(searchParams.get('maxPrice'));
  const parsedPage = Number(searchParams.get('page'));

  return {
    filters: {
      categories: parseCsvParam(searchParams.get('category')),
      brands: parseCsvParam(searchParams.get('brand')),
      priceRange: {
        min: Number.isFinite(min) && min >= 0 ? min : 0,
        max: Number.isFinite(max) && max > 0 ? max : 500000
      },
      availability: {
        inStockOnly: searchParams.get('inStockOnly') === '1',
        includeOutOfStock: searchParams.get('includeOutOfStock') !== '0'
      },
      rating: searchParams.get('rating') || 'all',
        onSaleOnly: searchParams.get('onSale') === '1',
        newArrivalsOnly: searchParams.get('new') === '1' || searchParams.get('new') === 'true'
    },
    search: searchParams.get('search') || '',
      newArrivalsOnly: searchParams.get('new') === '1' || searchParams.get('new') === 'true',
    sort: searchParams.get('sort') || 'featured',
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  };
};

const areFiltersEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const Shop = () => {
  const { products: productsData } = useProductsCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedFromUrl = useMemo(() => parseParamsToState(searchParams), [searchParams]);
  const [categoriesData, setCategoriesData] = useState([]);

  const [filters, setFilters] = useState(parsedFromUrl.filters);
  const [searchText, setSearchText] = useState(parsedFromUrl.search);
  const [sort, setSort] = useState(parsedFromUrl.sort);
  const [page, setPage] = useState(parsedFromUrl.page);
  const [viewMode, setViewMode] = useState('grid');
  const [isLoadMoreMode, setIsLoadMoreMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const { discounts } = useActiveDiscounts();

  const discountedProducts = useMemo(
    () => applyDiscountsToProducts(productsData, discounts),
    [productsData, discounts]
  );

  const matchesCategorySelection = useCallback((product, selectedCategories) => {
    if (!selectedCategories.length) return true;

    const productCategory = normalizeFilterValue(product.category);
    if (!productCategory) return false;

    return selectedCategories.some((selectedValue) => productCategory === normalizeFilterValue(selectedValue));
  }, []);

  const liveProducts = useMemo(
    () => discountedProducts.map((product) => ({
      id: String(product.id),
      name: product.size ? `${product.name} - ${product.size}` : product.name,
      category: String(product.category || '').trim(),
      type: String(product.type || '').trim(),
      subCategory: String(product.subCategory || '').trim(),
      brand: String(product.company || product.brand || '').trim(),
      price: Number(product.price ?? product.salePrice ?? 0),
      salePrice: product.salePrice > 0 ? Number(product.salePrice) : null,
      discountPercent: Number(product.discountPercent ?? product.discount ?? 0),
      rating: Number(product.rating) > 0 ? Number(product.rating) : null,
      stock: Number(product.stockQty ?? product.stock ?? 0),
      popularity: Number(product.reviewCount) || 0,
      createdAt: product.createdAt || '2026-03-12',
      description: product.description || '',
      image: product.image || '',
      images: getProductImageList(product),
      isFeatured: Boolean(product.isFeatured),
      isNewArrival: Boolean(product.isNewArrival)
    })),
    [discountedProducts]
  );

  useEffect(() => {
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(parsedFromUrl.filters);
    if (filtersChanged) setFilters(parsedFromUrl.filters);

    if (searchText !== parsedFromUrl.search) setSearchText(parsedFromUrl.search);
    if (sort !== parsedFromUrl.sort) setSort(parsedFromUrl.sort);
    if (page !== parsedFromUrl.page) setPage(parsedFromUrl.page);
  }, [parsedFromUrl, filters, searchText, sort, page]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setMobileFiltersOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.categories.length) params.set('category', filters.categories.join(','));
    if (filters.brands.length) params.set('brand', filters.brands.join(','));
    if (filters.newArrivalsOnly) params.set('new', '1');
    if (searchText) params.set('search', searchText);
    if (filters.priceRange.min !== 0) params.set('minPrice', String(filters.priceRange.min));
    if (filters.priceRange.max !== 500000) params.set('maxPrice', String(filters.priceRange.max));
    if (filters.availability.inStockOnly) params.set('inStockOnly', '1');
    if (!filters.availability.includeOutOfStock) params.set('includeOutOfStock', '0');
    if (filters.rating !== 'all') params.set('rating', filters.rating);
    if (filters.onSaleOnly) params.set('onSale', '1');
    params.set('sort', sort);
    params.set('page', String(page));

    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, searchText, sort, page, searchParams, setSearchParams]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 450);
    return () => clearTimeout(timer);
  }, [filters, searchText, sort, page, viewMode]);

  const filteredProducts = useMemo(() => {
    const sourceProducts = liveProducts;

    return sourceProducts.filter((product) => {
      const matchesSearch =
        !searchText ||
        (product.name && product.name.toLowerCase().includes(searchText.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(searchText.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchText.toLowerCase()));

      const matchesCategory = matchesCategorySelection(product, filters.categories);

      const matchesBrand =
        !filters.brands.length || filters.brands.includes(product.brand);

      const productPrice = Number.isFinite(product.salePrice) ? product.salePrice : product.price;
      const matchesPrice =
        productPrice >= filters.priceRange.min && productPrice <= filters.priceRange.max;

      const matchesAvailability =
        (filters.availability.includeOutOfStock || product.stock > 0) &&
        (!filters.availability.inStockOnly || product.stock > 0);

      const matchesNewArrival = !filters.newArrivalsOnly || product.isNewArrival;

      const matchesRating =
        filters.rating === 'all' || product.rating >= Number(filters.rating);

      const matchesSale =
        !filters.onSaleOnly ||
        (Number.isFinite(product.salePrice) && product.salePrice < product.price);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesBrand &&
        matchesPrice &&
        matchesAvailability &&
        matchesNewArrival &&
        matchesRating &&
        matchesSale
      );
    });
  }, [filters, searchText, liveProducts, matchesCategorySelection]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];

    switch (sort) {
      case 'price-asc':
        return list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
      case 'price-desc':
        return list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
      case 'newest':
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'rated':
        return list.sort((a, b) => b.rating - a.rating);
      case 'popular':
        return list.sort((a, b) => b.popularity - a.popularity);
      default:
        return list.sort((a, b) => b.popularity - a.popularity);
    }
  }, [filteredProducts, sort]);

  const pageSize = viewMode === 'grid' ? 9 : 6;
  const totalResults = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const activePage = Math.min(page, totalPages);

  const pagedProducts = isLoadMoreMode
    ? sortedProducts.slice(0, activePage * pageSize)
    : sortedProducts.slice((activePage - 1) * pageSize, activePage * pageSize);

  const resultStart = totalResults === 0 ? 0 : isLoadMoreMode ? 1 : (activePage - 1) * pageSize + 1;
  const resultEnd = totalResults === 0 ? 0 : pagedProducts.length + (isLoadMoreMode ? 0 : (activePage - 1) * pageSize);

  const handleFiltersChange = useCallback((nextFilters) => {
    setFilters((prevFilters) => {
      const filtersChanged = !areFiltersEqual(prevFilters, nextFilters);

      if (filtersChanged) {
        setPage(1);
        setIsLoadMoreMode(false);
        return nextFilters;
      }

      return prevFilters;
    });
  }, []);

  const handleSortChange = (event) => {
    setSort(event.target.value);
    setPage(1);
    setIsLoadMoreMode(false);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    setIsLoadMoreMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadMore = () => {
    setIsLoadMoreMode(true);
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  const loadingCards = Array.from({ length: pageSize }, (_, index) => index);
  const primaryCategory = filters.categories.length === 1 ? filters.categories[0] : '';
  const pageTitle = primaryCategory
    ? `${primaryCategory} | Shop | Mian & Sons Hardware Store`
    : 'Shop Hardware Products | Mian & Sons Hardware Store';
  const pageDescription = primaryCategory
    ? `Buy ${primaryCategory.toLowerCase()} at Mian & Sons Hardware Store with trusted brands and competitive prices.`
    : 'Browse power tools, hand tools, plumbing, electrical, paints, and construction products at Mian & Sons Hardware Store.';

  const breadcrumbItems = [
    { label: 'Home', to: '/', forceReload: true },
    { label: 'Shop', to: '/shop' }
  ];

  if (primaryCategory) {
    breadcrumbItems.push({
      label: primaryCategory,
      to: `/shop?category=${encodeURIComponent(primaryCategory)}`
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Helmet>

      <Breadcrumb items={breadcrumbItems} className="mb-4" />

      <div className="lg:hidden sticky top-16 bg-white z-20 border border-gray-200 rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <FaFilter size={13} />
          Filter
        </button>
        <select value={sort} onChange={handleSortChange} className="text-sm border-gray-300 rounded-md py-1">
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {isDesktop ? (
          <aside className="hidden lg:block col-span-3">
            <ProductFilters initialFilters={filters} onApplyFilters={handleFiltersChange} />
          </aside>
        ) : (
          <div className="lg:hidden">
            <ProductFilters
              initialFilters={filters}
              onApplyFilters={handleFiltersChange}
              hideMobileTrigger
              mobileOpen={mobileFiltersOpen}
              onMobileOpenChange={setMobileFiltersOpen}
              mobileDrawerPosition="bottom"
            />
          </div>
        )}

        <section className="col-span-12 lg:col-span-9">
          <div className="hidden lg:flex items-center justify-between mb-4 bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-sm text-gray-600">
              Showing {resultStart}-{resultEnd} of {totalResults} results
            </p>

            <div className="flex items-center gap-3">
              <select value={sort} onChange={handleSortChange} className="text-sm border-gray-300 rounded-md py-1.5">
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="inline-flex border border-gray-200 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}
                  aria-label="Grid view"
                >
                  <FaThLarge size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}
                  aria-label="List view"
                >
                  <FaList size={14} />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <ProductCardSkeleton count={loadingCards.length} list={viewMode === 'list'} />
          ) : (
            <>
              {pagedProducts.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                  <p className="text-gray-500">No products found for selected filters.</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-4'}
                >
                  {pagedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} view={viewMode} />
                  ))}
                </motion.div>
              )}
            </>
          )}

          <div className="mt-6 flex flex-col items-center gap-4">
            {activePage < totalPages && (
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-6 py-2.5 rounded-md bg-secondary text-white font-semibold hover:opacity-90"
              >
                Load More
              </button>
            )}

            {totalPages > 1 && (
              <div className="flex items-center flex-wrap justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => handlePageChange(pageNumber)}
                    className={`w-9 h-9 rounded-md text-sm font-semibold ${
                      activePage === pageNumber
                        ? 'bg-primary text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Shop;