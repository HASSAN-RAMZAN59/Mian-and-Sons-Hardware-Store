import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import { productService } from '../../services/productService';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productService.getById(id);
        setProduct(data);
      } catch (error) {
        console.error('Failed to fetch product');
      }
    };
    fetchProduct();
  }, [id]);

  if (!product) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Product Details</h1>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="text-lg font-semibold">{product.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="text-lg font-semibold">{product.category}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Price</p>
            <p className="text-lg font-semibold">PKR {product.price}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Stock</p>
            <p className="text-lg font-semibold">{product.stock}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProductDetail;
