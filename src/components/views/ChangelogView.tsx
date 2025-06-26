import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Download, Plus, Minus, Filter } from 'lucide-react';
import { ChangelogEntry } from '../../hooks/useStarlinkData';
import { PaginationButton } from '../ui/PaginationButton';
import { Tooltip } from '../ui/Tooltip';

interface ChangelogViewProps {
  changelog: ChangelogEntry[];
  onBack: () => void;
}

export const ChangelogView: React.FC<ChangelogViewProps> = ({ changelog, onBack }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntry | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'added' | 'removed'>('all');
  
  const itemsPerPage = 10;
  const pageCount = Math.ceil(changelog.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleEntries = changelog.slice(startIndex, startIndex + itemsPerPage);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
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

  const handleDownloadEntry = (entry: ChangelogEntry) => {
    const getFilteredAddresses = () => {
      switch (filterType) {
        case 'added':
          return entry.added;
        case 'removed':
          return entry.removed;
        default:
          return entry.ipAddresses;
      }
    };
    
    const content = getFilteredAddresses().join('\n');
    const date = new Date(entry.date).toISOString().slice(0, 10);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `starlink_ipv4_${filterType}_${date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const handleViewEntry = (entry: ChangelogEntry) => {
    setSelectedEntry(entry);
  };
  
  return (
    <div className="min-h-screen bg-black bg-opacity-95 text-white">
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534996858221-380b92700493?ixlib=rb-4.0.3&auto=format&fit=crop&w=1951&q=80')] bg-cover opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black to-black"></div>
      </div>
      
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center mb-6"
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all mr-4"
          >
            <ArrowLeft className="-ml-1 mr-2 h-4 w-4" />
            Back to Main View
          </motion.button>
          
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 tracking-tight">
            IP Address Changelog
          </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 text-gray-300"
        >
          Track changes to Starlink IP addresses over time. The changelog shows when addresses were added or removed.
        </motion.p>
        
        {changelog.length === 0 ? (
          <div className="bg-gray-900 rounded-xl shadow-lg p-8 border border-gray-800 text-center">
            <h2 className="text-xl font-semibold text-white mb-3">No Changes Recorded Yet</h2>
            <p className="text-gray-300">
              Changes to IP addresses will be recorded here when they occur. Check back after the next update.
            </p>
          </div>
        ) : selectedEntry ? (
          <div className="bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Changes on {formatDate(selectedEntry.date)}</h2>
                <p className="text-sm text-gray-400">
                  {selectedEntry.added.length} addresses added, {selectedEntry.removed.length} addresses removed
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
                  <button 
                    onClick={() => setFilterType('all')} 
                    className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                      filterType === 'all' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setFilterType('added')} 
                    className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                      filterType === 'added' ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Added
                  </button>
                  <button 
                    onClick={() => setFilterType('removed')} 
                    className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                      filterType === 'removed' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Removed
                  </button>
                </div>
                
                <motion.button
                  onClick={() => handleDownloadEntry(selectedEntry)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
                >
                  <Download className="-ml-1 mr-2 h-4 w-4" />
                  Download
                </motion.button>
                
                <motion.button
                  onClick={() => setSelectedEntry(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all"
                >
                  Back to List
                </motion.button>
              </div>
            </div>
            
            <div className="flex flex-col space-y-4">
              {filterType === 'all' || filterType === 'added' ? (
                <div className={`${selectedEntry.added.length === 0 && filterType === 'added' ? 'hidden' : ''}`}>
                  <h3 className="flex items-center text-lg font-medium text-green-400 mb-2">
                    <Plus className="h-4 w-4 mr-1" /> Added IP Addresses
                    <span className="ml-2 text-sm bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
                      {selectedEntry.added.length}
                    </span>
                  </h3>
                  
                  {selectedEntry.added.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No addresses added</p>
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {selectedEntry.added.map((ip, idx) => (
                          <div key={idx} className="font-mono text-sm text-green-300 bg-gray-700 px-2 py-1 rounded">
                            {ip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              
              {filterType === 'all' || filterType === 'removed' ? (
                <div className={`${selectedEntry.removed.length === 0 && filterType === 'removed' ? 'hidden' : ''}`}>
                  <h3 className="flex items-center text-lg font-medium text-red-400 mb-2">
                    <Minus className="h-4 w-4 mr-1" /> Removed IP Addresses
                    <span className="ml-2 text-sm bg-red-900 text-red-300 px-2 py-0.5 rounded-full">
                      {selectedEntry.removed.length}
                    </span>
                  </h3>
                  
                  {selectedEntry.removed.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No addresses removed</p>
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {selectedEntry.removed.map((ip, idx) => (
                          <div key={idx} className="font-mono text-sm text-red-300 bg-gray-700 px-2 py-1 rounded">
                            {ip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              
              {filterType === 'all' && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-blue-400 mb-2">
                    Full IP Address List
                    <span className="ml-2 text-sm bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
                      {selectedEntry.ipAddresses.length}
                    </span>
                  </h3>
                  
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedEntry.ipAddresses.map((ip, idx) => {
                        const isAdded = selectedEntry.added.includes(ip);
                        const className = isAdded
                          ? "font-mono text-sm text-green-300 bg-green-900 bg-opacity-30 px-2 py-1 rounded"
                          : "font-mono text-sm text-blue-300 bg-gray-700 px-2 py-1 rounded";
                        
                        return (
                          <div key={idx} className={className}>
                            {isAdded && <Plus className="h-3 w-3 inline mr-1" />}
                            {ip}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden">
              <div className="grid grid-cols-1 divide-y divide-gray-800">
                <div className="p-4 bg-gray-800 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">IP Address Change History</h3>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">
                      {changelog.length} change{changelog.length !== 1 ? 's' : ''} recorded
                    </span>
                  </div>
                </div>
                
                {visibleEntries.map((entry, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-800 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-3 sm:mb-0">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-blue-400 mr-2" />
                        <span className="font-medium text-white">{formatDate(entry.date)}</span>
                      </div>
                      
                      <div className="flex items-center mt-1 text-sm">
                        <div className="flex items-center mr-4 text-green-400">
                          <Plus className="h-3 w-3 mr-1" />
                          {entry.added.length} added
                        </div>
                        <div className="flex items-center text-red-400">
                          <Minus className="h-3 w-3 mr-1" />
                          {entry.removed.length} removed
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <motion.button
                        onClick={() => handleViewEntry(entry)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-700 rounded-lg text-sm font-medium text-blue-300 bg-blue-900 bg-opacity-40 hover:bg-blue-800 transition-all"
                      >
                        View Details
                      </motion.button>
                      
                      <motion.button
                        onClick={() => handleDownloadEntry(entry)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-all"
                      >
                        <Download className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {pageCount > 1 && (
                <div className="border-t border-gray-700 px-4 py-3 bg-gray-800">
                  <div className="flex flex-col sm:flex-row items-center justify-between">
                    <div className="flex items-center text-sm text-gray-400 mb-3 sm:mb-0">
                      <span>
                        Showing <span className="font-medium text-white">{startIndex + 1}</span> to{" "}
                        <span className="font-medium text-white">
                          {Math.min(startIndex + itemsPerPage, changelog.length)}
                        </span> of{" "}
                        <span className="font-medium text-white">{changelog.length}</span> entries
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
            
            <div className="mt-6 bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="font-medium text-white mb-2">About the Changelog</h3>
              <p className="text-sm text-gray-300">
                This changelog tracks changes to Starlink IPv4 addresses over time. Each entry shows
                which addresses were added or removed during updates. You can view details for any change
                and download specific versions of the IP address list.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};