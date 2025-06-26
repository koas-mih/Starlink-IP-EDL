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

// Ensure directories exist
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const ipFilePath = resolve(publicDir, 'ipv4.txt');
const dataFilePath = resolve(dataDir, 'starlink-data.json');

// Initialize data file with proper error handling
const initializeDataFile = () => {
  try {
    if (!existsSync(dataFilePath)) {
      const initialData = {
        ipAddresses: [],
        lastUpdated: null,
        changelog: []
      };
      writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2));
      console.log('Initialized data file');
    }
  } catch (error) {
    console.error('Error initializing data file:', error);
  }
};

// Read data from file with proper error handling
const readData = () => {
  try {
    if (!existsSync(dataFilePath)) {
      initializeDataFile();
    }
    const data = readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { ipAddresses: [], lastUpdated: null, changelog: [] };
  }
};

// Write data to file with proper error handling
const writeData = (data) => {
  try {
    writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
};

// Simplified fetch function with better error handling
const fetchStarlinkData = async () => {
  const STARLINK_URL = 'https://geoip.starlinkisp.net/feed.csv';
  
  console.log('Attempting to fetch Starlink data...');
  
  try {
    const response = await fetch(STARLINK_URL, {
      headers: {
        'Accept': 'text/csv,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; StarlinkIPExtractor/1.0)'
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.ok) {
      const csvText = await response.text();
      console.log('Successfully fetched Starlink data');
      return csvText;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to fetch Starlink data:', error.message);
    throw new Error(`Failed to fetch Starlink data: ${error.message}`);
  }
};

// Process CSV data to extract IPv4 addresses
const processCSVData = (csvText) => {
  const lines = csvText.split('\n');
  const ipAddresses = new Set();
  
  for (const line of lines) {
    if (line.trim()) {
      const matches = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})/g);
      if (matches) {
        matches.forEach(ip => ipAddresses.add(ip));
      }
    }
  }
  
  return Array.from(ipAddresses).sort();
};

// Update IP addresses
const updateIPAddresses = async () => {
  try {
    const csvText = await fetchStarlinkData();
    const newIpAddresses = processCSVData(csvText);
    
    if (newIpAddresses.length === 0) {
      throw new Error('No IPv4 addresses found in data');
    }
    
    const currentData = readData();
    const oldIpAddresses = currentData.ipAddresses || [];
    
    const oldSet = new Set(oldIpAddresses);
    const newSet = new Set(newIpAddresses);
    
    const added = newIpAddresses.filter(ip => !oldSet.has(ip));
    const removed = oldIpAddresses.filter(ip => !newSet.has(ip));
    
    const updateTime = new Date().toISOString();
    
    const updatedData = {
      ipAddresses: newIpAddresses,
      lastUpdated: updateTime,
      changelog: currentData.changelog || []
    };
    
    if (added.length > 0 || removed.length > 0) {
      const changelogEntry = {
        date: updateTime,
        ipAddresses: newIpAddresses,
        added,
        removed
      };
      
      updatedData.changelog = [changelogEntry, ...updatedData.changelog].slice(0, 10);
    }
    
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

// Add CORS headers for API routes
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API Routes - MUST come before static file serving
app.get('/api/data', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (error) {
    console.error('API /data error:', error);
    res.status(500).json({ error: 'Failed to read data', details: error.message });
  }
});

app.post('/api/fetch-data', async (req, res) => {
  try {
    const result = await updateIPAddresses();
    res.json(result);
  } catch (error) {
    console.error('API /fetch-data error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from public directory
app.use(express.static(publicDir));

// Handle React Router - this MUST come last
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = resolve(publicDir, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built. Run npm run build first.');
  }
});

// Initialize data file on startup
initializeDataFile();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API endpoints available:');
  console.log(`  GET  http://localhost:${PORT}/api/data`);
  console.log(`  POST http://localhost:${PORT}/api/fetch-data`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  
  // Test data file access
  try {
    const testData = readData();
    console.log(`Data file ready with ${testData.ipAddresses?.length || 0} IP addresses`);
  } catch (error) {
    console.error('Warning: Data file issue:', error.message);
  }
});