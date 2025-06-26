import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, AlertTriangle, RefreshCw, Clock, Copy, CheckCircle, Satellite, ExternalLink, HelpCircle, Download, History, Settings } from 'lucide-react';
import { IPAddressGrid } from '../ip/IPAddressGrid';
import { Tooltip } from '../ui/Tooltip';
import { TutorialModal } from '../tutorial/TutorialModal';
import { FeatureGrid } from '../features/FeatureGrid';
import { ChangelogEntry } from '../../hooks/useStarlinkData';
import { Link, useNavigate } from 'react-router-dom';

interface MainViewProps {
  ipAddresses: string[];
  isLoading: boolean;
  fetchSuccess: boolean;
  error: string;
  lastUpdated: string | null;
  copiedToClipboard: boolean;
  updateInterval: number;
  showTutorial: boolean;
  changelog: ChangelogEntry[];
  onRefresh: () => void;
  nextUpdateTime: number;
  onCopy: () => void;
  onViewCSV: () => void;
  onDownload: () => void;
  onToggleTutorial: () => void;
  onViewChangelog: () => void;
}

export const MainView: React.FC<MainViewProps> = ({
  ipAddresses,
  isLoading,
  fetchSuccess,
  error,
  lastUpdated,
  copiedToClipboard,
  updateInterval,
  showTutorial,
  changelog,
  onRefresh,
  nextUpdateTime,
  onCopy,
  onViewCSV,
  onDownload,
  onToggleTutorial,
  onViewChangelog
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Convert to CET (considering daylight saving time)
    const utcPlus1Date = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    return utcPlus1Date.toLocaleString('en-GB', { 
      timeZone: 'Europe/Paris',
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' CET';
  };

  const navigate = useNavigate();
  
  // Debounced refresh handler to prevent multiple clicks
  const handleRefresh = React.useCallback(() => {
    if (isLoading) return; // Prevent clicking if already loading
    onRefresh();
  }, [isLoading, onRefresh]);

  // State for countdown timer
  const [timeUntilUpdate, setTimeUntilUpdate] = useState<string>('');

  // Update countdown timer every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      
      // Only show countdown if we have a valid nextUpdateTime from server
      if (!nextUpdateTime || nextUpdateTime <= 0) {
        setTimeUntilUpdate('Syncing...');
        return;
      }
      
      const timeLeft = Math.max(0, nextUpdateTime - now);
      
      if (timeLeft === 0) {
        setTimeUntilUpdate('Updating...');
        return;
      }
      
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      // Format with leading zeros for better readability
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(seconds).padStart(2, '0');
      setTimeUntilUpdate(`${formattedMinutes}m ${formattedSeconds}s`);
    };
    
    // Initial update
    updateCountdown();
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [nextUpdateTime, isLoading, updateInterval]);

  return (
    <div className="min-h-screen bg-black bg-opacity-95 text-white">
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534996858221-380b92700493?ixlib=rb-4.0.3&auto=format&fit=crop&w=1951&q=80')] bg-cover opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black to-black"></div>
      </div>

      {showTutorial && <TutorialModal onClose={onToggleTutorial} />}

      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 relative z-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center mb-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10, delay: 0.1 }}
            className="bg-blue-600 bg-opacity-80 rounded-full p-3 mb-3 shadow-lg shadow-blue-500/20"
          >
            <Satellite className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 tracking-tight">
            Starlink IPv4 CIDR Extractor
          </h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-2 text-lg text-blue-300 max-w-2xl text-center"
          >
            Automatically extracts and formats Starlink IPv4 addresses for Palo Alto Firewalls
          </motion.p>
          
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleTutorial}
              className="inline-flex items-center px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm font-medium text-blue-400 hover:bg-gray-700 transition-colors"
            >
              <HelpCircle className="mr-1.5 h-4 w-4" />
              How to use this tool
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onViewChangelog}
              className="inline-flex items-center px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm font-medium text-blue-400 hover:bg-gray-700 transition-colors"
            >
              <History className="mr-1.5 h-4 w-4" />
              View IP Changelog
              {changelog.length > 0 && (
                <span className="ml-1.5 bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded-full text-xs">
                  {changelog.length}
                </span>
              )}
            </motion.button>
            
            <Link 
              to="/ipv4.txt" 
              target="_blank"
              className="inline-flex items-center px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm font-medium text-green-400 hover:bg-gray-700 transition-colors"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              /ipv4.txt Direct Feed
            </Link>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900 rounded-xl shadow-lg p-6 mb-8 border border-gray-800 hover:shadow-blue-900/20 hover:shadow-xl transition-all"
        >
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-blue-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">Starlink IP Address Feed</h2>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-300 mb-2">
              This tool automatically extracts IPv4 CIDR blocks from the Starlink GeoIP database.
            </p>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-400">Data source:</span>
              <code className="ml-2 bg-gray-800 px-2 py-1 rounded text-sm font-mono text-blue-300">
                https://geoip.starlinkisp.net/feed.csv
              </code>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Tooltip content="Fetch the latest Starlink IP addresses">
                <motion.button
                  onClick={handleRefresh}
                  whileHover={isLoading ? {} : { scale: 1.05 }}
                  whileTap={isLoading ? {} : { scale: 0.95 }}
                  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all ${
                    isLoading 
                      ? 'bg-blue-500 cursor-not-allowed opacity-80' 
                      : 'bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                  disabled={isLoading}
                  aria-disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                      Refresh Now
                    </>
                  )}
                </motion.button>
              </Tooltip>
              
              {/* Success Toast */}
              <AnimatePresence>
                {fetchSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg shadow-lg flex items-center whitespace-nowrap"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Data updated successfully
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Tooltip content="Download the current IP list as a text file">
              <motion.button
                onClick={onDownload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
                disabled={ipAddresses.length === 0}
              >
                <Download className="-ml-1 mr-2 h-4 w-4" />
                Download Text File
              </motion.button>
            </Tooltip>
            
            <Tooltip content="View the IP address changelog">
              <motion.button
                onClick={onViewChangelog}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <History className="-ml-1 mr-2 h-4 w-4" />
                Changelog
                {changelog.length > 0 && (
                  <span className="ml-1.5 bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full text-xs">
                    {changelog.length}
                  </span>
                )}
              </motion.button>
            </Tooltip>
          </div>
          
          {lastUpdated && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 flex items-center text-sm text-gray-300 bg-gray-800 rounded-lg px-3 py-2"
            >
              <Clock className="h-4 w-4 mr-1 text-blue-400" />
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div>
                  <span className="font-medium">Last updated:</span>
                  <span className="ml-1">{formatDate(lastUpdated)}</span>
                </div>
                <div className="mt-1 sm:mt-0 sm:ml-3 flex items-center space-x-3">
                  <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
                    Updates every {updateInterval === 1 ? 'minute' : `${updateInterval} minutes`}
                  </span>
                  <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Next update in: {timeUntilUpdate}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900 bg-opacity-40 border-l-4 border-red-500 rounded-lg p-4 mb-8"
          >
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium">
                  {error}
                </p>
                {ipAddresses.length > 0 && (
                  <p className="text-sm text-gray-300 mt-1">
                    Showing previously cached IP addresses instead.
                  </p>
                )}
                <p className="text-sm text-gray-300 mt-2">
                  The application will automatically try several CORS proxies to access the data.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {ipAddresses.length > 0 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-800 hover:shadow-blue-900/20 hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-white">IPv4 Addresses</h2>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 5 }}
                  className="ml-3 bg-blue-900 text-blue-300 px-3 py-1 rounded-lg font-mono flex items-center"
                >
                  <span className="text-xs uppercase mr-1">Total:</span>
                  <span className="text-lg font-bold">{ipAddresses.length}</span>
                </motion.div>
              </div>
              
              <div className="flex space-x-2">
                <Tooltip content="Copy all IP addresses to clipboard">
                  <motion.button 
                    onClick={onCopy}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-700 rounded-lg text-sm font-medium text-blue-300 bg-blue-900 bg-opacity-40 hover:bg-blue-800 transition-all"
                  >
                    {copiedToClipboard ? (
                      <>
                        <CheckCircle className="mr-1.5 h-4 w-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </motion.button>
                </Tooltip>
                
                <Tooltip content="View a clean text format for importing">
                  <Link 
                    to="/ipv4.txt"
                    target="_blank"
                    className="inline-flex items-center px-3 py-1.5 border border-green-700 rounded-lg text-sm font-medium text-green-300 bg-green-900 bg-opacity-30 hover:bg-green-800 hover:bg-opacity-30 transition-all"
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    View Text Format
                  </Link>
                </Tooltip>
                
                <Tooltip content="Download the current IP list as a text file">
                  <motion.button 
                    onClick={onDownload}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center px-3 py-1.5 border border-purple-700 rounded-lg text-sm font-medium text-purple-300 bg-purple-900 bg-opacity-30 hover:bg-purple-800 hover:bg-opacity-30 transition-all"
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download Text
                  </motion.button>
                </Tooltip>
              </div>
            </div>
            
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-4"
            >
              <IPAddressGrid ipAddresses={ipAddresses} />
            </motion.div>
            
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 flex flex-col items-center justify-center space-y-2"
            >
              <span className="bg-green-900 bg-opacity-40 text-green-300 text-sm font-medium px-3 py-1 rounded-full flex items-center">
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Ready for use in Palo Alto Firewalls
              </span>
              <p className="text-sm text-gray-400">
                Each IP address is displayed on a separate line in standard CIDR notation
              </p>
              <Link 
                to="/ipv4.txt" 
                target="_blank"
                className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center group"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Access direct IP text feed at <span className="group-hover:underline ml-1">/ipv4.txt</span>
              </Link>
            </motion.div>
          </motion.div>
        )}
        
        <FeatureGrid />
        
        {changelog.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Recent IP Changes</h3>
              <motion.button
                onClick={onViewChangelog}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center"
              >
                View full changelog
                <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.button>
            </div>
            
            <div className="space-y-2">
              {changelog.slice(0, 3).map((entry, idx) => (
                <div key={idx} className="bg-gray-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-700">
                  <div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-blue-400 mr-2" />
                      <span className="text-sm text-gray-300">{new Date(entry.date).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center mt-1 gap-3">
                      <div className="flex items-center text-xs bg-green-900 bg-opacity-30 text-green-300 px-2 py-0.5 rounded">
                        <span className="font-bold mr-1">+{entry.added.length}</span> added
                      </div>
                      <div className="flex items-center text-xs bg-red-900 bg-opacity-30 text-red-300 px-2 py-0.5 rounded">
                        <span className="font-bold mr-1">-{entry.removed.length}</span> removed
                      </div>
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={() => onViewChangelog()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-2 sm:mt-0 text-xs bg-blue-900 bg-opacity-30 text-blue-300 px-2 py-1 rounded hover:bg-blue-800 transition-colors"
                  >
                    View Details
                  </motion.button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          <div className="space-y-2">
            <p>© 2025 Starlink IPv4 CIDR Extractor | Designed for network administrators</p>
            <Link
              to="/settings"
              className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center"
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};