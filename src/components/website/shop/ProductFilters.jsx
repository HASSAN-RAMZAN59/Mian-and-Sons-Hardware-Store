import React, { useEffect, useMemo, useState } from 'react';
import { FaChevronDown, FaFilter, FaTimes } from 'react-icons/fa';
import useProductsCatalog from '../../../hooks/useProductsCatalog';

const presetRanges = [
  { label: 'Under Rs.5,000', min: 0, max: 5000 },
  { label: 'Rs.5,000 - 20,000', min: 5000, max: 20000 },
  { label: 'Rs.20,000 - 50,000', min: 20000, max: 50000 },
  { label: 'Above Rs.50,000', min: 50000, max: 500000 }
];

const sectionKeys = ['categories', 'brands', 'price', 'availability', 'rating', 'discount'];

const normalizeFilterValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ProductFilters = ({
  onApplyFilters,
  initialFilters = {},
  hideMobileTrigger = false,
  mobileOpen,
  onMobileOpenChange,
  mobileDrawerPosition = 'left'
}) => {
  const { products: productsData } = useProductsCatalog();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    categories: true,
    brands: true,
    price: true,
    availability: true,
    rating: true,
    discount: true
  });

  const [selectedCategories, setSelectedCategories] = useState(initialFilters.categories || []);
  const [selectedBrands, setSelectedBrands] = useState(initialFilters.brands || []);
  const [minPrice, setMinPrice] = useState(initialFilters.priceRange?.min ?? 0);
  const [maxPrice, setMaxPrice] = useState(initialFilters.priceRange?.max ?? 500000);
  const [inStockOnly, setInStockOnly] = useState(initialFilters.availability?.inStockOnly ?? false);
  const [includeOutOfStock, setIncludeOutOfStock] = useState(initialFilters.availability?.includeOutOfStock ?? true);
  const [rating, setRating] = useState(initialFilters.rating || 'all');
  const [onSaleOnly, setOnSaleOnly] = useState(initialFilters.onSaleOnly ?? false);
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(initialFilters.newArrivalsOnly ?? false);

  const categoryOptions = useMemo(() => {
    const map = new Map();
    (Array.isArray(productsData) ? productsData : []).forEach((item) => {
      const label = String(item?.category || '').trim();
      const normalized = normalizeFilterValue(label);
      if (!label || !normalized) return;

      const current = map.get(normalized);
      if (current) {
        map.set(normalized, { label: current.label, count: current.count + 1 });
        return;
      }

      map.set(normalized, { label, count: 1 });
    });
    return [...map.values()]
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [productsData]);

  const brandOptions = useMemo(() => {
    const map = new Map();
    (Array.isArray(productsData) ? productsData : []).forEach((item) => {
      const label = String(item?.company || item?.brand || '').trim();
      if (!label) return;
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [productsData]);

  useEffect(() => {
    const categoriesChanged = JSON.stringify(selectedCategories) !== JSON.stringify(initialFilters.categories || []);
    if (categoriesChanged) setSelectedCategories(initialFilters.categories || []);

    const brandsChanged = JSON.stringify(selectedBrands) !== JSON.stringify(initialFilters.brands || []);
    if (brandsChanged) setSelectedBrands(initialFilters.brands || []);

    if (minPrice !== (initialFilters.priceRange?.min ?? 0)) setMinPrice(initialFilters.priceRange?.min ?? 0);
    if (maxPrice !== (initialFilters.priceRange?.max ?? 500000)) setMaxPrice(initialFilters.priceRange?.max ?? 500000);
    if (inStockOnly !== (initialFilters.availability?.inStockOnly ?? false)) setInStockOnly(initialFilters.availability?.inStockOnly ?? false);
    if (includeOutOfStock !== (initialFilters.availability?.includeOutOfStock ?? true)) setIncludeOutOfStock(initialFilters.availability?.includeOutOfStock ?? true);
    if (rating !== (initialFilters.rating || 'all')) setRating(initialFilters.rating || 'all');
    if (onSaleOnly !== (initialFilters.onSaleOnly ?? false)) setOnSaleOnly(initialFilters.onSaleOnly ?? false);
    if (newArrivalsOnly !== (initialFilters.newArrivalsOnly ?? false)) setNewArrivalsOnly(initialFilters.newArrivalsOnly ?? false);
  }, [
    initialFilters.categories,
    initialFilters.brands,
    initialFilters.priceRange?.min,
    initialFilters.priceRange?.max,
    initialFilters.availability?.inStockOnly,
    initialFilters.availability?.includeOutOfStock,
    initialFilters.rating,
    initialFilters.onSaleOnly,
    initialFilters.newArrivalsOnly,
    selectedCategories,
    selectedBrands,
    minPrice,
    maxPrice,
    inStockOnly,
    includeOutOfStock,
    rating,
    onSaleOnly,
    newArrivalsOnly
  ]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isControlledMobile = typeof mobileOpen === 'boolean';
  const mobileDrawerOpen = isControlledMobile ? mobileOpen : isMobileOpen;
  const setMobileDrawerOpen = (nextValue) => {
    if (!isControlledMobile) setIsMobileOpen(nextValue);
    if (onMobileOpenChange) onMobileOpenChange(nextValue);
  };

  const toggleSelection = (value, selectedList, setter) => {
    setter(
      selectedList.includes(value)
        ? selectedList.filter((item) => item !== value)
        : [...selectedList, value]
    );
  };

  const filterState = useMemo(
    () => ({
      categories: selectedCategories,
      brands: selectedBrands,
      priceRange: { min: minPrice, max: maxPrice },
      availability: { inStockOnly, includeOutOfStock },
      rating,
      onSaleOnly,
      newArrivalsOnly
    }),
    [selectedCategories, selectedBrands, minPrice, maxPrice, inStockOnly, includeOutOfStock, rating, onSaleOnly, newArrivalsOnly]
  );

  useEffect(() => {
    if (onApplyFilters) onApplyFilters(filterState);
  }, [filterState, onApplyFilters]);

  const activeChips = useMemo(() => {
    const chips = [];

    selectedCategories.forEach((item) => chips.push({ key: `cat-${item}`, label: item, type: 'category' }));
    selectedBrands.forEach((item) => chips.push({ key: `brand-${item}`, label: item, type: 'brand' }));

    if (minPrice !== 0 || maxPrice !== 500000) {
      chips.push({ key: 'price-range', label: `Rs.${minPrice} - Rs.${maxPrice}`, type: 'price' });
    }

    if (inStockOnly) chips.push({ key: 'in-stock', label: 'In Stock only', type: 'availability-in' });
    if (!includeOutOfStock) chips.push({ key: 'exclude-out', label: 'Exclude Out of Stock', type: 'availability-out' });
    if (rating !== 'all') chips.push({ key: 'rating', label: `${rating}⭐ & above`, type: 'rating' });
    if (onSaleOnly) chips.push({ key: 'sale', label: 'On Sale only', type: 'sale' });

    return chips;
  }, [selectedCategories, selectedBrands, minPrice, maxPrice, inStockOnly, includeOutOfStock, rating, onSaleOnly]);

  const removeChip = (chip) => {
    if (chip.type === 'category') {
      setSelectedCategories((prev) => prev.filter((item) => item !== chip.label));
    } else if (chip.type === 'brand') {
      setSelectedBrands((prev) => prev.filter((item) => item !== chip.label));
    } else if (chip.type === 'price') {
      setMinPrice(0);
      setMaxPrice(500000);
    } else if (chip.type === 'availability-in') {
      setInStockOnly(false);
    } else if (chip.type === 'availability-out') {
      setIncludeOutOfStock(true);
    } else if (chip.type === 'rating') {
      setRating('all');
    } else if (chip.type === 'sale') {
      setOnSaleOnly(false);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMinPrice(0);
    setMaxPrice(500000);
    setInStockOnly(false);
    setIncludeOutOfStock(true);
    setRating('all');
    setOnSaleOnly(false);
  };

  const applyFilters = () => {
    if (onApplyFilters) onApplyFilters(filterState);
    setMobileDrawerOpen(false);
  };

  const FilterSection = ({ sectionKey, title, children }) => (
    <div className="border-b border-gray-200 py-3">
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-semibold text-primary">{title}</span>
        <FaChevronDown
          size={12}
          className={`text-gray-500 transition-transform ${openSections[sectionKey] ? 'rotate-180' : ''}`}
        />
      </button>

      {openSections[sectionKey] && <div className="mt-3">{children}</div>}
    </div>
  );

  return (
    <aside>
      {!hideMobileTrigger && <div className="lg:hidden mb-3">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold"
        >
          <FaFilter size={14} />
          Filters
        </button>
      </div>}

      <div className={`${mobileDrawerOpen ? 'fixed inset-0 z-50' : 'hidden'} lg:hidden`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setMobileDrawerOpen(false)} />
        <div
          className={
            mobileDrawerPosition === 'bottom'
              ? 'absolute bottom-0 left-0 right-0 h-[85vh] bg-white p-4 overflow-y-auto rounded-t-2xl'
              : 'absolute left-0 top-0 h-full w-[90%] max-w-sm bg-white p-4 overflow-y-auto'
          }
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-primary">Filters</h3>
            <button type="button" onClick={() => setMobileDrawerOpen(false)} className="text-gray-500">
              <FaTimes />
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => sectionKeys.forEach((key) => setOpenSections((prev) => ({ ...prev, [key]: true })))}
              className="text-xs text-primary underline"
            >
              Expand all
            </button>
          </div>

          <div className="mt-3">
            {activeChips.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <span key={chip.key} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs">
                    {chip.label}
                    <button type="button" onClick={() => removeChip(chip)} className="hover:text-orange-900">
                      <FaTimes size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <FilterSection sectionKey="categories" title="Categories">
              <div className="space-y-2">
                {categoryOptions.map((option) => (
                  <label key={option.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(option.label)}
                        onChange={() => toggleSelection(option.label, selectedCategories, setSelectedCategories)}
                        className="rounded border-gray-300"
                      />
                      {option.label}
                    </span>
                    <span className="text-gray-400">({option.count})</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection sectionKey="brands" title="Brands">
              <div className="space-y-2">
                {brandOptions.map((option) => (
                  <label key={option.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(option.label)}
                        onChange={() => toggleSelection(option.label, selectedBrands, setSelectedBrands)}
                        className="rounded border-gray-300"
                      />
                      {option.label}
                    </span>
                    <span className="text-gray-400">({option.count})</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection sectionKey="price" title="Price Range">
              <div className="space-y-3">
                <input
                  type="range"
                  min={0}
                  max={500000}
                  step={100}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(Number(event.target.value))}
                  className="w-full accent-secondary"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxPrice}
                    value={minPrice}
                    onChange={(event) => setMinPrice(Number(event.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 text-sm"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min={minPrice}
                    max={500000}
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(Number(event.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 text-sm"
                    placeholder="Max"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {presetRanges.map((range) => (
                    <button
                      key={range.label}
                      type="button"
                      onClick={() => {
                        setMinPrice(range.min);
                        setMaxPrice(range.max);
                      }}
                      className="text-left text-xs px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </FilterSection>

            <FilterSection sectionKey="availability" title="Availability">
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => setInStockOnly(event.target.checked)}
                    className="rounded border-gray-300"
                  />
                  In Stock only
                </label>
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={includeOutOfStock}
                    onChange={(event) => setIncludeOutOfStock(event.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Include Out of Stock
                </label>
              </div>
            </FilterSection>

            <FilterSection sectionKey="rating" title="Rating">
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="rating-mobile"
                    checked={rating === '4'}
                    onChange={() => setRating('4')}
                  />
                  4⭐ & above
                </label>
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="rating-mobile"
                    checked={rating === '3'}
                    onChange={() => setRating('3')}
                  />
                  3⭐ & above
                </label>
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="rating-mobile"
                    checked={rating === 'all'}
                    onChange={() => setRating('all')}
                  />
                  All ratings
                </label>
              </div>
            </FilterSection>

            <FilterSection sectionKey="discount" title="Discount">
              <label className="inline-flex items-center cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={onSaleOnly}
                  onChange={(event) => setOnSaleOnly(event.target.checked)}
                  className="sr-only peer"
                />
                <span className="relative w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-secondary transition-colors">
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${onSaleOnly ? 'translate-x-5' : ''}`} />
                </span>
                <span className="text-sm text-gray-700">On Sale only</span>
              </label>
            </FilterSection>

            <div className="flex items-center justify-between mt-4 gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear All Filters
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block rounded-xl border border-gray-200 bg-white p-4 sticky top-24">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-primary">Filters</h3>
          <button type="button" onClick={clearAllFilters} className="text-xs text-secondary font-semibold hover:underline">
            Clear All Filters
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <span key={chip.key} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs">
                {chip.label}
                <button type="button" onClick={() => removeChip(chip)} className="hover:text-orange-900">
                  <FaTimes size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        <FilterSection sectionKey="categories" title="Categories">
          <div className="space-y-2">
            {categoryOptions.map((option) => (
              <label key={option.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(option.label)}
                    onChange={() => toggleSelection(option.label, selectedCategories, setSelectedCategories)}
                    className="rounded border-gray-300"
                  />
                  {option.label}
                </span>
                <span className="text-gray-400">({option.count})</span>
              </label>
            ))}
          </div>
        </FilterSection>

        <FilterSection sectionKey="brands" title="Brands">
          <div className="space-y-2">
            {brandOptions.map((option) => (
              <label key={option.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(option.label)}
                    onChange={() => toggleSelection(option.label, selectedBrands, setSelectedBrands)}
                    className="rounded border-gray-300"
                  />
                  {option.label}
                </span>
                <span className="text-gray-400">({option.count})</span>
              </label>
            ))}
          </div>
        </FilterSection>

        <FilterSection sectionKey="price" title="Price Range">
          <div className="space-y-3">
            <input
              type="range"
              min={0}
              max={500000}
              step={100}
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className="w-full accent-secondary"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                max={maxPrice}
                value={minPrice}
                onChange={(event) => setMinPrice(Number(event.target.value) || 0)}
                className="w-full rounded-md border border-gray-300 text-sm"
                placeholder="Min"
              />
              <input
                type="number"
                min={minPrice}
                max={500000}
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value) || 0)}
                className="w-full rounded-md border border-gray-300 text-sm"
                placeholder="Max"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              {presetRanges.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => {
                    setMinPrice(range.min);
                    setMaxPrice(range.max);
                  }}
                  className="text-left text-xs px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </FilterSection>

        <FilterSection sectionKey="availability" title="Availability">
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
                className="rounded border-gray-300"
              />
              In Stock only
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={includeOutOfStock}
                onChange={(event) => setIncludeOutOfStock(event.target.checked)}
                className="rounded border-gray-300"
              />
              Include Out of Stock
            </label>
          </div>
        </FilterSection>

        <FilterSection sectionKey="rating" title="Rating">
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 text-gray-700">
              <input type="radio" name="rating-desktop" checked={rating === '4'} onChange={() => setRating('4')} />
              4⭐ & above
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input type="radio" name="rating-desktop" checked={rating === '3'} onChange={() => setRating('3')} />
              3⭐ & above
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input type="radio" name="rating-desktop" checked={rating === 'all'} onChange={() => setRating('all')} />
              All ratings
            </label>
          </div>
        </FilterSection>

        <FilterSection sectionKey="discount" title="Discount">
          <label className="inline-flex items-center cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={(event) => setOnSaleOnly(event.target.checked)}
              className="sr-only peer"
            />
            <span className="relative w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-secondary transition-colors">
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${onSaleOnly ? 'translate-x-5' : ''}`} />
            </span>
            <span className="text-sm text-gray-700">On Sale only</span>
          </label>
        </FilterSection>
      </div>
    </aside>
  );
};

export default ProductFilters;