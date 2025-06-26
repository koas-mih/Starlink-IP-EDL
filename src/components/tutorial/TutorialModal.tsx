import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Network, Server } from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
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
        className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full shadow-2xl border border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">How to Use This Tool</h2>
        
        <div className="space-y-6">
          <div className="flex items-start">
            <div className="bg-blue-900 rounded-full p-2 mr-4">
              <Globe className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-blue-300">What This Tool Does</h3>
              <p className="text-gray-300">
                This tool automatically extracts and formats IPv4 CIDR blocks from Starlink's GeoIP database,
                making them ready for use in Palo Alto firewalls.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-blue-900 rounded-full p-2 mr-4">
              <Network className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-blue-300">How to Use the Data</h3>
              <ol className="list-decimal ml-5 space-y-1 text-gray-300">
                <li>Visit <b>/ipv4.txt</b> for a direct plain text feed</li>
                <li>Download the text file using the <b>Download Text</b> button</li>
                <li>Copy all IP addresses using the <b>Copy</b> button</li>
                <li>Paste into your Palo Alto firewall configuration</li>
                <li>Use for address groups or security policies</li>
              </ol>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-blue-900 rounded-full p-2 mr-4">
              <Server className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-blue-300">Advanced Features</h3>
              <ul className="list-disc ml-5 space-y-1 text-gray-300">
                <li>Updates automatically every 24 hours</li>
                <li>Direct text endpoint at /ipv4.txt always available</li>
                <li>Uses multiple CORS proxies for reliable access</li>
                <li>Shows only IPv4 addresses in CIDR notation</li>
                <li>Download as a simple text file for immediate use</li>
                <li>IP changelog tracks all address changes over time</li>
              </ul>
            </div>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Got it!
        </motion.button>
      </motion.div>
    </motion.div>
  );
};