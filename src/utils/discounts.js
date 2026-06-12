const normalizeText = (value) => String(value || '').trim().toLowerCase();

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinRange = (start, end, now = new Date()) => {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;
  return true;
};

const getProductDisplayName = (product) => {
  if (!product) return '';
  const name = product.name || '';
  const size = product.size || '';
  return `${name}${size ? ` ${size}` : ''}`.trim();
};

const matchesDiscountTarget = (discount, product) => {
  const scope = normalizeText(discount.applicableOn || 'all');
  if (scope === 'all') return true;

  if (scope === 'category') {
    return normalizeText(discount.categoryName) === normalizeText(product.category);
  }

  if (scope === 'product') {
    const targetName = normalizeText(discount.productName);
    if (!targetName) return false;
    const productName = normalizeText(getProductDisplayName(product));
    return targetName === productName || targetName === normalizeText(product.name);
  }

  return false;
};

const getDiscountAmount = (basePrice, discount) => {
  const value = Number(discount.value || 0);
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (normalizeText(discount.type) === 'percentage') {
    return (basePrice * value) / 100;
  }

  return value;
};

const normalizeDiscount = (discount) => {
  if (!discount || typeof discount !== 'object') return null;
  const id = discount.id ?? discount._id ?? discount.discountId ?? '';

  return {
    id: String(id || ''),
    rawId: id,
    name: discount.name || discount.title || 'Discount',
    code: discount.code || '',
    type: discount.type || discount.discountType || 'Percentage',
    value: Number(discount.value ?? discount.amount ?? 0),
    applicableOn: discount.applicableOn || discount.scope || 'All',
    categoryName: discount.categoryName || discount.category || '',
    productName: discount.productName || discount.product || '',
    validFrom: discount.validFrom || discount.startDate || '',
    validTo: discount.validTo || discount.endDate || '',
    status: discount.status || (discount.isActive ? 'Active' : 'Inactive'),
    description: discount.description || '',
    minOrderAmount: Number(discount.minOrderAmount || 0),
    maxDiscount: discount.maxDiscount !== undefined ? Number(discount.maxDiscount) : null,
  };
};

const getActiveDiscounts = (discounts = [], now = new Date()) =>
  discounts
    .map(normalizeDiscount)
    .filter(Boolean)
    .filter((discount) => normalizeText(discount.status) === 'active')
    .filter((discount) => isWithinRange(discount.validFrom, discount.validTo, now));

const applyDiscountsToProduct = (product, discounts = []) => {
  if (!product) return product;

  const basePrice = Number(product.price ?? product.salePrice ?? 0);
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { ...product, price: 0, salePrice: null, discountPercent: 0, discountAmount: 0 };
  }

  let best = null;
  let bestAmount = 0;

  discounts.forEach((discount) => {
    if (!matchesDiscountTarget(discount, product)) return;
    const amount = getDiscountAmount(basePrice, discount);
    if (amount > bestAmount) {
      bestAmount = amount;
      best = discount;
    }
  });

  if (!best || bestAmount <= 0) {
    return {
      ...product,
      price: basePrice,
      salePrice: null,
      discountPercent: 0,
      discountAmount: 0
    };
  }

  const discountedPrice = Math.max(0, basePrice - bestAmount);
  const percent =
    normalizeText(best.type) === 'percentage'
      ? Number(best.value || 0)
      : Math.round((bestAmount / basePrice) * 100);

  return {
    ...product,
    price: basePrice,
    salePrice: discountedPrice,
    discountPercent: Number.isFinite(percent) ? percent : 0,
    discountAmount: Number(bestAmount.toFixed(2)),
    discountId: best.id,
    discountName: best.name
  };
};

const applyDiscountsToProducts = (products = [], discounts = []) => {
  if (!Array.isArray(products)) return [];
  return products.map((product) => applyDiscountsToProduct(product, discounts));
};

export {
  normalizeDiscount,
  getActiveDiscounts,
  applyDiscountsToProduct,
  applyDiscountsToProducts
};
