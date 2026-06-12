import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';

const AddPurchase = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    supplier: '',
    date: '',
    paymentMethod: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit logic here
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">New Purchase</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Supplier" name="supplier" options={[]} />
            <Input label="Date" type="date" name="date" />
            <Select label="Payment Method" name="paymentMethod" options={[]} />
          </div>
          <div className="mt-4 flex space-x-2">
            <Button type="submit">Complete Purchase</Button>
            <Button variant="outline" onClick={() => navigate('/purchases')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddPurchase;
