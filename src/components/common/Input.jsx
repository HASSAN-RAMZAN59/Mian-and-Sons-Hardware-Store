import React from 'react';

const Input = ({ 
  label, 
  type = 'text', 
  name, 
  value, 
  onChange, 
  placeholder, 
  maxLength,
  required, 
  error,
  disabled = false,
  readOnly = false,
  icon,
  helperText,
  className = '' 
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 dark:text-gray-500">{icon}</span>
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          disabled={disabled}
          readOnly={readOnly}
          className={`
            w-full px-3 py-2 border rounded-md 
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-300
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}
          `}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
