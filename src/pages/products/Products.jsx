import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaEye, FaFileExcel, FaFileUpload } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import { handleImageError, resolveImageUrl } from '../../utils/helpers';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { branchService } from '../../services/branchService';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PRODUCTS_KEY = 'admin_products';

const readStoredProducts = () => {
  try {
    const rawData = localStorage.getItem(PRODUCTS_KEY);
    if (!rawData) return null;
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const Products = () => {
  const { user } = useAuth();
  const importInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [apiBranches, setApiBranches] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    status: '',
    stockStatus: ''
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  // Selected data
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    brand: '',
    model: '',
    description: '',
    purchasePrice: '',
    salePrice: '',
    wholesalePrice: '',
    minStock: '',
    currentStock: '',
    unit: 'Piece',
    supplier: '',
    branch: '',
    image: '',
    warrantyPeriod: '',
    status: 'Active'
  });

  // Category options come from categories API with fallback from product rows
  const categoriesFromProducts = Array.from(new Set(products.map((product) => product.category)))
    .filter(Boolean)
    .map((category) => ({ value: category, label: category }));

  const categories = Array.from(
    new Map(
      [...apiCategories, ...categoriesFromProducts].map((item) => [String(item.value), item])
    ).values()
  );

  const brands = Array.from(new Set(products.map((product) => product.company)))
    .filter(Boolean)
    .map((brand) => ({ value: brand, label: brand }));

  const suppliers = Array.from(new Set(products.map((product) => product.company)))
    .filter(Boolean)
    .map((company) => ({ value: `${company} Supplies`, label: `${company} Supplies` }));

  // Branches fetched from API
  const branches = apiBranches.length > 0 ? apiBranches : [];

  const units = [
    { value: 'Piece', label: 'Piece' },
    { value: 'Kg', label: 'Kilogram' },
    { value: 'Meter', label: 'Meter' },
    { value: 'Box', label: 'Box' },
    { value: 'Liter', label: 'Liter' },
    { value: 'Pack', label: 'Pack' }
  ];

  // Load products from backend
  useEffect(() => {
    setLoading(true);
    productService.getAll()
      .then((data) => {
        setProducts(data);
        setFilteredProducts(data);
      })
      .catch(() => {
        toast.error('Failed to fetch products from backend');
      })
      .finally(() => setLoading(false));
  }, []);

  // Refresh products when inventory changes elsewhere (e.g., order placed)
  useEffect(() => {
    const onRefresh = async (e) => {
      try {
        setLoading(true);
        const data = await productService.getAll();
        setProducts(data);
        setFilteredProducts(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    const onStorage = (ev) => {
      if (ev.key === 'products:refresh') {
        onRefresh();
      }
    };
    window.addEventListener('products:refresh', onRefresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('products:refresh', onRefresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    categoryService.getAll()
      .then((rows) => {
        const options = (Array.isArray(rows) ? rows : [])
          .map((row) => {
            const value = row?.name || row?.category || row?.title || '';
            if (!value) return null;
            return { value, label: value };
          })
          .filter(Boolean);
        setApiCategories(options);
      })
      .catch(() => {
        setApiCategories([]);
      });
  }, []);

  // Load branches from API
  useEffect(() => {
    branchService.getAll()
      .then((rows) => {
        const options = (Array.isArray(rows) ? rows : [])
          .map((row) => {
            const value = row?.name || row?.title || '';
            if (!value) return null;
            return { value, label: value };
          })
          .filter(Boolean);
        setApiBranches(options);
      })
      .catch(() => {
        setApiBranches([]);
      });
  }, []);

  // No more localStorage sync

  // Filter and search products
  useEffect(() => {
    let result = products;

    // Search
    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter(p => {
        const name = (p && p.name) ? String(p.name) : '';
        const code = (p && p.code) ? String(p.code) : '';
        const brand = (p && p.brand) ? String(p.brand) : '';
        const hay = `${name} ${code} ${brand}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // Category filter
    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }

    // Brand filter
    if (filters.brand) {
      result = result.filter(p => p.brand === filters.brand);
    }

    // Status filter
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }

    // Stock status filter
    if (filters.stockStatus) {
      result = result.filter(p => {
        if (filters.stockStatus === 'Out of Stock') return p.currentStock === 0;
        if (filters.stockStatus === 'Low Stock') return p.currentStock > 0 && p.currentStock < p.minStock;
        if (filters.stockStatus === 'In Stock') return p.currentStock >= p.minStock;
        return true;
      });
    }

    setFilteredProducts(result);
  }, [search, filters, products]);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => {
      if (selectedImagePreview && selectedImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const resetForm = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview('');
    setResetKey(prev => prev + 1);
    setFormData({
      name: '',
      code: '',
      category: '',
      brand: '',
      model: '',
      description: '',
      purchasePrice: '',
      salePrice: '',
      wholesalePrice: '',
      minStock: '',
      currentStock: '',
      unit: 'Piece',
      supplier: '',
      branch: '',
      image: '',
      warrantyPeriod: '',
      status: 'Active'
    });
  };

  // Auto-generate product code
  const generateProductCode = () => {
    let maxNum = 0;
    products.forEach(product => {
      const codeStr = String(product.code || '');
      const match = codeStr.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextId = maxNum + 1;
    const code = `PRD-${String(nextId).padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, code }));
  };

  // Add product
  const handleAddProduct = async () => {
    if (!formData.name || !formData.category || !formData.salePrice) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setLoading(true);
      let data = { ...formData };
      if (selectedImageFile) {
        const uploadResult = await productService.uploadImage(selectedImageFile);
        data.image = uploadResult.filename;
      }
      // Map brand to company for backend compatibility
      data.company = data.brand;
      delete data.brand;
      // Remove id/_id if present
      delete data.id;
      delete data._id;
      // Remove blank string fields
      Object.keys(data).forEach(key => {
        if (data[key] === "") delete data[key];
      });
      // Convert prices to float
      if (data.purchasePrice) data.purchasePrice = parseFloat(data.purchasePrice);
      if (data.salePrice) data.salePrice = parseFloat(data.salePrice);
      const newProduct = await productService.create(data);
      // Normalize response so frontend shows expected fields immediately
      const normalizedNew = {
        ...newProduct,
        // backend may return `company` instead of `brand`
        brand: newProduct.brand || newProduct.company || data.brand || '',
        // ensure code present (use submitted form code as fallback)
        code: newProduct.code || data.code || formData.code || '',
        // ensure id is present for selection/consistency (some APIs return _id)
        id: newProduct.id || newProduct.id === 0 ? newProduct.id : (newProduct._id || undefined)
      };
      setProducts([...products, normalizedNew]);
      toast.success('Product added successfully!');
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  // Edit product
  const handleEditProduct = async () => {
    if (!formData.name || !formData.category || !formData.salePrice) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setLoading(true);
      let data = { ...formData };
      if (selectedImageFile) {
        const uploadResult = await productService.uploadImage(selectedImageFile);
        data.image = uploadResult.filename;
      }
      // Map brand to company for backend compatibility
      data.company = data.brand;
      delete data.brand;
      // Remove id/_id if present
      delete data.id;
      delete data._id;
      // Remove blank string fields
      Object.keys(data).forEach(key => {
        if (data[key] === "") delete data[key];
      });
      if (data.purchasePrice) data.purchasePrice = parseFloat(data.purchasePrice);
      if (data.salePrice) data.salePrice = parseFloat(data.salePrice);
      const updated = await productService.update(selectedProduct._id, data);
      // Normalize updated product similarly
      const normalizedUpdated = {
        ...updated,
        brand: updated.brand || updated.company || data.brand || '',
        code: updated.code || data.code || formData.code || '',
        id: updated.id || updated.id === 0 ? updated.id : (updated._id || undefined)
      };
      setProducts(products.map(p => (p._id === selectedProduct._id ? normalizedUpdated : p)));
      toast.success('Product updated successfully!');
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      resetForm();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    try {
      setLoading(true);
      await productService.delete(selectedProduct._id);
      setProducts(products.filter(p => p._id !== selectedProduct._id));
      toast.success('Product deleted successfully!');
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = () => {
    // Bulk delete removed along with selection UI
    setIsBulkDeleteDialogOpen(false);
  };

  // Open edit modal
  const openEditModal = (product) => {
    setSelectedImageFile(null);
    setSelectedImagePreview('');
    setSelectedProduct(product);
    setFormData({ ...product });
    setIsEditModalOpen(true);
  };

  // Open detail modal
  const openDetailModal = (product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  // Bulk select
  const handleSelectAll = (e) => {
    // selection removed
  };


  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportRows = products.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category,
        brand: product.brand,
        model: product.model,
        purchasePrice: Number(product.purchasePrice || 0),
        salePrice: Number(product.salePrice || 0),
        wholesalePrice: Number(product.wholesalePrice || 0),
        currentStock: Number(product.currentStock || 0),
        minStock: Number(product.minStock || 0),
        unit: product.unit,
        supplier: product.supplier,
        branch: product.branch,
        status: product.status,
        warrantyPeriod: Number(product.warrantyPeriod || 0),
        description: product.description,
        image: product.image
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      const dateTag = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `products-export-${dateTag}.xlsx`);
      toast.success('Products exported to Excel successfully.');
    } catch {
      toast.error('Unable to export Excel file.');
    }
  };

  // Import from Excel
  const handleImportExcel = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        toast.error('No worksheet found in uploaded file.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows.length) {
        toast.error('Excel file is empty.');
        return;
      }

      const toNumber = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const mapped = rows
        .map((row, index) => {
          const id = toNumber(row.id || row.ID || index + 1, index + 1);
          const name = String(row.name || row.Name || '').trim();
          const category = String(row.category || row.Category || '').trim();
          const salePrice = toNumber(row.salePrice || row.SalePrice || row['Sale Price']);

          if (!name || !category || salePrice <= 0) {
            return null;
          }

          return {
            id,
            code: String(row.code || row.Code || `PRD-${String(id).padStart(3, '0')}`),
            name,
            category,
            brand: String(row.brand || row.Brand || 'Local'),
            model: String(row.model || row.Model || name),
            description: String(row.description || row.Description || ''),
            purchasePrice: toNumber(row.purchasePrice || row.PurchasePrice || row['Purchase Price']),
            salePrice,
            wholesalePrice: toNumber(
              row.wholesalePrice || row.WholesalePrice || row['Wholesale Price'],
              Number((salePrice * 0.95).toFixed(2))
            ),
            minStock: toNumber(row.minStock || row.MinStock || row['Min Stock'], 5),
            currentStock: toNumber(row.currentStock || row.CurrentStock || row['Current Stock']),
            unit: String(row.unit || row.Unit || 'Piece'),
            supplier: String(row.supplier || row.Supplier || 'General Supplier'),
            branch: String(row.branch || row.Branch || ''),
            image: String(row.image || row.Image || ''),
            warrantyPeriod: toNumber(row.warrantyPeriod || row.WarrantyPeriod || row['Warranty Period']),
            status: String(row.status || row.Status || 'Active')
          };
        })
        .filter(Boolean);

      if (!mapped.length) {
        toast.error('No valid products found. Required columns: name, category, salePrice.');
        return;
      }

      setProducts(mapped);
      toast.success(`${mapped.length} product(s) imported successfully.`);
    } catch {
      toast.error('Failed to import Excel file. Please check file format.');
    } finally {
      event.target.value = '';
    }
  };

  // Get stock status
  const getStockStatus = (product) => {
    if (product.currentStock === 0) return 'Out';
    if (product.currentStock < product.minStock) return 'Low';
    return 'In Stock';
  };

  // Get stock badge variant
  const getStockBadgeVariant = (product) => {
    if (product.currentStock === 0) return 'danger';
    if (product.currentStock < product.minStock) return 'warning';
    return 'success';
  };

  // Table columns
  const columns = [
    {
      key: 'sn',
      label: '#',
      render: (row, rowIndex) => (
        <span className="font-medium">{rowIndex + 1}</span>
      )
    },
    
    {
      key: 'image',
      label: 'Image',
      render: (row) => (
        <div className="premium-product-frame w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-100">
          <div className="w-full h-full flex items-center justify-center bg-white">
            <img
              src={resolveImageUrl(row.image)}
              alt={row.name}
              loading="lazy"
              onError={(event) => handleImageError(event, row.name)}
              className="premium-product-image"
            />
          </div>
        </div>
      )
    },
    { key: 'code', label: 'Product ID' },
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'brand', label: 'Brand' },
    { key: 'model', label: 'Model' },
    {
      key: 'purchasePrice',
      label: 'Purchase Price',
      render: (row) => (
        <span className="text-yellow-400 dark:text-yellow-300">Rs. {Number(row.purchasePrice || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'salePrice',
      label: 'Sale Price',
      render: (row) => (
        <span className="text-yellow-400 dark:text-yellow-300">Rs. {Number(row.salePrice || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'currentStock',
      label: 'Stock Qty',
      render: (row) => (
        <span className={`font-semibold ${
          row.currentStock === 0 ? 'text-red-600' : 
          row.currentStock < row.minStock ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          {row.currentStock}
        </span>
      )
    },
    { key: 'minStock', label: 'Min Stock' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'branch', label: 'Branch' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'default'}>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'stockStatus',
      label: 'Stock Status',
      render: (row) => (
        <Badge variant={getStockBadgeVariant(row)}>
          {getStockStatus(row)}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openDetailModal(row)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="View Details"
          >
            <FaEye size={16} />
          </button>
          {hasPermission(user?.role, 'products', 'edit') && (
            <button
              onClick={() => openEditModal(row)}
              className="text-green-600 hover:text-green-800 dark:text-green-400"
              title="Edit"
            >
              <FaEdit size={16} />
            </button>
          )}
          {hasPermission(user?.role, 'products', 'delete') && (
            <button
              onClick={() => openDeleteDialog(row)}
              className="text-red-600 hover:text-red-800 dark:text-red-400"
              title="Delete"
            >
              <FaTrash size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  // Check permissions
  const canCreate = hasPermission(user?.role, 'products', 'create');
  const canExport = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your inventory products</p>
        </div>
        <div className="flex space-x-3">
          {canExport && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFileChange}
                className="hidden"
              />
              <Button variant="outline" icon={<FaFileUpload />} onClick={handleImportExcel}>
                Import Excel
              </Button>
              <Button variant="outline" icon={<FaFileExcel />} onClick={handleExportExcel}>
                Export Excel
              </Button>
            </>
          )}
          {canCreate && (
            <Button variant="primary" icon={<FaPlus />} onClick={() => {
              resetForm();
              generateProductCode();
              setIsAddModalOpen(true);
            }}>
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <SearchBar
            value={search}
            onSearch={setSearch}
            placeholder="Search by name, code, brand..."
            className="md:col-span-2"
          />
          
          <Select
            name="category"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            options={categories}
            placeholder="All Categories"
          />

          <Select
            name="brand"
            value={filters.brand}
            onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
            options={brands}
            placeholder="All Brands"
          />

          <Select
            name="stockStatus"
            value={filters.stockStatus}
            onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
            options={[
              { value: 'In Stock', label: 'In Stock' },
              { value: 'Low Stock', label: 'Low Stock' },
              { value: 'Out of Stock', label: 'Out of Stock' }
            ]}
            placeholder="Stock Status"
          />
        </div>

        {/* Bulk Actions */}
          
      </Card>

      {/* Products Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredProducts}
          emptyMessage="No products found"
          onRowClick={(row) => {
            // Highlight low stock rows
            if (row.currentStock < row.minStock) {
              return 'bg-yellow-50 dark:bg-yellow-900/10';
            }
            if (row.currentStock === 0) {
              return 'bg-red-50 dark:bg-red-900/10';
            }
          }}
        />
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
          resetForm();
          setSelectedProduct(null);
        }}
        title={isAddModalOpen ? 'Add New Product' : 'Edit Product'}
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                resetForm();
                setSelectedProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={isAddModalOpen ? handleAddProduct : handleEditProduct}
            >
              {isAddModalOpen ? 'Add Product' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />

          <div className="flex space-x-2">
            <Input
              label="Product Code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className="flex-1"
              required
            />
            <Button
              variant="outline"
              size="sm"
              onClick={generateProductCode}
              className="mt-7"
            >
              Auto
            </Button>
          </div>

          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            options={categories}
            required
          />

          <Input
            label="Brand"
            name="brand"
            value={formData.brand}
            onChange={handleInputChange}
          />

          <Input
            label="Model"
            name="model"
            value={formData.model}
            onChange={handleInputChange}
          />

          <Select
            label="Unit"
            name="unit"
            value={formData.unit}
            onChange={handleInputChange}
            options={units}
          />

          <Input
            label="Purchase Price (Rs.)"
            name="purchasePrice"
            type="number"
            value={formData.purchasePrice}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Sale Price (Rs.)"
            name="salePrice"
            type="number"
            value={formData.salePrice}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Wholesale Price (Rs.)"
            name="wholesalePrice"
            type="number"
            value={formData.wholesalePrice}
            onChange={handleInputChange}
          />

          <Input
            label="Current Stock"
            name="currentStock"
            type="number"
            value={formData.currentStock}
            onChange={handleInputChange}
          />

          <Input
            label="Min Stock Level"
            name="minStock"
            type="number"
            value={formData.minStock}
            onChange={handleInputChange}
          />

          <Input
            label="Warranty Period (months)"
            name="warrantyPeriod"
            type="number"
            value={formData.warrantyPeriod}
            onChange={handleInputChange}
          />

          <Select
            label="Supplier"
            name="supplier"
            value={formData.supplier}
            onChange={handleInputChange}
            options={suppliers}
          />

          <Select
            label="Branch"
            name="branch"
            value={formData.branch}
            onChange={handleInputChange}
            options={branches}
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          />

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product Image
            </label>
            <input
              key={resetKey}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {selectedImagePreview ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-900/40 dark:bg-green-900/10">
                <img
                  src={selectedImagePreview}
                  alt="Selected product preview"
                  className="premium-product-image h-14 w-14 rounded-md bg-white"
                />
                <p className="text-xs text-green-700 dark:text-green-300 break-all">
                  Selected: {selectedImageFile?.name}
                </p>
              </div>
            ) : formData.image ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-900/40 dark:bg-green-900/10">
                <img
                  src={resolveImageUrl(formData.image)}
                  alt="Selected product"
                  className="premium-product-image h-14 w-14 rounded-md bg-white"
                  onError={(event) => handleImageError(event, 'Selected product')}
                />
                <p className="text-xs text-green-700 dark:text-green-300 break-all">
                  Selected: {formData.image}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </Modal>

      {/* Product Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProduct(null);
        }}
        title="Product Details"
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex items-center justify-center">
                <div className="premium-product-frame w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <img
                      src={resolveImageUrl(selectedProduct.image)}
                      alt={selectedProduct.name}
                      loading="lazy"
                      onError={(event) => handleImageError(event, selectedProduct.name)}
                      className="premium-product-image"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Product Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Product Code</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Brand</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.brand}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Model</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.model}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Purchase Price</p>
                <p className="font-semibold text-gray-900 dark:text-white">Rs. {selectedProduct.purchasePrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sale Price</p>
                <p className="font-semibold text-gray-900 dark:text-white">Rs. {selectedProduct.salePrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Stock</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.currentStock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Min Stock</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.minStock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supplier</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.supplier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Branch</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.branch}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Warranty</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.warrantyPeriod} months</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <Badge variant={selectedProduct.status === 'Active' ? 'success' : 'default'}>
                  {selectedProduct.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                <p className="text-gray-900 dark:text-white">{selectedProduct.description}</p>
              </div>
            </div>

            {/* Stock History */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Stock History</h4>
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Stock Position</span>
                    <span className="text-sm font-medium text-green-600">{selectedProduct.currentStock} units</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Live snapshot from inventory data</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Minimum Stock Threshold</span>
                    <span className="text-sm font-medium text-red-600">{selectedProduct.minStock} units</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedProduct.currentStock <= selectedProduct.minStock ? 'Reorder recommended' : 'Stock level is healthy'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        type="danger"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteDialogOpen}
        onClose={() => setIsBulkDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Multiple Products"
        message={`Are you sure you want to delete the selected products? This action cannot be undone.`}
        type="danger"
      />
    </div>
  );
};

export default Products;
