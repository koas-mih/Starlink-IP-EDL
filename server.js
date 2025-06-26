import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { promisify } from 'util';
import updateIpHandler from './api/update-ip.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Promisify writeFile for better async handling
const writeFileAsync = promisify(writeFileSync);

// Default update interval (15 minutes)
const DEFAULT_UPDATE_INTERVAL = 15;
let currentUpdateInterval = DEFAULT_UPDATE_INTERVAL;
let updateTimer = null;
let nextUpdateTime = 0; // Server-side authoritative next update time
let lastUpdateTime = 0;
const MIN_UPDATE_INTERVAL = 5000; // 5 seconds minimum between updates

// Initialize directories
const publicDir = resolve(__dirname, 'public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

const dataDir = resolve(__dirname, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const ipFilePath = resolve(publicDir, 'ipv4.txt');
const ipDataPath = resolve(dataDir, 'ipData.json');

// Ensure ipData.json exists with nextUpdateTime
if (!existsSync(ipDataPath)) {
  const now = Date.now();
  writeFileSync(ipDataPath, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    ipAddresses: [],
    updateInterval: DEFAULT_UPDATE_INTERVAL,
    autoUpdateEnabled: true,
    changelog: [],
    nextUpdateTime: now + (DEFAULT_UPDATE_INTERVAL * 60 * 1000) // Initialize with default interval
  }, null, 2), 'utf-8');
}

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

const corsProxies = [
  'https://corsproxy.io/?',
  'https://proxy.cors.sh/',
  'https://api.allorigins.win/raw?url=',
  'https://cors-proxy.htmldriven.com/?url='
];

// Connected SSE clients
const sseClients = new Set();

// Function to notify all connected clients of updates
function notifyClients(message) {
  sseClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE message:', error);
      sseClients.delete(client);
    }
  });
}

// Function to save nextUpdateTime to persistent storage
function saveNextUpdateTime(nextTime) {
  try {
    let ipData;
    try {
      ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    } catch (readError) {
      // If file doesn't exist or is corrupted, create default structure
      ipData = {
        lastUpdated: new Date().toISOString(),
        ipAddresses: [],
        updateInterval: DEFAULT_UPDATE_INTERVAL,
        autoUpdateEnabled: true,
        changelog: []
      };
    }
    
    ipData.nextUpdateTime = nextTime;
    writeFileSync(ipDataPath, JSON.stringify(ipData, null, 2), 'utf-8');
    nextUpdateTime = nextTime;
    console.log(`Next update time saved: ${new Date(nextTime).toISOString()}`);
  } catch (error) {
    console.error('Error saving next update time:', error);
  }
}

// Function to load nextUpdateTime from persistent storage
function loadNextUpdateTime() {
  try {
    let ipData;
    try {
      ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    } catch (readError) {
      console.log('No existing ipData.json found, will create new one');
      const now = Date.now();
      const intervalMs = currentUpdateInterval * 60 * 1000;
      nextUpdateTime = now + intervalMs;
      saveNextUpdateTime(nextUpdateTime);
      return nextUpdateTime;
    }
    
    if (ipData.nextUpdateTime && typeof ipData.nextUpdateTime === 'number') {
      nextUpdateTime = ipData.nextUpdateTime;
      console.log(`Loaded next update time: ${new Date(nextUpdateTime).toISOString()}`);
      return nextUpdateTime;
    }
  } catch (error) {
    console.error('Error loading next update time:', error);
  }
  
  // If no valid nextUpdateTime found, calculate a new one
  const now = Date.now();
  const intervalMs = currentUpdateInterval * 60 * 1000;
  nextUpdateTime = now + intervalMs;
  saveNextUpdateTime(nextUpdateTime);
  return nextUpdateTime;
}

// Function to fetch and update IP addresses
async function updateIPAddresses() {
  // Prevent updates too close together
  const now = Date.now();
  if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
    console.log('Background task: Skipping update - too soon since last update');
    return;
  }
  
  console.log('Background task: Starting IP address update...');
  
  try {
    // Read current settings
    const currentData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    
    // Check if auto-update is enabled
    if (!currentData.autoUpdateEnabled) {
      console.log('Background task: Auto-update is disabled, skipping update');
      // Still schedule next update check
      scheduleNextUpdate();
      return;
    }
    
    const STARLINK_CSV_URL = 'https://geoip.starlinkisp.net/feed.csv';
    
    // Try direct fetch first
    let csvText = '';
    try {
      console.log('Background task: Attempting direct fetch...');
      const response = await fetch(STARLINK_CSV_URL, {
        headers: {
          'Accept': 'text/plain,text/csv,*/*'
        }
      });
      
      if (response.ok) {
        csvText = await response.text();
        console.log('Background task: Direct fetch successful');
      }
    } catch (directError) {
      console.log('Background task: Direct fetch failed:', directError);
    }
    
    // If direct fetch failed, try proxies
    if (!csvText) {
      console.log('Background task: Trying CORS proxies...');
      for (const proxy of corsProxies) {
        try {
          let proxyUrl;
          if (proxy === 'https://cors-proxy.htmldriven.com/?url=') {
            proxyUrl = `${proxy}${encodeURIComponent(STARLINK_CSV_URL)}&key=&mime=text/plain`;
          } else if (proxy === 'https://corsproxy.io/?') {
            proxyUrl = `${proxy}${STARLINK_CSV_URL}`;
          } else {
            proxyUrl = `${proxy}${encodeURIComponent(STARLINK_CSV_URL)}`;
          }
          
          const response = await fetch(proxyUrl);
          
          if (!response.ok) continue;
          
          if (proxy === 'https://cors-proxy.htmldriven.com/?url=') {
            const data = await response.json();
            csvText = data.contents;
          } else {
            csvText = await response.text();
          }
          
          if (csvText) {
            console.log('Background task: Successfully fetched data through proxy');
            break;
          }
        } catch (error) {
          console.log(`Background task: Proxy failed:`, error);
          continue;
        }
      }
    }
    
    if (!csvText) {
      throw new Error('Background task: Failed to fetch data from all sources');
    }
    
    // Process CSV data
    const lines = csvText.split('\n');
    const ipv4List = [];
    
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
      throw new Error('Background task: No IPv4 addresses found in data');
    }
    
    // Update files
    const updateTime = new Date().toISOString();
    
    // Update last update time
    lastUpdateTime = now;
    
    // Write to ipv4.txt
    writeFileSync(ipFilePath, ipv4List.join('\n'), 'utf-8');
    
    // Update ipData.json
    const oldIpAddresses = currentData.ipAddresses || [];
    const oldIpSet = new Set(oldIpAddresses);
    const newIpSet = new Set(ipv4List);
    
    // Find changes
    const added = ipv4List.filter(ip => !oldIpSet.has(ip));
    const removed = oldIpAddresses.filter(ip => !newIpSet.has(ip));
    
    // Only create changelog entry if there are changes
    if (added.length > 0 || removed.length > 0) {
      const entry = {
        date: updateTime,
        ipAddresses: ipv4List,
        added,
        removed
      };
      
      // Update changelog (keep only last 10 entries)
      currentData.changelog = [entry, ...(currentData.changelog || [])].slice(0, 10);
    }
    
    // Update data
    currentData.lastUpdated = updateTime;
    currentData.ipAddresses = ipv4List;
    
    // Calculate and save next update time
    const intervalMs = currentData.updateInterval * 60 * 1000;
    const newNextUpdateTime = now + intervalMs;
    currentData.nextUpdateTime = newNextUpdateTime;
    
    // Write updated data
    writeFileSync(ipDataPath, JSON.stringify(currentData, null, 2), 'utf-8');
    
    // Update server state
    nextUpdateTime = newNextUpdateTime;
    
    // Write last update time
    writeFileSync(resolve(publicDir, 'last-update.txt'), updateTime, 'utf-8');
    
    // Notify clients with nextUpdateTime
    notifyClients({
      type: 'update',
      lastUpdated: updateTime,
      nextUpdateTime: newNextUpdateTime
    });
    
    console.log('Background task: Update completed successfully');
    console.log(`Next update scheduled for: ${new Date(newNextUpdateTime).toISOString()}`);
    
  } catch (error) {
    console.error('Background task: Error updating IP addresses:', error.message);
  } finally {
    // Always schedule the next update
    scheduleNextUpdate();
  }
}

// Function to schedule the next update with drift correction
function scheduleNextUpdate() {
  // Clear existing timer
  if (updateTimer !== null) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  
  const now = Date.now();
  
  // If nextUpdateTime is in the past or not set, calculate a new one
  if (nextUpdateTime <= now) {
    const intervalMs = currentUpdateInterval * 60 * 1000;
    nextUpdateTime = now + intervalMs;
    saveNextUpdateTime(nextUpdateTime);
  }
  
  // Calculate delay until next update
  const delay = Math.max(1000, nextUpdateTime - now); // At least 1 second delay
  
  console.log(`Background task: Next update scheduled for ${new Date(nextUpdateTime).toISOString()}`);
  console.log(`Background task: Delay until next update: ${delay}ms`);
  
  // Schedule next update
  updateTimer = setTimeout(async () => {
    await updateIPAddresses();
  }, delay);
}

// Function to set up the update timer
function setupUpdateTimer(interval) {
  // Validate and set interval
  interval = Math.max(1, parseInt(interval, 10));
  currentUpdateInterval = interval;
  
  console.log(`Background task: Update interval set to ${interval} minutes`);
  
  // Load existing nextUpdateTime or calculate new one
  loadNextUpdateTime();
  
  // Schedule the update
  scheduleNextUpdate();
  
  return true;
}

// Check for settings in ipData.json and apply them
try {
  if (existsSync(ipDataPath)) {
    const ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    if (ipData.updateInterval && typeof ipData.updateInterval === 'number') {
      currentUpdateInterval = ipData.updateInterval;
    }
    // Load the nextUpdateTime from storage
    loadNextUpdateTime();
  } else {
    console.log('No ipData.json found, using defaults and calculating new nextUpdateTime');
    const now = Date.now();
    const intervalMs = currentUpdateInterval * 60 * 1000;
    nextUpdateTime = now + intervalMs;
    saveNextUpdateTime(nextUpdateTime);
  }
} catch (error) {
  console.log('Error reading ipData.json, using defaults:', error.message);
  const now = Date.now();
  const intervalMs = currentUpdateInterval * 60 * 1000;
  nextUpdateTime = now + intervalMs;
  saveNextUpdateTime(nextUpdateTime);
}

// Schedule regular updates
setupUpdateTimer(currentUpdateInterval);

// Middleware to parse JSON
app.use(express.json());

// API Routes
app.get('/api/last-updated', (req, res) => {
  try {
    const ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    res.json({ lastUpdated: ipData.lastUpdated });
  } catch (error) {
    console.error('Error getting last update time:', error);
    res.status(500).json({ error: 'Failed to get last update time' });
  }
});

app.post('/api/update-interval', (req, res) => {
  try {
    const { interval, autoUpdateEnabled } = req.body;
    console.log('Received update request:', { interval, autoUpdateEnabled });
    
    // Read current data
    let ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    
    // Update interval if provided
    if (typeof interval === 'number' && interval >= 1) {
      console.log(`Updating interval to ${interval} minutes`);
      ipData.updateInterval = interval;
      currentUpdateInterval = interval;
      
      // Calculate new nextUpdateTime based on new interval
      const now = Date.now();
      const intervalMs = interval * 60 * 1000;
      const newNextUpdateTime = now + intervalMs;
      ipData.nextUpdateTime = newNextUpdateTime;
      nextUpdateTime = newNextUpdateTime;
      
      // Set up new timer with validated interval
      if (!setupUpdateTimer(interval)) {
        throw new Error('Failed to update timer interval');
      }
      
      // Notify clients about the interval change with new nextUpdateTime
      notifyClients({
        type: 'settingsChange',
        updateInterval: interval,
        nextUpdateTime: newNextUpdateTime
      });
    }
    
    // Update auto-update setting if provided
    if (typeof autoUpdateEnabled === 'boolean') {
      console.log(`Updating autoUpdateEnabled to ${autoUpdateEnabled}`);
      ipData.autoUpdateEnabled = autoUpdateEnabled;
      
      // If enabling auto-update and it's been a while, trigger an update
      if (autoUpdateEnabled) {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTime;
        if (timeSinceLastUpdate >= MIN_UPDATE_INTERVAL) {
          console.log('Triggering update after enabling auto-update');
          updateIPAddresses();
        } else {
          console.log(`Skipping update, last update was ${timeSinceLastUpdate}ms ago`);
        }
      }
      
      // Notify clients about the setting change
      notifyClients({
        type: 'settingsChange',
        autoUpdateEnabled,
        nextUpdateTime: nextUpdateTime
      });
    }
    
    // Save updated settings
    writeFileSync(ipDataPath, JSON.stringify(ipData, null, 2), 'utf-8');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    let ipData;
    try {
      ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    } catch (readError) {
      // Return defaults if file doesn't exist
      return res.json({
        updateInterval: DEFAULT_UPDATE_INTERVAL,
        autoUpdateEnabled: true,
        nextUpdateTime: nextUpdateTime || Date.now() + (DEFAULT_UPDATE_INTERVAL * 60 * 1000)
      });
    }
    
    res.json({
      updateInterval: ipData.updateInterval || DEFAULT_UPDATE_INTERVAL,
      autoUpdateEnabled: ipData.autoUpdateEnabled !== undefined ? ipData.autoUpdateEnabled : true,
      nextUpdateTime: nextUpdateTime // Include server's authoritative nextUpdateTime
    });
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.get('/api/changelog', (req, res) => {
  try {
    let ipData;
    try {
      ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    } catch (readError) {
      return res.json({ changelog: [] });
    }
    
    res.json({ changelog: ipData.changelog || [] });
  } catch (error) {
    console.error('Error getting changelog:', error);
    res.status(500).json({ error: 'Failed to get changelog' });
  }
});

app.post('/api/update-changelog', (req, res) => {
  try {
    const { entry } = req.body;
    if (!entry) {
      return res.status(400).json({ error: 'Invalid changelog entry' });
    }
    
    // Read current data
    const ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    
    // Add new entry to the start of changelog
    const newChangelog = [entry, ...(ipData.changelog || [])];
    
    // Keep only the 10 most recent entries
    ipData.changelog = newChangelog.slice(0, 10);
    
    // Write back to file
    writeFileSync(ipDataPath, JSON.stringify(ipData, null, 2), 'utf-8');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating changelog:', error);
    res.status(500).json({ error: 'Failed to update changelog' });
  }
});

// Handle SSE connections
app.get('/api/updates', (req, res) => {
  // Set CORS headers for SSE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  
  res.writeHead(200, headers);
  
  // Send initial connection message with current nextUpdateTime
  try {
    const data = JSON.stringify({ 
      type: 'connected',
      currentSettings: {
        updateInterval: currentUpdateInterval,
        nextUpdateTime: nextUpdateTime || Date.now() + (currentUpdateInterval * 60 * 1000)
      }
    });
    res.write(`data: ${data}\n\n`);
  } catch (error) {
    console.error('Error sending initial SSE message:', error);
  }
  
  // Add client to set
  sseClients.add(res);
  
  // Remove client on disconnect
  req.on('close', () => {
    console.log('SSE client disconnected');
    sseClients.delete(res);
  });
  
  req.on('error', (error) => {
    console.error('SSE connection error:', error);
    sseClients.delete(res);
  });
});

// Add the missing update-ip-file route
app.post('/api/update-ip-file', updateIpHandler);

// Serve IP addresses as plain text
app.get('/ipv4', (req, res) => {
  try {
    let ipData;
    try {
      ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    } catch (readError) {
      return res.status(404).type('text/plain').send('No IP data available');
    }
    
    const ipAddresses = ipData.ipAddresses || [];
    if (ipAddresses.length === 0) {
      return res.status(404).type('text/plain').send('No IP addresses found');
    }
    
    // Set content type to plain text and send IP addresses
    res.type('text/plain').send(ipAddresses.join('\n'));
  } catch (error) {
    console.error('Error serving IP addresses:', error);
    res.status(500).type('text/plain').send('Error retrieving IP addresses');
  }
});

// Serve static files
app.use(express.static(publicDir));

// Handle React Router paths
app.get('*', (req, res) => {
  res.sendFile(resolve(publicDir, 'index.html'));
});

// Start server
// Start HTTP server
app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
  console.log(`Background updates scheduled every ${currentUpdateInterval} minutes`);
  console.log(`Next update: ${new Date(nextUpdateTime).toISOString()}`);
});