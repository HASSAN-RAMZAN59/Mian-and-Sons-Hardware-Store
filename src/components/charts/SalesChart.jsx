import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SalesChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="sales" stroke="#1e3a5f" strokeWidth={2} />
        <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SalesChart;
