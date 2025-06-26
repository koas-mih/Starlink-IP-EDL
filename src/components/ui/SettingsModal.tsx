import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Clock, RefreshCw, X } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  autoUpdateEnabled: boolean;
  updateInterval: number;
  onToggleAutoUpdate: () => void;
  onUpdateInterval: (minutes: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  autoUpdateEnabled,
  updateInterval,
  onToggleAutoUpdate,
  onUpdateInterval
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="bg-gray-900 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-blue-400 mr-2" />
            <h2 className="text-2xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-300 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Auto-Update Settings
            </h3>
            
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
                  onChange={(e) => onUpdateInterval(parseInt(e.target.value, 10))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Tip: You can access this settings panel anytime by typing "/settings"
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}