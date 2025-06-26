import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories and file paths
const publicDir = resolve(__dirname, 'public');
const dataDir = resolve(__dirname, 'data');

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const ipFilePath = resolve(publicDir, 'ipv4.txt');
const dataFilePath = resolve(dataDir, 'starlink-data.json');

// Initialize data file if it doesn't exist
const initializeDataFile = () => {
  if (!existsSync(dataFilePath)) {
    const initialData = {
      ipAddresses: [],
      lastUpdated: null,
      changelog: []
    };
    writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2));
  }
};

// Read data from file
const readData = () => {
  try {
    initializeDataFile();
    const data = readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { ipAddresses: [], lastUpdated: null, changelog: [] };
  }
};

// Write data to file
const writeData = (data) => {
  try {
    writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
};

// CORS proxies for fetching data
const corsProxies = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-proxy.htmldriven.com/?url='
];

// Fetch Starlink data
const fetchStarlinkData = async () => {
  const STARLINK_URL = 'https://geoip.starlinkisp.net/feed.csv';
  
  console.log('Fetching Starlink data...');
  
  // Try direct fetch first
  try {
    const response = await fetch(STARLINK_URL, {
      headers: {
        'Accept': 'text/csv,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; StarlinkIPExtractor/1.0)'
      }
    });
    
    if (response.ok) {
      const csvText = await response.text();
      console.log('Direct fetch successful');
      return csvText;
    }
  } catch (error) {
    console.log('Direct fetch failed:', error.message);
  }
  
  // Try CORS proxies
  for (const proxy of corsProxies) {
    try {
      let proxyUrl;
      
      if (proxy === 'https://cors-proxy.htmldriven.com/?url=') {
        proxyUrl = `${proxy}${encodeURIComponent(STARLINK_URL)}&key=&mime=text/plain`;
      } else {
        proxyUrl = `${proxy}${encodeURIComponent(STARLINK_URL)}`;
      }
      
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/csv,text/plain,*/*',
          'User-Agent': 'Mozilla/5.0 (compatible; StarlinkIPExtractor/1.0)'
        }
      });
      
      if (response.ok) {
        let csvText;
        
        if (proxy === 'https://cors-proxy.htmldriven.com/?url=') {
          const jsonData = await response.json();
          csvText = jsonData.contents;
        } else {
          csvText = await response.text();
        }
        
        if (csvText && csvText.length > 0) {
          console.log(`Proxy fetch successful using: ${proxy}`);
          return csvText;
        }
      }
    } catch (error) {
      console.log(`Proxy ${proxy} failed:`, error.message);
    }
  }
  
  throw new Error('All fetch methods failed');
};

// Process CSV data to extract IPv4 addresses
const processCSVData = (csvText) => {
  const lines = csvText.split('\n');
  const ipAddresses = new Set(); // Use Set to avoid duplicates
  
  for (const line of lines) {
    if (line.trim()) {
      // Match IPv4 CIDR notation
      const matches = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})/g);
      if (matches) {
        matches.forEach(ip => ipAddresses.add(ip));
      }
    }
  }
  
  return Array.from(ipAddresses).sort();
};

// Update IP addresses and create changelog entry
const updateIPAddresses = async () => {
  try {
    // Fetch and process data
    const csvText = await fetchStarlinkData();
    const newIpAddresses = processCSVData(csvText);
    
    if (newIpAddresses.length === 0) {
      throw new Error('No IPv4 addresses found in data');
    }
    
    // Read current data
    const currentData = readData();
    const oldIpAddresses = currentData.ipAddresses || [];
    
    // Create changelog entry if there are changes
    const oldSet = new Set(oldIpAddresses);
    const newSet = new Set(newIpAddresses);
    
    const added = newIpAddresses.filter(ip => !oldSet.has(ip));
    const removed = oldIpAddresses.filter(ip => !newSet.has(ip));
    
    const updateTime = new Date().toISOString();
    
    // Update data
    const updatedData = {
      ipAddresses: newIpAddresses,
      lastUpdated: updateTime,
      changelog: currentData.changelog || []
    };
    
    // Add changelog entry if there are changes
    if (added.length > 0 || removed.length > 0) {
      const changelogEntry = {
        date: updateTime,
        ipAddresses: newIpAddresses,
        added,
        removed
      };
      
      updatedData.changelog = [changelogEntry, ...updatedData.changelog].slice(0, 10); // Keep last 10 entries
    }
    
    // Save data
    if (!writeData(updatedData)) {
      throw new Error('Failed to save data');
    }
    
    // Write IP addresses to text file
    writeFileSync(ipFilePath, newIpAddresses.join('\n'));
    
    console.log(`Successfully updated ${newIpAddresses.length} IP addresses`);
    
    return {
      success: true,
      count: newIpAddresses.length,
      added: added.length,
      removed: removed.length
    };
    
  } catch (error) {
    console.error('Error updating IP addresses:', error);
    throw error;
  }
};

// Middleware
app.use(express.json());

// API Routes
app.get('/api/data', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/fetch-data', async (req, res) => {
  try {
    const result = await updateIPAddresses();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Serve static files
app.use(express.static(publicDir));

// Handle React Router
app.get('*', (req, res) => {
  const indexPath = resolve(publicDir, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

// Initialize
initializeDataFile();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Starlink IP Extractor ready');
});