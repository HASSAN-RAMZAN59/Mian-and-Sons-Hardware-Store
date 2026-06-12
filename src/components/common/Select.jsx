import React from 'react';

const Select = ({ 
  label, 
  name, 
  value, 
  onChange, 
  options, 
  children,
  required, 
  error,
  disabled = false,
  placeholder = 'Select...',
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
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-md
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-300
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}
        `}
      >
        {options ? (
          <>
            <option value="">{placeholder}</option>
            {options.map((option, index) => (
              <option key={option.value || index} value={option.value}>
                {option.label}
              </option>
            ))}
          </>
        ) : (
          children
        )}
      </select>
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default Select;
