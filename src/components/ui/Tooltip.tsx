import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  return (
    <div className="relative" 
         onMouseEnter={() => setIsTooltipVisible(true)} 
         onMouseLeave={() => setIsTooltipVisible(false)}>
      {children}
      <AnimatePresence>
        {isTooltipVisible && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          >
            {content}
            <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -bottom-1 left-1/2 -ml-1"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};