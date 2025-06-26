import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      title: 'IPv4 Only',
      description: 'Extracts only IPv4 addresses in CIDR notation'
    },
    {
      title: 'Server Automatic',
      description: 'Updates regularly without user visits'
    },
    {
      title: 'Pure Text Feed',
      description: (
        <span>
          Direct text feed at <Link to="/ipv4.txt" target="_blank" className="text-blue-400 hover:underline">/ipv4.txt</Link>
        </span>
      )
    },
    {
      title: 'Offline Access',
      description: 'Uses cached data when unable to connect'
    },
    {
      title: 'Change Tracking',
      description: 'Records all IP address changes over time'
    }
  ];

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="mt-8 bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-lg"
    >
      <h3 className="text-lg font-semibold text-center text-white mb-3">Features</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {features.map((feature, index) => (
          <motion.div 
            key={index}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="flex items-start p-3 rounded-lg transition-all"
          >
            <div className="flex-shrink-0 h-5 w-5 text-blue-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className="ml-2 text-sm text-gray-300">
              <span className="font-medium text-blue-300">{feature.title}:</span>{' '}
              {typeof feature.description === 'string' ? feature.description : feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};