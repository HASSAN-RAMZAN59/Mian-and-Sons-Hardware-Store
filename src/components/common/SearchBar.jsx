import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const SearchBar = ({ 
  value, 
  onChange, 
  onSearch,
  placeholder = 'Search...', 
  className = '',
  debounceTime = 300 
}) => {
  const [internalValue, setInternalValue] = useState(value || '');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(internalValue);
      } else if (onChange) {
        onChange(internalValue);
      }
    }, debounceTime);

    return () => clearTimeout(timer);
  }, [internalValue, debounceTime, onChange, onSearch]);

  // Sync external value changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (e) => {
    setInternalValue(e.target.value);
  };

  const handleClear = () => {
    setInternalValue('');
    if (onSearch) {
      onSearch('');
    } else if (onChange) {
      onChange('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FaSearch className="text-gray-400 dark:text-gray-500" size={16} />
      </div>
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
      />
      {internalValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <FaTimes size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
