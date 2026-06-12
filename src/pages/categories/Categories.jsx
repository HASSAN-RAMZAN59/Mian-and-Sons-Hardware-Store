import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaTools, 
  FaHammer, 
  FaWrench, 
  FaPaintBrush,
  FaBolt,
  FaHardHat,
  FaScrewdriver,
  FaLock,
  FaLayerGroup,
  FaCubes,
  FaBoxes
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const Categories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentCategory: '',
    icon: 'FaBoxes',
    color: '#1e3a5f',
    status: 'Active'
  });

  // Available icons
  const availableIcons = [
    { value: 'FaTools', label: 'Tools', icon: FaTools },
    { value: 'FaHammer', label: 'Hammer', icon: FaHammer },
    { value: 'FaWrench', label: 'Wrench', icon: FaWrench },
    { value: 'FaPaintBrush', label: 'Paint Brush', icon: FaPaintBrush },
    { value: 'FaBolt', label: 'Electrical', icon: FaBolt },
    { value: 'FaHardHat', label: 'Safety', icon: FaHardHat },
    { value: 'FaScrewdriver', label: 'Screwdriver', icon: FaScrewdriver },
    { value: 'FaLock', label: 'Lock', icon: FaLock },
    { value: 'FaLayerGroup', label: 'Layers', icon: FaLayerGroup },
    { value: 'FaCubes', label: 'Cubes', icon: FaCubes },
    { value: 'FaBoxes', label: 'Boxes', icon: FaBoxes }
  ];

  // Available colors
  const availableColors = [
    { value: '#1e3a5f', label: 'Primary Blue' },
    { value: '#f97316', label: 'Orange' },
    { value: '#10b981', label: 'Green' },
    { value: '#ef4444', label: 'Red' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#f59e0b', label: 'Yellow' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#ec4899', label: 'Pink' }
  ];

  // Initialize with sample categories
  useEffect(() => {
    const sampleCategories = [
      { 
        id: 1, 
        name: 'Power Tools', 
        description: 'Electric and battery-powered tools',
        parentCategory: null,
        icon: 'FaTools',
        color: '#1e3a5f',
        totalProducts: 45,
        status: 'Active'
      },
      { 
        id: 2, 
        name: 'Hand Tools', 
        description: 'Manual tools and equipment',
        parentCategory: null,
        icon: 'FaHammer',
        color: '#f97316',
        totalProducts: 78,
        status: 'Active'
      },
      { 
        id: 3, 
        name: 'Plumbing & Pipes', 
        description: 'Plumbing materials and fittings',
        parentCategory: null,
        icon: 'FaWrench',
        color: '#06b6d4',
        totalProducts: 92,
        status: 'Active'
      },
      { 
        id: 4, 
        name: 'Electrical', 
        description: 'Electrical supplies and components',
        parentCategory: null,
        icon: 'FaBolt',
        color: '#f59e0b',
        totalProducts: 156,
        status: 'Active'
      },
      { 
        id: 5, 
        name: 'Paints & Chemicals', 
        description: 'Paints, coatings, and chemical products',
        parentCategory: null,
        icon: 'FaPaintBrush',
        color: '#ec4899',
        totalProducts: 124,
        status: 'Active'
      },
      { 
        id: 6, 
        name: 'Cement & Construction', 
        description: 'Building materials and cement',
        parentCategory: null,
        icon: 'FaCubes',
        color: '#6b7280',
        totalProducts: 67,
        status: 'Active'
      },
      { 
        id: 7, 
        name: 'Safety Equipment', 
        description: 'Personal protective equipment',
        parentCategory: null,
        icon: 'FaHardHat',
        color: '#ef4444',
        totalProducts: 38,
        status: 'Active'
      },
      { 
        id: 8, 
        name: 'Fasteners & Screws', 
        description: 'Nuts, bolts, screws, and fasteners',
        parentCategory: null,
        icon: 'FaScrewdriver',
        color: '#8b5cf6',
        totalProducts: 203,
        status: 'Active'
      },
      { 
        id: 9, 
        name: 'Locks & Security', 
        description: 'Door locks and security systems',
        parentCategory: null,
        icon: 'FaLock',
        color: '#10b981',
        totalProducts: 42,
        status: 'Active'
      },
      { 
        id: 10, 
        name: 'Ladders & Scaffolding', 
        description: 'Access equipment and scaffolding',
        parentCategory: null,
        icon: 'FaLayerGroup',
        color: '#f97316',
        totalProducts: 28,
        status: 'Active'
      },
      // Subcategories
      { 
        id: 11, 
        name: 'Drills & Drivers', 
        description: 'Drilling machines and drivers',
        parentCategory: 'Power Tools',
        icon: 'FaTools',
        color: '#1e3a5f',
        totalProducts: 18,
        status: 'Active'
      },
      { 
        id: 12, 
        name: 'Interior Paint', 
        description: 'Indoor wall and ceiling paint',
        parentCategory: 'Paints & Chemicals',
        icon: 'FaPaintBrush',
        color: '#ec4899',
        totalProducts: 56,
        status: 'Active'
      },
      { 
        id: 13, 
        name: 'Exterior Paint', 
        description: 'Outdoor weather-resistant paint',
        parentCategory: 'Paints & Chemicals',
        icon: 'FaPaintBrush',
        color: '#ec4899',
        totalProducts: 42,
        status: 'Active'
      },
      { 
        id: 14, 
        name: 'PVC Pipes', 
        description: 'PVC plumbing pipes and fittings',
        parentCategory: 'Plumbing & Pipes',
        icon: 'FaWrench',
        color: '#06b6d4',
        totalProducts: 34,
        status: 'Active'
      },
      { 
        id: 15, 
        name: 'LED Lighting', 
        description: 'LED bulbs and fixtures',
        parentCategory: 'Electrical',
        icon: 'FaBolt',
        color: '#f59e0b',
        totalProducts: 67,
        status: 'Active'
      }
    ];
    
    setCategories(sampleCategories);
  }, []);

  // Get icon component by name
  const getIconComponent = (iconName) => {
    const iconObj = availableIcons.find(i => i.value === iconName);
    return iconObj ? iconObj.icon : FaBoxes;
  };

  // Get parent category options
  const getParentCategories = () => {
    const mainCategories = categories.filter(c => !c.parentCategory);
    return mainCategories.map(c => ({ value: c.name, label: c.name }));
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentCategory: '',
      icon: 'FaBoxes',
      color: '#1e3a5f',
      status: 'Active'
    });
  };

  // Add category
  const handleAddCategory = () => {
    if (!formData.name) {
      toast.error('Category name is required');
      return;
    }

    const newCategory = {
      id: categories.length + 1,
      ...formData,
      parentCategory: formData.parentCategory || null,
      totalProducts: 0
    };

    setCategories([...categories, newCategory]);
    toast.success('Category added successfully!');
    setIsAddModalOpen(false);
    resetForm();
  };

  // Edit category
  const handleEditCategory = () => {
    if (!formData.name) {
      toast.error('Category name is required');
      return;
    }

    const updatedCategories = categories.map(c => 
      c.id === selectedCategory.id 
        ? { 
            ...c, 
            ...formData,
            parentCategory: formData.parentCategory || null
          }
        : c
    );

    setCategories(updatedCategories);
    toast.success('Category updated successfully!');
    setIsEditModalOpen(false);
    setSelectedCategory(null);
    resetForm();
  };

  // Delete category
  const handleDeleteCategory = () => {
    // Check if category has subcategories
    const hasSubcategories = categories.some(c => c.parentCategory === selectedCategory.name);
    
    if (hasSubcategories) {
      toast.error('Cannot delete category with subcategories');
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      return;
    }

    setCategories(categories.filter(c => c.id !== selectedCategory.id));
    toast.success('Category deleted successfully!');
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  // Open edit modal
  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      parentCategory: category.parentCategory || '',
      icon: category.icon,
      color: category.color,
      status: category.status
    });
    setIsEditModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  // Table columns
  const columns = [
    { 
      key: 'id', 
      label: 'ID',
      render: (row) => `CAT-${String(row.id).padStart(3, '0')}`
    },
    {
      key: 'icon',
      label: 'Icon',
      render: (row) => {
        const IconComponent = getIconComponent(row.icon);
        return (
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: row.color + '20' }}
          >
            <IconComponent size={20} style={{ color: row.color }} />
          </div>
        );
      }
    },
    { 
      key: 'name', 
      label: 'Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
          {row.parentCategory && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Parent: {row.parentCategory}
            </p>
          )}
        </div>
      )
    },
    { 
      key: 'description', 
      label: 'Description',
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">{row.description}</span>
      )
    },
    { 
      key: 'parentCategory', 
      label: 'Parent Category',
      render: (row) => row.parentCategory ? (
        <Badge variant="info">{row.parentCategory}</Badge>
      ) : (
        <Badge variant="default">Main Category</Badge>
      )
    },
    { 
      key: 'totalProducts', 
      label: 'Total Products',
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.totalProducts}
        </span>
      )
    },
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
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          {hasPermission(user?.role, 'categories', 'edit') && (
            <button
              onClick={() => openEditModal(row)}
              className="text-green-600 hover:text-green-800 dark:text-green-400"
              title="Edit"
            >
              <FaEdit size={16} />
            </button>
          )}
          {hasPermission(user?.role, 'categories', 'delete') && (
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
  const canCreate = hasPermission(user?.role, 'categories', 'create');

  // Organize categories by parent-child
  const mainCategories = categories.filter(c => !c.parentCategory);
  const getSubcategories = (parentName) => categories.filter(c => c.parentCategory === parentName);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage product categories and subcategories</p>
        </div>
        {canCreate && (
          <Button 
            variant="primary" 
            icon={<FaPlus />} 
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
          >
            Add Category
          </Button>
        )}
      </div>

      {/* Category Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</p>
            </div>
            <FaLayerGroup className="text-3xl text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Main Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mainCategories.length}</p>
            </div>
            <FaBoxes className="text-3xl text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Subcategories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {categories.length - mainCategories.length}
              </p>
            </div>
            <FaCubes className="text-3xl text-orange-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {categories.filter(c => c.status === 'Active').length}
              </p>
            </div>
            <FaTools className="text-3xl text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Categories Table */}
      <Card title="All Categories">
        <Table
          columns={columns}
          data={categories}
          emptyMessage="No categories found"
        />
      </Card>

      {/* Category Tree View */}
      <Card title="Category Hierarchy">
        <div className="space-y-4">
          {mainCategories.map(mainCat => {
            const IconComponent = getIconComponent(mainCat.icon);
            const subcategories = getSubcategories(mainCat.name);
            
            return (
              <div key={mainCat.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: mainCat.color + '20' }}
                  >
                    <IconComponent size={24} style={{ color: mainCat.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{mainCat.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{mainCat.description}</p>
                  </div>
                  <Badge variant="info">{mainCat.totalProducts} products</Badge>
                </div>
                
                {subcategories.length > 0 && (
                  <div className="mt-3 ml-16 space-y-2">
                    {subcategories.map(subCat => {
                      const SubIconComponent = getIconComponent(subCat.icon);
                      return (
                        <div 
                          key={subCat.id} 
                          className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                        >
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center"
                            style={{ backgroundColor: subCat.color + '20' }}
                          >
                            <SubIconComponent size={16} style={{ color: subCat.color }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{subCat.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{subCat.description}</p>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {subCat.totalProducts} products
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
          resetForm();
          setSelectedCategory(null);
        }}
        title={isAddModalOpen ? 'Add New Category' : 'Edit Category'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                resetForm();
                setSelectedCategory(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={isAddModalOpen ? handleAddCategory : handleEditCategory}
            >
              {isAddModalOpen ? 'Add Category' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter category name"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter category description"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Select
            label="Parent Category (Optional)"
            name="parentCategory"
            value={formData.parentCategory}
            onChange={handleInputChange}
            options={getParentCategories()}
            placeholder="None (Main Category)"
            helperText="Leave empty to create a main category"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {availableIcons.map(iconItem => {
                const IconComponent = iconItem.icon;
                return (
                  <button
                    key={iconItem.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon: iconItem.value }))}
                    className={`p-3 border-2 rounded-lg flex items-center justify-center transition-all ${
                      formData.icon === iconItem.value
                        ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                    }`}
                    title={iconItem.label}
                  >
                    <IconComponent size={24} className={formData.icon === iconItem.value ? 'text-primary' : 'text-gray-600 dark:text-gray-400'} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Color
            </label>
            <div className="grid grid-cols-8 gap-2">
              {availableColors.map(colorItem => (
                <button
                  key={colorItem.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: colorItem.value }))}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === colorItem.value
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: colorItem.value }}
                  title={colorItem.label}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div 
              className="inline-flex items-center space-x-3 px-4 py-3 rounded-lg"
              style={{ backgroundColor: formData.color + '20' }}
            >
              {(() => {
                const PreviewIcon = getIconComponent(formData.icon);
                return <PreviewIcon size={28} style={{ color: formData.color }} />;
              })()}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formData.name || 'Category Name'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.description || 'Category description'}
                </p>
              </div>
            </div>
          </div>

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
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${selectedCategory?.name}"? This action cannot be undone.`}
        type="danger"
      />
    </div>
  );
};

export default Categories;
