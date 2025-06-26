import { useState, useEffect, useCallback } from 'react';

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

  // Load initial data from localStorage
  useEffect(() => {
    const storedIps = localStorage.getItem('starlink_ipAddresses');
    const storedTime = localStorage.getItem('starlink_lastUpdated');
    
    if (storedIps) {
      try {
        const parsedIps = JSON.parse(storedIps);
        if (Array.isArray(parsedIps) && parsedIps.length > 0) {
          setIpAddresses(parsedIps);
        }
      } catch (e) {
        console.error('Error parsing stored IP addresses:', e);
      }
    }
    
    if (storedTime) {
      setLastUpdated(storedTime);
    }

    // Load changelog
    const storedChangelog = localStorage.getItem('starlink_changelog');
    if (storedChangelog) {
      try {
        const parsedChangelog = JSON.parse(storedChangelog);
        if (Array.isArray(parsedChangelog)) {
          setChangelog(parsedChangelog);
        }
      } catch (e) {
        console.error('Error parsing stored changelog:', e);
      }
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (ipAddresses.length > 0) {
      localStorage.setItem('starlink_ipAddresses', JSON.stringify(ipAddresses));
    }
  }, [ipAddresses]);

  useEffect(() => {
    if (lastUpdated) {
      localStorage.setItem('starlink_lastUpdated', lastUpdated);
    }
  }, [lastUpdated]);

  useEffect(() => {
    if (changelog.length > 0) {
      localStorage.setItem('starlink_changelog', JSON.stringify(changelog));
    }
  }, [changelog]);

  // Show success message with auto-hide
  const showSuccessMessage = useCallback(() => {
    setFetchSuccess(true);
    setTimeout(() => setFetchSuccess(false), 3000);
  }, []);

  // Main fetch function
  const fetchData = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      // Call server to fetch fresh data
      const response = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Get the updated data
        const dataResponse = await fetch('/api/data');
        
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          
          setIpAddresses(data.ipAddresses || []);
          setLastUpdated(data.lastUpdated);
          setChangelog(data.changelog || []);
          
          showSuccessMessage();
        }
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, showSuccessMessage]);

  // Load current data from server without fetching new
  const loadCurrentData = useCallback(async () => {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const data = await response.json();
        setIpAddresses(data.ipAddresses || []);
        setLastUpdated(data.lastUpdated);
        setChangelog(data.changelog || []);
      }
    } catch (err) {
      console.error('Error loading current data:', err);
    }
  }, []);

  // Load current data on mount
  useEffect(() => {
    loadCurrentData();
  }, [loadCurrentData]);

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