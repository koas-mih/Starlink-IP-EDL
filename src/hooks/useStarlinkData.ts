import { useState, useEffect, useRef, useCallback } from 'react';

export interface ChangelogEntry {
  date: string;
  ipAddresses: string[];
  added: string[];
  removed: string[];
}

export const useStarlinkData = () => {
  const [ipAddresses, setIpAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  
  const isFetchingRef = useRef(false);
  const successTimeoutRef = useRef<number | null>(null);

  // Function to fetch changelog from server
  const fetchChangelog = async () => {
    try {
      const response = await fetch('/api/changelog');
      if (response.ok) {
        const data = await response.json();
        setChangelog(data.changelog || []);
      }
    } catch (error) {
      console.error('Error fetching changelog:', error);
    }
  };

  // Function to safely set success state with proper timeout
  const showSuccessMessage = () => {
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    
    setFetchSuccess(true);
    
    successTimeoutRef.current = window.setTimeout(() => {
      setFetchSuccess(false);
      successTimeoutRef.current = null;
    }, 3000);
  };

  // Function to load the latest data from the server
  const loadLatestDataFromServer = async (showSuccess = true) => {
    try {
      const response = await fetch('/ipv4.txt', {
        cache: 'no-cache',
        headers: {
          'Accept': 'text/plain'
        }
      });
      
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          const serverIps = text.trim().split('\n').filter(ip => ip.trim());
          if (serverIps.length > 0) {
            setIpAddresses(serverIps);
            localStorage.setItem('ipAddresses', JSON.stringify(serverIps));
            console.log(`Successfully loaded ${serverIps.length} IPs from server`);
            
            if (showSuccess) {
              showSuccessMessage();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data from server:', error);
    }
  };

  // Define fetchData - triggers server-side update
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError('');
      
      // Trigger server-side update
      const response = await fetch('/api/trigger-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Server update triggered successfully:', result);
      
      // Wait a moment for the server to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Load the updated data from server
      await loadLatestDataFromServer(true);
      
      // Update last updated time
      const timeResponse = await fetch('/api/last-updated');
      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        if (timeData.lastUpdated) {
          setLastUpdated(timeData.lastUpdated);
          localStorage.setItem('lastUpdated', timeData.lastUpdated);
        }
      }
      
      // Refresh changelog
      await fetchChangelog();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Fetch error:', errorMessage);
      
      // Try to load cached data if available
      const storedIps = localStorage.getItem('ipAddresses');
      if (storedIps) {
        try {
          const parsedIps = JSON.parse(storedIps);
          if (Array.isArray(parsedIps) && parsedIps.length > 0) {
            setIpAddresses(parsedIps);
            console.log('Recovered using cached IP addresses from localStorage');
          }
        } catch (parseError) {
          console.error('Error parsing cached IP addresses:', parseError);
        }
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 1000);
    }
  }, []);

  // Initial data load effect
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load cached data first
        const storedIps = localStorage.getItem('ipAddresses');
        const storedTime = localStorage.getItem('lastUpdated');
        
        if (storedIps) {
          try {
            const parsedIps = JSON.parse(storedIps);
            if (Array.isArray(parsedIps) && parsedIps.length > 0) {
              setIpAddresses(parsedIps);
            }
          } catch (parseError) {
            console.error('Error parsing cached IP addresses:', parseError);
          }
        }
        
        if (storedTime) {
          setLastUpdated(storedTime);
        }
        
        // Fetch fresh data from server
        await Promise.all([
          fetchChangelog(),
          fetch('/api/last-updated')
            .then(response => response.json())
            .then(data => {
              if (data.lastUpdated) {
                setLastUpdated(data.lastUpdated);
                localStorage.setItem('lastUpdated', data.lastUpdated);
              }
            })
            .catch(error => {
              console.error('Error fetching last updated time:', error);
            }),
          loadLatestDataFromServer(false)
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };
    
    const handleFetchEvent = () => {
      if (!isFetchingRef.current) {
        fetchData();
      }
    };
    
    window.addEventListener('fetch-starlink-data', handleFetchEvent);
    initializeData();
    
    return () => {
      window.removeEventListener('fetch-starlink-data', handleFetchEvent);
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [fetchData]);

  // Listen for storage events from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastUpdated' && e.newValue) {
        setLastUpdated(e.newValue);
      }
      if (e.key === 'ipAddresses' && e.newValue) {
        try {
          const parsedIps = JSON.parse(e.newValue);
          if (Array.isArray(parsedIps)) {
            setIpAddresses(parsedIps);
          }
        } catch (parseError) {
          console.error('Error parsing IP addresses from storage event:', parseError);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Toggle changelog view
  const toggleChangelog = () => {
    setShowChangelog(!showChangelog);
  };

  return {
    ipAddresses,
    isLoading,
    error,
    lastUpdated,
    fetchSuccess,
    changelog,
    showChangelog,
    fetchData,
    toggleChangelog
  };
};