import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import { FaLock } from 'react-icons/fa';
import Button from './Button';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <FaLock className="text-4xl text-red-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Access Denied
        </h1>
        
        <p className="text-gray-600 mb-8">
          You don't have permission to view this page. Please contact your administrator if you believe this is an error.
        </p>
        
        <div className="flex flex-col space-y-3">
          <Button onClick={() => navigate(-1)} className="w-full">
            Go Back
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')} 
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, user } = useAuth();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If no specific permission is required, just check authentication
  if (!requiredPermission) {
    return children;
  }

  // Check if user has required permission
  const { module, action } = requiredPermission;
  const userRole = user?.role || '';

  if (!hasPermission(userRole, module, action)) {
    return <AccessDenied />;
  }

  // User is authenticated and has required permission
  return children;
};

export default ProtectedRoute;
