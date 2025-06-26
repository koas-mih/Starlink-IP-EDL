import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { IPAddressItem } from './IPAddressItem';
import { PaginationButton } from '../ui/PaginationButton';
import { Tooltip } from '../ui/Tooltip';

interface IPAddressGridProps {
  ipAddresses: string[];
}

export const IPAddressGrid: React.FC<IPAddressGridProps> = ({ ipAddresses }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Filter IP addresses based on search term
  const filteredIps = searchTerm 
    ? ipAddresses.filter(ip => ip.includes(searchTerm)) 
    : ipAddresses;
  
  // Calculate pagination
  const pageCount = Math.ceil(filteredIps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleIps = filteredIps.slice(startIndex, startIndex + itemsPerPage);
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (pageCount <= maxVisiblePages) {
      for (let i = 1; i <= pageCount; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      
      const leftBound = Math.max(2, currentPage - 1);
      const rightBound = Math.min(pageCount - 1, currentPage + 1);
      
      if (leftBound > 2) {
        pageNumbers.push('ellipsis-left');
      }
      
      for (let i = leftBound; i <= rightBound; i++) {
        pageNumbers.push(i);
      }
      
      if (rightBound < pageCount - 1) {
        pageNumbers.push('ellipsis-right');
      }
      
      if (pageCount > 1) {
        pageNumbers.push(pageCount);
      }
    }
    
    return pageNumbers;
  };
  
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search IP addresses..."
          className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {/* IP Address grid */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2">
          {visibleIps.map((ip, idx) => (
            <IPAddressItem key={idx} ip={ip} />
          ))}
        </div>
        
        {/* Empty state */}
        {visibleIps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-3" />
            <h3 className="text-lg font-medium text-white">No matches found</h3>
            <p className="text-gray-400 mt-2">
              No IP addresses match your search criteria
            </p>
          </div>
        )}
        
        {/* Pagination controls */}
        {pageCount > 1 && (
          <div className="border-t border-gray-700 px-4 py-3 bg-gray-800">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center text-sm text-gray-400 mb-3 sm:mb-0">
                <span>
                  Showing <span className="font-medium text-white">{startIndex + 1}</span> to{" "}
                  <span className="font-medium text-white">
                    {Math.min(startIndex + itemsPerPage, filteredIps.length)}
                  </span> of{" "}
                  <span className="font-medium text-white">{filteredIps.length}</span> results
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Tooltip content="First page">
                  <PaginationButton
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    icon="first"
                  />
                </Tooltip>
                
                <Tooltip content="Previous page">
                  <PaginationButton
                    onClick={() => goToPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    icon="prev"
                  />
                </Tooltip>
                
                <div className="flex items-center space-x-1 mx-1">
                  {pageNumbers.map((pageNum, idx) => {
                    if (pageNum === 'ellipsis-left' || pageNum === 'ellipsis-right') {
                      return (
                        <div key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-gray-400">
                          &#8230;
                        </div>
                      );
                    }
                    
                    return (
                      <PaginationButton
                        key={`page-${pageNum}`}
                        onClick={() => goToPage(pageNum as number)}
                        active={currentPage === pageNum}
                        number={pageNum as number}
                      />
                    );
                  })}
                </div>
                
                <Tooltip content="Next page">
                  <PaginationButton
                    onClick={() => goToPage(Math.min(currentPage + 1, pageCount))}
                    disabled={currentPage === pageCount}
                    icon="next"
                  />
                </Tooltip>
                
                <Tooltip content="Last page">
                  <PaginationButton
                    onClick={() => goToPage(pageCount)}
                    disabled={currentPage === pageCount}
                    icon="last"
                  />
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center space-x-5 text-xs text-gray-400 bg-gray-800 rounded-md py-2">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-300 mr-1.5"></div>
          <span>Network</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-300 mr-1.5"></div>
          <span>Host</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-300 mr-1.5"></div>
          <span>Subnet Mask</span>
        </div>
      </div>
    </div>
  );
};