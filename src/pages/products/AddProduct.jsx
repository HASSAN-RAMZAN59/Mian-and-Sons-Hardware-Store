import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import { productService } from '../../services/productService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AddProduct = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    size: '',
    company: '',
    type: '',
    category: '',
    purchasePrice: '',
    salePrice: '',
    unit: '',
    tags: '' // comma separated
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data: convert tags to array, remove empty fields
      const data = { ...formData };
      if (data.tags) data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
      else data.tags = [];
      // Remove id/_id if present
      delete data.id;
      delete data._id;
      // Convert prices to float
      if (data.purchasePrice) data.purchasePrice = parseFloat(data.purchasePrice);
      if (data.salePrice) data.salePrice = parseFloat(data.salePrice);
      await productService.create(data);
      toast.success('Product added successfully');
      navigate('/products');
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Add Product</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Product Name" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Size" name="size" value={formData.size} onChange={handleChange} />
            <Input label="Company" name="company" value={formData.company} onChange={handleChange} />
            <Input label="Type" name="type" value={formData.type} onChange={handleChange} />
            <Select label="Category" name="category" value={formData.category} onChange={handleChange} options={[]} required />
            <Input label="Purchase Price" name="purchasePrice" type="number" value={formData.purchasePrice} onChange={handleChange} required />
            <Input label="Sale Price" name="salePrice" type="number" value={formData.salePrice} onChange={handleChange} required />
            <Input label="Unit" name="unit" value={formData.unit} onChange={handleChange} />
            <Input label="Tags (comma separated)" name="tags" value={formData.tags} onChange={handleChange} />
          </div>
          <div className="mt-4 flex space-x-2">
            <Button type="submit">Save Product</Button>
            <Button variant="outline" onClick={() => navigate('/products')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddProduct;
