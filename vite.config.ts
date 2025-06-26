import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { existsSync } from 'fs';

// Custom plugin to handle file updates and serve static IP list
const ipAddressFilePlugin = () => {
  return {
    name: 'ip-address-file-plugin',
    configureServer(server) {
      // Store connected SSE clients
      const clients = new Set();
      
      // Function to notify all connected clients
      const notifyClients = (message) => {
        clients.forEach(client => {
          client.write(`data: ${JSON.stringify(message)}\n\n`);
        });
      };
      
      // Ensure data directory exists
      const dataDir = path.join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      // Ensure ipData.json exists
      const ipDataPath = path.join(dataDir, 'ipData.json');
      if (!existsSync(ipDataPath)) {
        writeFileSync(ipDataPath, JSON.stringify({
          lastUpdated: null,
          ipAddresses: [],
          updateInterval: 60,
          autoUpdateEnabled: true,
          changelog: []
        }, null, 2));
      }

      // Create /api/update-ip-file endpoint to update the static file
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/update-ip-file' && req.method === 'POST') {
          try {
            // Parse multi-part form data or JSON
            let formData = '';
            req.on('data', (chunk) => {
              formData += chunk.toString();
            });
            
            req.on('end', async () => {
              try {
                let ips = [];
                
                // Try to parse the ips from the form data
                try {
                  if (formData.includes('ipAddresses=')) {
                    // This is URL encoded form data
                    const ipAddressesParam = formData.split('&').find(param => param.startsWith('ipAddresses='));
                    if (ipAddressesParam) {
                      const ipAddressesJson = decodeURIComponent(ipAddressesParam.replace('ipAddresses=', ''));
                      ips = JSON.parse(ipAddressesJson);
                    }
                  } else if (formData.includes('"ipAddresses":')) {
                    // This is JSON data
                    const data = JSON.parse(formData);
                    ips = data.ipAddresses;
                  }
                } catch (parseError) {
                  console.error('Error parsing form data:', parseError);
                }
                
                if (ips && ips.length > 0) {
                  const content = ips.join('\n');
                  
                  // Ensure public directory exists
                  const publicDir = path.join(process.cwd(), 'public');
                  try {
                    await fs.mkdir(publicDir, { recursive: true });
                  } catch (err) {
                    // Directory might already exist, which is fine
                  }
                  
                  // Write to public/ipv4.txt file (renamed with .txt extension)
                  await fs.writeFile(
                    path.join(process.cwd(), 'public', 'ipv4.txt'), 
                    content, 
                    'utf-8'
                  );
                  
                  // Update ipData.json
                  await fs.writeFile(
                    path.join(process.cwd(), 'data', 'ipData.json'),
                    JSON.stringify(
                      {
                        ...JSON.parse(await fs.readFile(ipDataPath, 'utf-8')),
                        lastUpdated: new Date().toISOString(),
                        ipAddresses: ips
                      }, 
                      null, 
                      2
                    ),
                    'utf-8'
                  );
                  
                  res.statusCode = 200;
                  res.end(JSON.stringify({ 
                    success: true,
                    lastUpdated: new Date().toISOString()
                  }));
                  
                  // Notify all connected clients about the update
                  const message = JSON.stringify({ 
                    type: 'update',
                    lastUpdated: new Date().toISOString()
                  });
                  
                  clients.forEach(client => {
                    client.write(`data: ${message}\n\n`);
                  });
                  
                } else {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'No IP addresses provided' }));
                }
              } catch (error) {
                console.error('Error updating IP file:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: 'Failed to update IP file' }));
              }
            });
          } catch (error) {
            console.error('Error processing update request:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: 'Server error' }));
          }
          return;
        }
        
        // Handle /api/last-updated endpoint
        if (req.url === '/api/last-updated' && req.method === 'GET') {
          try {
            const ipDataPath = path.join(process.cwd(), 'data', 'ipData.json');
            const data = JSON.parse(await fs.readFile(ipDataPath, 'utf-8'));
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ lastUpdated: data.lastUpdated }));
            return;
          } catch (error) {
            console.error('Error reading last updated time:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to get last update time' }));
            return;
          }
        }
        
        // Handle /ipv4 requests directly to serve the static file
        if (req.url === '/ipv4' && req.method === 'GET') {
          try {
            const ipDataPath = path.join(process.cwd(), 'data', 'ipData.json');
            const data = JSON.parse(await fs.readFile(ipDataPath, 'utf-8'));
            
            const content = data.ipAddresses.join('\n');
            
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Content-Disposition', 'inline; filename="ipv4.txt"');
            res.statusCode = 200;
            res.end(content);
            return;
          } catch (error) {
            console.error('Error serving /ipv4.txt file:', error);
            // Still serve as text/plain but with error message
            res.setHeader('Content-Type', 'text/plain');
            res.statusCode = 500;
            res.end('Error retrieving IP addresses. Please try again later.');
            return;
          }
        }
        
        // Handle /api/changelog endpoint
        if (req.url === '/api/changelog' && req.method === 'GET') {
          try {
            const ipDataPath = path.join(process.cwd(), 'data', 'ipData.json');
            const data = JSON.parse(await fs.readFile(ipDataPath, 'utf-8'));
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ changelog: data.changelog || [] }));
            return;
          } catch (error) {
            console.error('Error reading changelog:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to get changelog' }));
            return;
          }
        }
        
        // Handle /api/update-changelog endpoint
        if (req.url === '/api/update-changelog' && req.method === 'POST') {
          try {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', async () => {
              try {
                const { entry } = JSON.parse(body);
                if (!entry) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid changelog entry' }));
                  return;
                }
                
                // Read current data
                const ipDataPath = path.join(process.cwd(), 'data', 'ipData.json');
                const data = JSON.parse(await fs.readFile(ipDataPath, 'utf-8'));
                
                // Add new entry to the start of changelog
                const newChangelog = [entry, ...(data.changelog || [])];
                
                // Keep only the 10 most recent entries
                data.changelog = newChangelog.slice(0, 10);
                
                // Write back to file
                await fs.writeFile(ipDataPath, JSON.stringify(data, null, 2));
                
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
              } catch (error) {
                console.error('Error updating changelog:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to update changelog' }));
              }
            });
          } catch (error) {
            console.error('Error processing changelog update:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Server error' }));
          }
          return;
        }
        
        // Handle SSE connections
        if (req.url === '/api/updates' && req.method === 'GET') {
          const headers = {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
          };
          
          res.writeHead(200, headers);
          
          // Send initial connection message
          const data = JSON.stringify({ type: 'connected' });
          res.write(`data: ${data}\n\n`);
          
          // Add client to the set
          console.log('New SSE client connected');
          clients.add(res);
          
          // Remove client on connection close
          req.on('close', () => {
            console.log('SSE client disconnected');
            clients.delete(res);
          });
          
          return;
        }
        
        next();
      });
      
      // Handle /api/update-interval endpoint
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/update-interval' && req.method === 'POST') {
          try {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                const { interval, autoUpdateEnabled } = data;
                
                // Read current data
                const ipDataPath = path.join(process.cwd(), 'data', 'ipData.json');
                const currentData = JSON.parse(await fs.readFile(ipDataPath, 'utf-8'));
                
                // Update settings
                if (typeof interval === 'number' && interval >= 1) {
                  currentData.updateInterval = interval;
                }
                
                if (typeof autoUpdateEnabled === 'boolean') {
                  currentData.autoUpdateEnabled = autoUpdateEnabled;
                }
                
                // Notify all clients about the interval change
                notifyClients({
                  type: 'settingsChange',
                  updateInterval: currentData.updateInterval,
                  autoUpdateEnabled: currentData.autoUpdateEnabled
                });
                
                // Write back to file
                await fs.writeFile(ipDataPath, JSON.stringify(currentData, null, 2));
                
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
              } catch (error) {
                console.error('Error updating interval:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to update interval' }));
              }
            });
          } catch (error) {
            console.error('Error processing interval update:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Server error' }));
          }
          return;
        }
        
        // Handle /api/settings endpoint
        if (req.url === '/api/settings' && req.method === 'GET') {
          try {
            const ipDataPath = path.join(process.cwd(), 'data', 'ipData.json');
            const data = JSON.parse(await fs.readFile(ipDataPath, 'utf-8'));
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              updateInterval: data.updateInterval,
              autoUpdateEnabled: data.autoUpdateEnabled
            }));
            return;
          } catch (error) {
            console.error('Error reading settings:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to get settings' }));
            return;
          }
        }
        
        next();
      });
    },
    
    // Ensure build generates directly to public folder
    config(config) {
      return {
        ...config,
        build: {
          ...config.build,
          outDir: 'public'
        }
      };
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ipAddressFilePlugin()
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'public',
    emptyOutDir: false // Prevent deleting existing files in public dir (like ipv4.txt)
  },
  server: {
    watch: {
      // Add watcher for key directories to ensure updates trigger reloads
      ignored: ['!**/public/ipv4.txt']
    }
  }
});