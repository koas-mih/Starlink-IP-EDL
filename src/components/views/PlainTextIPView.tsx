import React, { useEffect, useState } from 'react';

export const PlainTextIPView: React.FC = () => {
  const [ipAddresses, setIpAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // This component is for serving plain text IP addresses
    document.title = 'Starlink IPv4 CIDR Blocks';
    
    // Set content type to plain text by manipulating document style
    document.documentElement.style.cssText = 'font-family: monospace;';
    document.body.style.cssText = 'margin: 0; padding: 0; white-space: pre; font-family: monospace; background-color: white; color: black;';
    
    // Fetch directly from the /ipv4 endpoint
    const fetchIpAddresses = async () => {
      try {
        setIsLoading(true);
        
        // Fetch from the actual /ipv4 endpoint (which serves the .txt file)
        const response = await fetch('/ipv4.txt', {
          headers: {
            'Accept': 'text/plain',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch IP addresses');
        }
        
        const text = await response.text();
        if (text) {
          // Split the text into an array of IP addresses
          const addresses = text.trim().split('\n').filter(line => line.trim());
          setIpAddresses(addresses);
        } else {
          // If no text is returned, try to get data from localStorage
          const storedIps = localStorage.getItem('ipAddresses');
          if (storedIps) {
            setIpAddresses(JSON.parse(storedIps));
            
            // Also trigger update of the ipv4 file
            try {
              const parsedIps = JSON.parse(storedIps);
              fetch('/api/update-ip-file', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ipAddresses: parsedIps })
              });
            } catch (e) {
              console.error('Error updating IP file from localStorage:', e);
            }
          } else {
            // If no stored IPs, trigger a fetch via custom event
            window.dispatchEvent(new CustomEvent('fetch-starlink-data'));
            setError('No IP addresses available. Fetching data now...');
          }
        }
      } catch (error) {
        console.error('Error fetching IP addresses:', error);
        setError('Failed to load IP addresses. Please try again later.');
        
        // Try to get data from localStorage as fallback
        const storedIps = localStorage.getItem('ipAddresses');
        if (storedIps) {
          setIpAddresses(JSON.parse(storedIps));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchIpAddresses();
    
    // Set up a listener to update when localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ipAddresses' && e.newValue) {
        setIpAddresses(JSON.parse(e.newValue));
      }
    };
    
    // Listen for storage events (for when data is updated elsewhere)
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.documentElement.style.cssText = '';
      document.body.style.cssText = '';
    };
  }, []);
  
  if (isLoading) {
    return "Loading Starlink IP addresses...";
  }
  
  if (error && ipAddresses.length === 0) {
    return error;
  }
  
  // Render just the plain text IP addresses
  return <>{ipAddresses.join('\n')}</>;
};