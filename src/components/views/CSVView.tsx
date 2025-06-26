import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CSVViewProps {
  ipAddresses: string[];
  onBack: () => void;
}

export const CSVView: React.FC<CSVViewProps> = ({ ipAddresses, onBack }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the /ipv4 route instead of showing this view
    // This will directly take the user to the .txt file
    navigate('/ipv4.txt', { replace: true });
  }, [navigate]);
  
  return (
    <div className="min-h-screen bg-white text-black font-mono p-0 m-0">
      <div className="fixed top-0 right-0 p-2 z-10">
        <button 
          onClick={onBack}
          className="bg-gray-200 hover:bg-gray-300 text-black font-mono text-xs px-2 py-1 rounded"
        >
          Back to main view
        </button>
      </div>
      <pre className="p-0 m-0 text-xs sm:text-sm md:text-base font-mono whitespace-pre-wrap">
{ipAddresses.join('\n')}
      </pre>
    </div>
  );
};