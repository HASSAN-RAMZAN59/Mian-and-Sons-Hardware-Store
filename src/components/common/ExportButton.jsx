import React, { useState, useRef, useEffect } from 'react';
import { FaFileExcel, FaFilePdf, FaPrint, FaChevronDown, FaFileDownload } from 'react-icons/fa';
import Button from './Button';

const ExportButton = ({ onExport, formats = ['excel', 'pdf', 'print'], className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportOptions = [
    {
      key: 'excel',
      label: 'Export to Excel',
      icon: FaFileExcel,
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      key: 'pdf',
      label: 'Export to PDF',
      icon: FaFilePdf,
      iconColor: 'text-red-600 dark:text-red-400'
    },
    {
      key: 'csv',
      label: 'Export to CSV',
      icon: FaFileDownload,
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      key: 'print',
      label: 'Print',
      icon: FaPrint,
      iconColor: 'text-gray-600 dark:text-gray-400'
    }
  ];

  const filteredOptions = exportOptions.filter(option => formats.includes(option.key));

  const handleExport = (format) => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        icon={<FaFileDownload />}
      >
        Export <FaChevronDown className="ml-2" size={12} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            {filteredOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  onClick={() => handleExport(option.key)}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Icon className={`mr-3 ${option.iconColor}`} size={16} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
