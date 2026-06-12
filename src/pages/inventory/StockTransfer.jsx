import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { branchService } from '../../services/branchService';
import { inventoryService } from '../../services/inventoryService';
import { stockTransferService } from '../../services/stockTransferService';
import { toast } from 'react-toastify';


const StockTransfer = () => {
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    product: '',
    quantity: ''
  });
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const mapInventoryRows = (rows) =>
    (rows || []).map((item) => {
      const product = item.product || {};
      return {
        ...item,
        id: item.id || item._id,
        productName: [product.name, product.size].filter(Boolean).join(' ').trim(),
        productId: product._id || product.id,
      };
    });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchList, productList] = await Promise.all([
          branchService.getAll(),
          inventoryService.getAll()
        ]);
        setBranches(branchList);
        setProducts(mapInventoryRows(Array.isArray(productList) ? productList : []));
      } catch (error) {
        toast.error('Failed to load branches or products');
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await stockTransferService.create(formData);
      toast.success('Stock transferred successfully');
      setFormData({ from: '', to: '', product: '', quantity: '' });
    } catch (error) {
      toast.error('Failed to transfer stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Stock Transfer</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="From Branch" name="from" value={formData.from} onChange={handleChange} options={branches.map(b => ({ label: b.name, value: b.id }))} />
            <Select label="To Branch" name="to" value={formData.to} onChange={handleChange} options={branches.map(b => ({ label: b.name, value: b.id }))} />
            <Select label="Product" name="product" value={formData.product} onChange={handleChange} options={products.map(p => ({ label: p.productName || p.name, value: p.id }))} />
            <Input label="Quantity" type="number" name="quantity" value={formData.quantity} onChange={handleChange} />
          </div>
          <div className="mt-4">
            <Button type="submit" disabled={loading}>{loading ? 'Transferring...' : 'Transfer Stock'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StockTransfer;
