import fs from 'fs';
import path from 'path';

// Function to fetch IP addresses from Starlink API
async function fetchStarlinkAddresses() {
  const STARLINK_CSV_URL = 'https://geoip.starlinkisp.net/feed.csv';
  const corsProxies = [
    'https://corsproxy.io/?',
    'https://proxy.cors.sh/',
    'https://api.allorigins.win/raw?url='
  ];
  
  // Try direct fetch first
  try {
    const response = await fetch(STARLINK_CSV_URL, {
      headers: {
        'Accept': 'text/plain,text/csv,*/*'
      }
    });
    
    if (response.ok) {
      return await response.text();
    }
  } catch (directError) {
    console.log('Direct fetch failed, trying proxies...');
  }
  
  // Try proxies
  for (let i = 0; i < corsProxies.length; i++) {
    const proxy = corsProxies[i];
    try {
      let proxyUrl;
      if (proxy === 'https://corsproxy.io/?') {
        proxyUrl = `${proxy}${STARLINK_CSV_URL}`;
      } else {
        proxyUrl = `${proxy}${encodeURIComponent(STARLINK_CSV_URL)}`;
      }
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        continue;
      }
      
      return await response.text();
    } catch (error) {
      console.log(`Proxy ${i + 1} failed:`, error);
      continue;
    }
  }
  
  throw new Error('All fetch attempts failed');
}

// Function to process CSV data
function processCSVData(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('Received invalid or empty CSV data');
  }
  
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
    throw new Error('No IPv4 CIDR addresses found in the CSV file.');
  }
  
  return ipv4List;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ipAddresses, forceUpdate } = req.body;
    
    // If forceUpdate flag is set or ipAddresses is empty, fetch from Starlink API
    if (forceUpdate || !ipAddresses || !Array.isArray(ipAddresses) || ipAddresses.length === 0) {
      // Fetch fresh data from Starlink
      const csvData = await fetchStarlinkAddresses();
      const freshIpAddresses = processCSVData(csvData);
      
      // Ensure the directory exists
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      // Write the IP addresses to the file
      const ipFilePath = path.join(publicDir, 'ipv4.txt');
      fs.writeFileSync(ipFilePath, freshIpAddresses.join('\n'), 'utf-8');
      
      // Write the last update time
      const updateTime = new Date().toISOString();
      fs.writeFileSync(path.join(publicDir, 'last-update.txt'), updateTime, 'utf-8');
      
      // Update ipData.json
      try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const ipDataPath = path.join(dataDir, 'ipData.json');
        let ipData;
        
        try {
          ipData = JSON.parse(fs.readFileSync(ipDataPath, 'utf-8'));
        } catch (readError) {
          // If file doesn't exist or is invalid, create new data object
          ipData = {
            lastUpdated: updateTime,
            ipAddresses: [],
            updateInterval: 60,
            autoUpdateEnabled: true,
            changelog: []
          };
        }
        
        // Create changelog entry if needed
        if (ipData.ipAddresses && ipData.ipAddresses.length > 0) {
          const oldIpSet = new Set(ipData.ipAddresses);
          const newIpSet = new Set(freshIpAddresses);
          
          // Find added and removed IPs
          const added = freshIpAddresses.filter(ip => !oldIpSet.has(ip));
          const removed = ipData.ipAddresses.filter(ip => !newIpSet.has(ip));
          
          // Only add to changelog if there were changes
          if (added.length > 0 || removed.length > 0) {
            const entry = {
              date: updateTime,
              ipAddresses: freshIpAddresses,
              added,
              removed
            };
            
            // Add to changelog
            ipData.changelog = [entry, ...(ipData.changelog || [])];
          }
        }
        
        // Update the IP addresses and last updated time
        ipData.ipAddresses = freshIpAddresses;
        ipData.lastUpdated = updateTime;
        
        // Write back to file
        fs.writeFileSync(ipDataPath, JSON.stringify(ipData, null, 2), 'utf-8');
      } catch (dataError) {
        console.error('Error updating ipData.json:', dataError);
      }
      
      return res.status(200).json({ 
        success: true,
        lastUpdated: updateTime,
        count: freshIpAddresses.length 
      });
      
    } else if (Array.isArray(ipAddresses)) {
      // Use the provided IP addresses
      // Ensure the directory exists
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // Write the IP addresses to the file
      const ipFilePath = path.join(publicDir, 'ipv4.txt');
      fs.writeFileSync(ipFilePath, ipAddresses.join('\n'), 'utf-8');

      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: 'Invalid IP address data' });
    }
  } catch (error) {
    console.error('Error updating IP file:', error);
    return res.status(500).json({ error: 'Failed to update IP file' });
  }
}