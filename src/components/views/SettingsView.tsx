import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Clock, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStarlinkData } from '../../hooks/useStarlinkData';

interface SettingsViewProps {
  autoUpdateEnabled: boolean;
  updateInterval: number;
  onToggleAutoUpdate: () => void;
  onUpdateInterval: (minutes: number) => void;
}

// Wrapper component to handle data fetching and state management
export const SettingsViewWrapper: React.FC = () => {
  const { autoUpdateEnabled, updateInterval, toggleAutoUpdate, updateIntervalSettings } = useStarlinkData();
  
  return (
    <SettingsView
      autoUpdateEnabled={autoUpdateEnabled}
      updateInterval={updateInterval}
      onToggleAutoUpdate={toggleAutoUpdate}
      onUpdateInterval={updateIntervalSettings}
    />
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  autoUpdateEnabled,
  updateInterval,
  onToggleAutoUpdate,
  onUpdateInterval
}) => {
  // Fetch server settings on component mount
  useEffect(() => {
    const fetchServerSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          if (settings.updateInterval && settings.updateInterval !== updateInterval) {
            onUpdateInterval(settings.updateInterval);
          }
        }
      } catch (error) {
        console.error('Error fetching server settings:', error);
      }
    };
    
    fetchServerSettings();
  }, [onUpdateInterval, updateInterval]);
  
  const handleIntervalChange = (minutes: number) => {
    if (minutes >= 1) {
      // Immediately update UI and notify the server
      console.log('Changing interval to:', minutes);
      onUpdateInterval(minutes); // This will handle server communication
    }
  };

  return (
    <div className="min-h-screen bg-black bg-opacity-95 text-white">
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534996858221-380b92700493?ixlib=rb-4.0.3&auto=format&fit=crop&w=1951&q=80')] bg-cover opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black to-black"></div>
      </div>

      <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center mb-6"
        >
          <Link
            to="/"
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all mr-4"
          >
            <ArrowLeft className="-ml-1 mr-2 h-4 w-4" />
            Back to Main View
          </Link>
          
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 tracking-tight">
            Settings
          </h1>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-blue-300 flex items-center mb-4">
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Auto-Update Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Automatic Updates</h4>
                      <p className="text-sm text-gray-400">Periodically fetch new IP addresses</p>
                    </div>
                    <button
                      onClick={onToggleAutoUpdate}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoUpdateEnabled ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoUpdateEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {autoUpdateEnabled && (
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-400" />
                          Update Interval
                        </h4>
                      </div>
                      <select
                        value={updateInterval}
                        onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <option value="1">Every minute</option>
                        <option value="5">Every 5 minutes</option>
                        <option value="15">Every 15 minutes</option>
                        <option value="30">Every 30 minutes</option>
                        <option value="60">Every hour</option>
                        <option value="360">Every 6 hours</option>
                        <option value="720">Every 12 hours</option>
                        <option value="1440">Every 24 hours</option>
                      </select>
                      <p className="mt-2 text-sm text-gray-400">
                        The application will check for new IP addresses at this interval
                      </p>
                      <p className="mt-2 text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded-md">
                        <b>Note:</b> This setting applies to all users accessing the server
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg">
            <h3 className="text-lg font-semibold text-blue-300 flex items-center mb-4">
              <Settings className="h-5 w-5 mr-2" />
              About Settings
            </h3>
            <p className="text-gray-400">
              Configure how the application fetches and updates Starlink IP addresses. Your settings are automatically saved and will persist across browser sessions and apply to all users accessing this server.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};