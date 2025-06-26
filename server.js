import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const writeFileAsync = promisify(writeFileSync);

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

// Ensure ipData.json exists
if (!existsSync(ipDataPath)) {
  writeFileSync(ipDataPath, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    ipAddresses: [],
    changelog: []
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

// Function to fetch and update IP addresses
async function updateIPAddresses() {
  console.log('Manual update: Starting IP address update...');
  
  try {
    // Read current settings
    const currentData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    
    const STARLINK_CSV_URL = 'https://geoip.starlinkisp.net/feed.csv';
    
    // Try direct fetch first
    let csvText = '';
    try {
      console.log('Manual update: Attempting direct fetch...');
      const response = await fetch(STARLINK_CSV_URL, {
        headers: {
          'Accept': 'text/plain,text/csv,*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.ok) {
        csvText = await response.text();
        console.log('Manual update: Direct fetch successful');
      }
    } catch (directError) {
      console.log('Manual update: Direct fetch failed:', directError);
    }
    
    // If direct fetch failed, try proxies
    if (!csvText) {
      console.log('Manual update: Trying CORS proxies...');
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
          
          const response = await fetch(proxyUrl, {
            headers: {
              'Accept': 'text/plain,text/csv,*/*',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (!response.ok) continue;
          
          if (proxy === 'https://cors-proxy.htmldriven.com/?url=') {
            const data = await response.json();
            csvText = data.contents;
          } else {
            csvText = await response.text();
          }
          
          if (csvText) {
            console.log('Manual update: Successfully fetched data through proxy');
            break;
          }
        } catch (error) {
          console.log(`Manual update: Proxy failed:`, error);
          continue;
        }
      }
    }
    
    if (!csvText) {
      throw new Error('Manual update: Failed to fetch data from all sources');
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
      throw new Error('Manual update: No IPv4 addresses found in data');
    }
    
    // Update files
    const updateTime = new Date().toISOString();
    
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
    
    // Write updated data
    writeFileSync(ipDataPath, JSON.stringify(currentData, null, 2), 'utf-8');
    
    // Write last update time
    writeFileSync(resolve(publicDir, 'last-update.txt'), updateTime, 'utf-8');
    
    console.log('Manual update: Update completed successfully');
    
  } catch (error) {
    console.error('Manual update: Error updating IP addresses:', error.message);
    throw error;
  }
}

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

app.post('/api/trigger-update', async (req, res) => {
  try {
    console.log('Manual update triggered by user');
    
    // Trigger the update function
    await updateIPAddresses();
    
    // Return success response
    res.json({ 
      success: true,
      message: 'Update triggered successfully',
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error triggering manual update:', error);
    res.status(500).json({ 
      error: 'Failed to trigger update',
      message: error.message 
    });
  }
});
app.get('/api/changelog', (req, res) => {
  try {
    const ipData = JSON.parse(readFileSync(ipDataPath, 'utf-8'));
    res.json({ changelog: ipData.changelog || [] });
  } catch (error) {
    console.error('Error getting changelog:', error);
    res.status(500).json({ error: 'Failed to get changelog' });
  }
});

// Serve static files
app.use(express.static(publicDir));

// Handle React Router paths
app.get('*', (req, res) => {
  res.sendFile(resolve(publicDir, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});