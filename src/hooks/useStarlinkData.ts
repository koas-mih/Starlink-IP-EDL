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
    const storedChangelog = localStorage.getItem('starlink_changelog');
    
    if (storedIps) {
      try {
        const parsedIps = JSON.parse(storedIps);
        if (Array.isArray(parsedIps) && parsedIps.length > 0) {
          setIpAddresses(parsedIps);
        }
      } catch (e) {
        console.error('Error parsing stored IP addresses:', e);
        localStorage.removeItem('starlink_ipAddresses');
      }
    }
    
    if (storedTime) {
      setLastUpdated(storedTime);
    }

    if (storedChangelog) {
      try {
        const parsedChangelog = JSON.parse(storedChangelog);
        if (Array.isArray(parsedChangelog)) {
          setChangelog(parsedChangelog);
        }
      } catch (e) {
        console.error('Error parsing stored changelog:', e);
        localStorage.removeItem('starlink_changelog');
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

  // Load current data from server
  const loadCurrentData = useCallback(async () => {
    try {
      const response = await fetch('/api/data');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setIpAddresses(data.ipAddresses || []);
      setLastUpdated(data.lastUpdated);
      setChangelog(data.changelog || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Error loading current data:', errorMessage);
      setError(`Failed to load data: ${errorMessage}`);
    }
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
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      
      if (result.success) {
        // Reload the data
        await loadCurrentData();
        showSuccessMessage();
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
  }, [isLoading, showSuccessMessage, loadCurrentData]);

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