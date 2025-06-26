import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  icon?: 'first' | 'prev' | 'next' | 'last';
  number?: number;
}

export const PaginationButton: React.FC<PaginationButtonProps> = ({
  onClick,
  disabled = false,
  active = false,
  icon,
  number
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'first':
        return <ChevronsLeft size={18} />;
      case 'prev':
        return <ChevronLeft size={18} />;
      case 'next':
        return <ChevronRight size={18} />;
      case 'last':
        return <ChevronsRight size={18} />;
      default:
        return number;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center w-9 h-9 rounded-md transition-all text-sm
        ${active ? 'bg-blue-600 text-white' : ''}
        ${disabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 
                   active ? 'hover:bg-blue-700' : 'bg-gray-700 text-white hover:bg-gray-600'}
      `}
    >
      {getIcon()}
    </button>
  );
};