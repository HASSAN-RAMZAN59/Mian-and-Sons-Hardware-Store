import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  FaSearch,
  FaTrash,
  FaPrint,
  FaSave,
  FaCheckCircle,
  FaPlus,
  FaMinus,
  FaTimes,
  FaClock,
  FaMoneyBillWave,
  FaCreditCard,
  FaUniversity
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { showPremiumConfirm } from '../../utils/premiumDialogs';
import { discountService } from '../../services/discountService';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import useProductsCatalog from '../../hooks/useProductsCatalog';
import { logAudit } from '../../utils/audit';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { customerService } from '../../services/customerService';

const getProductCode = (id) => `PRD-${String(id).padStart(3, '0')}`;
const getProductName = (product) => `${product.name}${product.size ? ` ${product.size}` : ''}`.trim();

const buildPOSProducts = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((item) => {
    const productId = item.id || item._id;
    return {
      id: productId,
      name: getProductName(item),
      category: item.category,
      price: Number(item.salePrice || item.price || 0),
      stock: Number(item.currentStock ?? item.stockQty ?? item.stock ?? 0),
      code: item.productCode || getProductCode(productId),
      unit: item.unit || 'Piece'
    };
  });

const POS = () => {
  const { products: productsData } = useProductsCatalog();
  const { user } = useAuth();
  const searchRef = useRef(null);
  
  // State management
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('walk-in');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percent'); // percent or amount
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [heldBills, setHeldBills] = useState([]);
  const [customers, setCustomers] = useState([{ id: 'walk-in', name: 'Walk-in Customer' }]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [activeDiscounts, setActiveDiscounts] = useState([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');

  // Initialize products
  useEffect(() => {
    setProducts(buildPOSProducts(productsData));
  }, [productsData]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const rows = await customerService.getAll();
        const mapped = (Array.isArray(rows) ? rows : []).map((account) => ({
          id: String(account.id || account._id || account.email),
          name: account.name || account.fullName || account.email
        }));
        setCustomers([{ id: 'walk-in', name: 'Walk-in Customer' }, ...mapped]);
      } catch {
        setCustomers([{ id: 'walk-in', name: 'Walk-in Customer' }]);
      }
    };

    loadCustomers();

    const loadDiscounts = async () => {
      try {
        const rows = await discountService.getActive();
        setActiveDiscounts(Array.isArray(rows) ? rows : (rows.data || []));
      } catch {
        setActiveDiscounts([]);
      }
    };
    loadDiscounts();
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Enter') {
        const target = e.target;
        const tagName = target?.tagName?.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        if (cart.length > 0) handleCompleteSale();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearCart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart]);

  // Categories
  const categories = ['All', ...new Set(products.map((product) => product.category))];

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Add to cart
  const addToCart = (product) => {
    if (product.stock <= 0) {
      toast.error('Product is out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Cannot add more than available stock!');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      toast.success(`${product.name} added to cart`);
    }
  };

  // Update quantity
  const updateQuantity = (productId, newQuantity) => {
    const product = products.find(p => p.id === productId);
    if (newQuantity > product.stock) {
      toast.error('Cannot exceed available stock!');
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'percent' 
    ? (subtotal * discount / 100) 
    : discount;
  const tax = (subtotal - discountAmount) * 0.00; // 0% tax for now
  const grandTotal = subtotal - discountAmount + tax;
  const changeAmount = cashReceived ? parseFloat(cashReceived) - grandTotal : 0;

  // Clear cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    showPremiumConfirm({
      title: 'Clear Cart',
      text: 'Are you sure you want to clear the cart?',
      confirmText: 'Clear Cart',
      cancelText: 'Cancel',
      icon: 'warning'
    }).then((confirmed) => {
      if (!confirmed) return;
      setCart([]);
      setDiscount(0);
      setSelectedDiscountId('');
      setCashReceived('');
      toast.info('Cart cleared');
    });
  };

  // Hold bill
  const handleHoldBill = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty!');
      return;
    }
    const bill = {
      id: Date.now(),
      customer: customers.find(c => String(c.id) === String(selectedCustomer))?.name || 'Walk-in Customer',
      customerId: selectedCustomer,
      items: [...cart],
      subtotal,
      discountValue: discount,
      discountType,
      discountAmount,
      total: grandTotal,
      paymentMethod,
      time: new Date().toLocaleTimeString()
    };
    setHeldBills([...heldBills, bill]);
    setCart([]);
    setDiscount(0);
    setCashReceived('');
    toast.success('Bill held successfully!');
  };

  // Complete sale
  const handleCompleteSale = async () => {
    if (!canCreateSale) {
      toast.error('You do not have permission to complete sales');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty!');
      return;
    }

    const receivedCash = paymentMethod === 'Cash'
      ? (parseFloat(cashReceived) || grandTotal)
      : 0;

    if (paymentMethod === 'Cash' && receivedCash < grandTotal) {
      toast.error('Insufficient cash received!');
      return;
    }

    const hasInsufficientStock = cart.some((cartItem) => {
      const stockItem = products.find((item) => String(item.id) === String(cartItem.id));
      return !stockItem || Number(stockItem.stock || 0) < cartItem.quantity;
    });

    if (hasInsufficientStock) {
      toast.error('One or more items have insufficient stock');
      return;
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const saleRecord = {
      invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      customerId: selectedCustomer,
      customerName: customers.find((c) => String(c.id) === String(selectedCustomer))?.name || 'Walk-in Customer',
      items: cart.map((item) => ({
        productId: item.id,
        productCode: item.code,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.quantity * item.price
      })),
      subtotal,
      discountType,
      discountValue: discount,
      discountAmount,
      tax,
      grandTotal,
      paymentMethod,
      cashReceived: paymentMethod === 'Cash' ? Number(receivedCash) : null,
      changeAmount: paymentMethod === 'Cash' ? Number(receivedCash - grandTotal) : 0,
      cashier: user?.name || user?.email || 'Current User',
      source: 'pos',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      total: grandTotal,
      totals: {
        discountId: selectedDiscountId || null
      }
    };

    try {
      await orderService.create(saleRecord);
    } catch (error) {
      toast.error('Unable to complete sale. Please try again.');
      return;
    }

    setProducts((prev) =>
      prev.map((item) => {
        const cartItem = cart.find((row) => String(row.id) === String(item.id));
        if (!cartItem) return item;
        return {
          ...item,
          stock: Math.max(Number(item.stock || 0) - cartItem.quantity, 0)
        };
      })
    );

    logAudit({
      user,
      action: 'Created',
      module: 'Sales',
      description: `POS sale ${invoiceNumber} completed`
    });

    toast.success(`Sale completed successfully! (${invoiceNumber})`);
    toast.info('Receipt printed!');

    // Clear cart
    setCart([]);
    setDiscount(0);
    setSelectedDiscountId('');
    setCashReceived('');
    setSelectedCustomer('walk-in');
  };

  // Print receipt
  const handlePrintReceipt = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty!');
      return;
    }
    toast.info('Printing receipt...');
  };

  // Check permissions
  const canAccess = hasPermission(user?.role, 'pos', 'view');
  const canCreateSale = hasPermission(user?.role, 'pos', 'create');

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You do not have permission to access POS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-hidden">
        
        {/* LEFT PANEL - Products (60%) */}
        <div className="lg:col-span-3 flex flex-col space-y-4 overflow-hidden">
          {/* Search Bar */}
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by name or code (F1)..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    product.stock <= 0
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-50 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-green-500 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
                      {product.name}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{product.code}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-yellow-400 dark:text-yellow-300">
                      Rs. {product.price.toLocaleString()}
                    </p>
                    {product.stock <= 0 ? (
                      <Badge variant="danger">Out</Badge>
                    ) : product.stock < 10 ? (
                      <Badge variant="warning">{product.stock}</Badge>
                    ) : (
                      <Badge variant="success">{product.stock}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Cart (40%) */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Current Sale</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <FaClock className="mr-1" />
                    {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Customer Selector */}
              <div className="mb-4">
                <Select
                  label="Customer"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  options={customers.map(c => ({ value: c.id, label: c.name }))}
                />
              </div>

              {/* Quick Payment Method */}
              <div className="mb-4">
                <Select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Card', label: 'Card' },
                    { value: 'Bank', label: 'Bank' },
                    { value: 'Credit', label: 'Credit' }
                  ]}
                />
              </div>

              {/* Cart Items */}
              <div className="flex-1 min-h-[200px] overflow-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                    <p>Cart is empty</p>
                  </div>
                ) : (
                  <table className="min-w-[560px] w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                      <tr className="text-left text-gray-600 dark:text-gray-300">
                        <th className="p-3 font-semibold">Item</th>
                        <th className="p-3 font-semibold text-right">Price</th>
                        <th className="p-3 font-semibold text-center">Qty</th>
                        <th className="p-3 font-semibold text-right">Total</th>
                        <th className="p-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {cart.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-3 align-top">
                            <div className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.code}
                            </div>
                          </td>
                          <td className="p-3 text-right align-top">
                            <span className="text-yellow-400 dark:text-yellow-300">Rs. {item.price.toLocaleString()}</span>
                          </td>
                          <td className="p-3 align-top">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                aria-label={`Decrease quantity for ${item.name}`}
                              >
                                <FaMinus size={10} />
                              </button>
                              <span className="w-10 text-center font-semibold text-gray-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                aria-label={`Increase quantity for ${item.name}`}
                              >
                                <FaPlus size={10} />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right align-top font-bold">
                            <span className="text-yellow-400 dark:text-yellow-300">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                          </td>
                          <td className="p-3 text-right align-top">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-600 hover:text-red-800"
                              aria-label={`Remove ${item.name}`}
                            >
                              <FaTimes />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-semibold text-yellow-400 dark:text-yellow-300">Rs. {subtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                  <div className="flex flex-col space-y-2 flex-1 ml-4">
                    <select
                      value={selectedDiscountId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedDiscountId(id);
                        const disc = activeDiscounts.find(d => String(d.id || d._id) === String(id));
                        if (disc) {
                          setDiscount(disc.value);
                          setDiscountType(disc.type === 'Percentage' ? 'percent' : 'amount');
                        } else {
                          setDiscount(0);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Manual / No Discount</option>
                      {activeDiscounts.map(d => (
                        <option key={d.id || d._id} value={d.id || d._id}>{d.name} ({d.value}{d.type === 'Percentage' ? '%' : ' Rs.'})</option>
                      ))}
                    </select>

                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => {
                          setDiscount(parseFloat(e.target.value) || 0);
                          if (selectedDiscountId) setSelectedDiscountId(''); // Switch back to manual
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="percent">%</option>
                        <option value="amount">Rs.</option>
                      </select>
                      <span className="font-semibold text-red-600 ml-auto">-Rs. {discountAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="font-semibold text-yellow-400 dark:text-yellow-300">Rs. {tax.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
                  <span className="text-gray-900 dark:text-white">Grand Total:</span>
                  <span className="text-green-600">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Cash Payment Details */}
              {paymentMethod === 'Cash' && (
                <div className="mb-4 space-y-2">
                  <Input
                    label="Cash Received"
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter amount received"
                  />
                  {cashReceived && (
                    <div className={`p-3 rounded-lg ${
                      changeAmount >= 0 
                        ? 'bg-green-50 dark:bg-green-900/20' 
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`font-semibold ${
                          changeAmount >= 0 
                            ? 'text-green-700 dark:text-green-400' 
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          Change:
                        </span>
                        <span className={`text-xl font-bold ${
                          changeAmount >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          Rs. {Math.abs(changeAmount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 mt-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  icon={<FaPrint />}
                  onClick={handlePrintReceipt}
                  disabled={cart.length === 0}
                >
                  Print
                </Button>
                <Button
                  variant="warning"
                  icon={<FaSave />}
                  onClick={handleHoldBill}
                  disabled={cart.length === 0}
                >
                  Hold
                </Button>
                <Button
                  variant="danger"
                  icon={<FaTrash />}
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                >
                  Clear
                </Button>
                <Button
                  variant="success"
                  icon={<FaCheckCircle />}
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0 || !canCreateSale}
                >
                  Complete
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Bar - Held Bills */}
      {heldBills.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaClock className="text-yellow-600" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Held Bills: {heldBills.length}
              </span>
            </div>
            <div className="flex space-x-2 overflow-x-auto">
              {heldBills.map((bill, index) => (
                <button
                  key={bill.id}
                  onClick={() => {
                    setCart(bill.items);
                    setDiscount(Number(bill.discountValue || 0));
                    setDiscountType(bill.discountType || 'percent');
                    setSelectedCustomer(bill.customerId || 'walk-in');
                    setPaymentMethod(bill.paymentMethod || 'Cash');
                    setHeldBills(heldBills.filter(b => b.id !== bill.id));
                    toast.info('Bill restored to cart');
                  }}
                  className="px-3 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-md hover:bg-yellow-300 dark:hover:bg-yellow-700 whitespace-nowrap text-sm"
                >
                  Bill #{index + 1} - {bill.customer} - Rs. {bill.total.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Shortcuts: F1 = Search | Enter = Complete Sale | ESC = Clear Cart
      </div>
    </div>
  );
};

export default POS;
