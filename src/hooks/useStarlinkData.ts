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
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(60);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [nextUpdateTime, setNextUpdateTime] = useState<number>(0); // Will be set by server
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const isFetchingRef = useRef(false);
  const successTimeoutRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const MIN_UPDATE_INTERVAL = 5000;

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

  // Function to update interval settings - sends to server
  const updateIntervalSettings = useCallback(async (minutes: number) => {
    if (minutes >= 1) {
      try {
        const response = await fetch('/api/update-interval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ interval: minutes })
        });
        
        if (response.ok) {
          setUpdateInterval(minutes);
          console.log(`Interval updated to ${minutes} minutes`);
        } else {
          const error = await response.json();
          console.error('Error updating interval:', error);
        }
      } catch (error) {
        console.error('Failed to update interval:', error);
      }
    }
  }, []);

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

  // Set up SSE connection for real-time updates
  useEffect(() => {
    try {
      const eventSource = new EventSource('/api/updates');
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        setSseConnected(true);
        console.log('SSE connection established');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'update') {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
            
            if (timeSinceLastUpdate >= MIN_UPDATE_INTERVAL) {
              lastUpdateTimeRef.current = now;
              if (data.lastUpdated) {
                setLastUpdated(data.lastUpdated);
              }
              if (data.nextUpdateTime) {
                setNextUpdateTime(data.nextUpdateTime);
              }
              loadLatestDataFromServer(false);
            } else {
              console.log(`Ignoring update, last update was ${timeSinceLastUpdate}ms ago`);
            }
          }
          
          if (data.type === 'settingsChange') {
            if (data.updateInterval !== undefined) {
              setUpdateInterval(data.updateInterval);
            }
            
            if (data.autoUpdateEnabled !== undefined && data.autoUpdateEnabled !== autoUpdateEnabled) {
              setAutoUpdateEnabled(data.autoUpdateEnabled);
            }
            
            if (data.nextUpdateTime !== undefined) {
              setNextUpdateTime(data.nextUpdateTime);
            }
          }
          
          if (data.type === 'connected' && data.currentSettings) {
            if (data.currentSettings.updateInterval !== undefined) {
              setUpdateInterval(data.currentSettings.updateInterval);
            }
            if (data.currentSettings.nextUpdateTime !== undefined) {
              setNextUpdateTime(data.currentSettings.nextUpdateTime);
            }
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = () => {
        console.log('SSE connection error - will reconnect automatically');
        setSseConnected(false);
        
        setTimeout(() => {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = new EventSource('/api/updates');
          }
        }, 5000);
      };
    } catch (err) {
      console.error('Error setting up SSE connection:', err);
      setSseConnected(false);
    }
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [autoUpdateEnabled]);

  // Listen for storage events from other tabs/windows and fetch server settings
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastUpdated' && e.newValue) {
        setLastUpdated(e.newValue);
        localStorage.setItem('lastUpdated', e.newValue);
      }
    };
    
    const handleSettingsChange = (e: CustomEvent) => {
      const { updateInterval: newInterval, autoUpdateEnabled: newAutoUpdate } = e.detail;
      if (newInterval !== undefined) {
        setUpdateInterval(newInterval);
      }
      if (newAutoUpdate !== undefined) {
        setAutoUpdateEnabled(newAutoUpdate);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settings-changed', handleSettingsChange as EventListener);
    
    // Fetch server settings including nextUpdateTime
    fetch('/api/settings')
      .then(res => res.json())
      .then(settings => {
        if (settings.updateInterval) {
          setUpdateInterval(settings.updateInterval);
        }
        if (typeof settings.autoUpdateEnabled === 'boolean') {
          setAutoUpdateEnabled(settings.autoUpdateEnabled);
        }
        if (settings.nextUpdateTime) {
          setNextUpdateTime(settings.nextUpdateTime);
          console.log(`Client synchronized with server nextUpdateTime: ${new Date(settings.nextUpdateTime).toISOString()}`);
        }
      })
      .catch(console.error);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
    };
  }, []);

  // Toggle auto-update function
  const toggleAutoUpdate = () => {
    const newState = !autoUpdateEnabled;
    setAutoUpdateEnabled(newState);
    
    fetch('/api/update-interval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ autoUpdateEnabled: newState })
    }).catch(err => {
      console.error('Error updating auto-update setting:', err);
    });
  };

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
    autoUpdateEnabled,
    changelog,
    nextUpdateTime, // This is now server-authoritative
    showChangelog,
    fetchData,
    updateInterval,
    updateIntervalSettings,
    toggleAutoUpdate,
    toggleChangelog
  };
};