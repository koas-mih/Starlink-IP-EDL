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
  const [csvData, setCsvData] = useState<string | null>(null);
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

  // Function to load the latest data from the server without triggering a full fetch
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
          const serverIps = text.trim().split('\n');
          if (serverIps.length > 0) {
            const currentIpsJSON = JSON.stringify(ipAddresses);
            const newIpsJSON = JSON.stringify(serverIps);
            const hasChanged = currentIpsJSON !== newIpsJSON;
            
            if (hasChanged) {
              setIpAddresses(serverIps);
              localStorage.setItem('ipAddresses', JSON.stringify(serverIps));
              console.log(`Successfully loaded ${serverIps.length} IPs from server`);
              
              if (showSuccess) {
                showSuccessMessage();
              }
            } else {
              console.log('IP data unchanged, not updating state');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data from server:', error);
    }
  };

  // Define fetchData - now uses server-side fetching
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
      fetchChangelog();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Fetch error:', errorMessage);
      
      // Try to load cached data if available
      const storedIps = localStorage.getItem('ipAddresses');
      if (storedIps && ipAddresses.length === 0) {
        setIpAddresses(JSON.parse(storedIps));
        console.log('Recovered using cached IP addresses from localStorage');
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 1000);
    }
  }, [ipAddresses]);


  // Initial data load effect
  useEffect(() => {
    const checkForUpdates = () => {
      Promise.all([
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
            const storedTime = localStorage.getItem('lastUpdated');
            if (storedTime) {
              setLastUpdated(storedTime);
            }
          }),
        loadLatestDataFromServer(false)
      ]).catch(console.error);
    };
    
    const handleFetchEvent = () => {
      if (!isFetchingRef.current) {
        fetchData();
      }
    };
    window.addEventListener('fetch-starlink-data', handleFetchEvent);
    
    checkForUpdates();
    
    return () => {
      window.removeEventListener('fetch-starlink-data', handleFetchEvent);
    };
  }, [fetchData]);


  // Listen for storage events from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastUpdated' && e.newValue) {
        setLastUpdated(e.newValue);
        localStorage.setItem('lastUpdated', e.newValue);
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
    csvData,
    changelog,
    showChangelog,
    fetchData,
    toggleChangelog
  };
};