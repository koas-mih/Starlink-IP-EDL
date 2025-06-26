import { useState, useEffect, useRef, useCallback } from 'react';

const STARLINK_CSV_URL = 'https://geoip.starlinkisp.net/feed.csv';

// Use a predefined list of CORS proxies to try
const corsProxies = [
  'https://corsproxy.io/?',
  'https://proxy.cors.sh/',
  'https://api.allorigins.win/raw?url=',
  'https://cors-proxy.htmldriven.com/?url='
];

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
  const [nextUpdateTime, setNextUpdateTime] = useState<number>(0); // Server-authoritative
  
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

  // Function to try fetching with different proxies
  const tryNextProxy = async (url: string, attempt = 0): Promise<string | null> => {
    if (attempt >= corsProxies.length) {
      console.warn(`Failed to fetch Starlink IP data after trying ${corsProxies.length} different proxies`);
      return null;
    }

    const proxy = corsProxies[attempt];
    console.log(`Trying proxy ${attempt + 1}/${corsProxies.length}: ${proxy}`);
    
    try {
      let proxyUrl;
      if (proxy === 'https://cors-proxy.htmldriven.com/?url=') {
        proxyUrl = `${proxy}${encodeURIComponent(url)}&key=&mime=text/plain`;
      } else if (proxy === 'https://corsproxy.io/?') {
        proxyUrl = `${proxy}${url}`;
      } else {
        proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      }
      
      console.log(`Attempting proxy fetch with URL: ${proxyUrl}`);
      
      const response = await fetchWithTimeout(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Proxy ${attempt + 1} failed with: ${response.status}`);
      }
      
      if (proxy === 'https://cors-proxy.htmldriven.com/?url=') {
        const data = await response.json();
        return data.contents;
      }
      
      return await response.text();
    } catch (error) {
      console.log(`Proxy ${attempt + 1} failed:`, error);
      return tryNextProxy(url, attempt + 1);
    }
  };

  // Improved fetch with timeout function
  const fetchWithTimeout = async (url: string, timeout = 30000) => {
    const controller = new AbortController();
    const signal = controller.signal;
    
    const timeoutPromise = new Promise<Response>((_, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        controller.abort();
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
    });
    
    try {
      const response = await Promise.race([
        fetch(url, { signal }),
        timeoutPromise
      ]);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Function to process CSV data and extract IP addresses
  const processCSVData = (csvText: string) => {
    if (!csvText || typeof csvText !== 'string') {
      throw new Error('Received invalid or empty CSV data');
    }
    
    const lines = csvText.split('\n');
    const ipv4List: string[] = [];
    
    lines.forEach(line => {
      const cells = line.split(',');
      cells.forEach(cell => {
        const match = cell.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})/);
        if (match) {
          ipv4List.push(match[0]);
        }
      });
    });
    
    if (ipv4List.length === 0) {
      throw new Error('No IPv4 CIDR addresses found in the CSV file.');
    }
    
    return ipv4List;
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

  // Function to update changelog with new IP addresses
  const updateChangelog = (newIpAddresses: string[]) => {
    if (ipAddresses.length > 0) {
      const currentSet = new Set(ipAddresses);
      const newSet = new Set(newIpAddresses);
      
      const added = newIpAddresses.filter(ip => !currentSet.has(ip));
      const removed = ipAddresses.filter(ip => !newSet.has(ip));
      
      if (added.length > 0 || removed.length > 0) {
        const entry: ChangelogEntry = {
          date: new Date().toISOString(),
          ipAddresses: [...newIpAddresses],
          added,
          removed
        };
        
        fetch('/api/update-changelog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ entry })
        })
        .then(() => {
          fetchChangelog();
        })
        .catch(err => {
          console.error('Error updating changelog:', err);
        });
      }
    }
  };

  // Define fetchData before it's used in any effects or other functions
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError('');
      
      // Delegate data fetching to the server
      console.log('Triggering server-side data fetch...');
      const response = await fetch('/api/update-ip-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          forceUpdate: true
        })
      });
      
      if (response.ok) {
        // Wait for server to process and write the updated files
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Load the newly updated data from server
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
        
        // Fetch updated changelog
        fetchChangelog();
      } else {
        const errorData = await response.json();
        throw new Error(`Failed to trigger server update: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Fetch error:', errorMessage);
      
      // Fall back to cached data if available
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
        console.log(`Client: Updating interval to ${minutes} minutes`);
        const response = await fetch('/api/update-interval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ interval: minutes })
        });
        
        if (response.ok) {
          // Don't update local state here - wait for server response via SSE
          console.log(`Client: Interval update request sent successfully`);
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
    let reconnectTimeout: number | null = null;
    
    const setupSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      try {
        console.log('Setting up SSE connection...');
        const eventSource = new EventSource('/api/updates');
        eventSourceRef.current = eventSource;
        
        eventSource.onopen = () => {
          setSseConnected(true);
          console.log('SSE connection established');
          
          // Clear any pending reconnection
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('SSE message received:', data);
            
            if (data.type === 'update') {
              const now = Date.now();
              const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
              
              if (timeSinceLastUpdate >= MIN_UPDATE_INTERVAL) {
                lastUpdateTimeRef.current = now;
                if (data.lastUpdated) {
                  setLastUpdated(data.lastUpdated);
                  localStorage.setItem('lastUpdated', data.lastUpdated);
                }
                if (data.nextUpdateTime) {
                  console.log(`Client: Received new nextUpdateTime from server: ${new Date(data.nextUpdateTime).toISOString()}`);
                  setNextUpdateTime(data.nextUpdateTime);
                }
                loadLatestDataFromServer(false);
              } else {
                console.log(`Ignoring update, last update was ${timeSinceLastUpdate}ms ago`);
              }
            }
            
            if (data.type === 'settingsChange') {
              console.log('Client: Received settings change from server:', data);
              if (data.updateInterval !== undefined) {
                setUpdateInterval(data.updateInterval);
              }
              
              if (data.autoUpdateEnabled !== undefined) {
                setAutoUpdateEnabled(data.autoUpdateEnabled);
              }
              
              if (data.nextUpdateTime !== undefined) {
                console.log(`Client: Settings change - new nextUpdateTime: ${new Date(data.nextUpdateTime).toISOString()}`);
                setNextUpdateTime(data.nextUpdateTime);
              }
            }
            
            if (data.type === 'connected' && data.currentSettings) {
              console.log('Client: Connected to SSE, received current settings:', data.currentSettings);
              if (data.currentSettings.updateInterval !== undefined) {
                setUpdateInterval(data.currentSettings.updateInterval);
              }
              if (data.currentSettings.nextUpdateTime !== undefined) {
                console.log(`Client: Initial sync - nextUpdateTime: ${new Date(data.currentSettings.nextUpdateTime).toISOString()}`);
                setNextUpdateTime(data.currentSettings.nextUpdateTime);
              }
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };
        
        eventSource.onerror = (error) => {
          console.log('SSE connection error - will reconnect automatically', error);
          setSseConnected(false);
          
          // Close current connection
          eventSource.close();
          
          // Schedule reconnection
          if (!reconnectTimeout) {
            reconnectTimeout = window.setTimeout(() => {
              console.log('Attempting to reconnect SSE...');
              setupSSE();
            }, 5000);
          }
        };
      } catch (err) {
        console.error('Error setting up SSE connection:', err);
        setSseConnected(false);
        
        // Schedule reconnection on setup error
        if (!reconnectTimeout) {
          reconnectTimeout = window.setTimeout(() => {
            console.log('Retrying SSE setup...');
            setupSSE();
          }, 5000);
        }
      }
    };
    
    // Initial setup
    setupSSE();
    
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, []);

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
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(settings => {
        console.log('Client: Fetched initial settings from server:', settings);
        if (settings.updateInterval) {
          setUpdateInterval(settings.updateInterval);
        }
        if (typeof settings.autoUpdateEnabled === 'boolean') {
          setAutoUpdateEnabled(settings.autoUpdateEnabled);
        }
        if (settings.nextUpdateTime) {
          console.log(`Client: Initial settings fetch - nextUpdateTime: ${new Date(settings.nextUpdateTime).toISOString()}`);
          setNextUpdateTime(settings.nextUpdateTime);
        }
      })
      .catch(error => {
        console.error('Error fetching initial settings:', error);
        // Set a fallback nextUpdateTime if server fetch fails
        if (!nextUpdateTime) {
          const fallbackTime = Date.now() + (updateInterval * 60 * 1000);
          setNextUpdateTime(fallbackTime);
        }
      });
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
    };
  }, []);

  // Toggle auto-update function
  const toggleAutoUpdate = () => {
    const newState = !autoUpdateEnabled;
    console.log(`Client: Toggling auto-update to ${newState}`);
    
    // Optimistically update the UI
    setAutoUpdateEnabled(newState);
    
    fetch('/api/update-interval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ autoUpdateEnabled: newState })
    }).catch(err => {
      console.error('Error updating auto-update setting:', err);
      // Revert on error
      setAutoUpdateEnabled(!newState);
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