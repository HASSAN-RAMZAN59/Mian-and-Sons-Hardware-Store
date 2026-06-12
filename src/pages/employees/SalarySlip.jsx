import React from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const SalarySlip = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Salary Slip</h1>
        <div className="flex space-x-2">
          <Button onClick={handlePrint}>Print</Button>
          <Button variant="secondary" onClick={handlePrint}>Download PDF</Button>
        </div>
      </div>

      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">Mian & Sons Hardware Store</h2>
          <p className="text-gray-600">Salary Slip</p>
        </div>
        <div className="border-t border-b py-4">
          <p>Salary slip content here</p>
        </div>
      </Card>
    </div>
  );
};

export default SalarySlip;
