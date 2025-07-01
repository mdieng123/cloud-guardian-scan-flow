import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store active connections
const connections = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  const connectionId = Date.now().toString();
  connections.set(connectionId, ws);
  
  ws.on('close', () => {
    connections.delete(connectionId);
  });
  
  // Send connection ID to client
  ws.send(JSON.stringify({ type: 'connection', connectionId }));
});

// Broadcast to all connected clients
function broadcast(message) {
  connections.forEach((ws) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  });
}

// Authentication check endpoint
app.post('/api/check-auth', async (req, res) => {
  try {
    broadcast({ type: 'auth_start' });
    
    let gcpAuthenticated = false;
    let azureAuthenticated = false;
    
    // Check gcloud auth with error handling
    try {
      const gcpCheck = spawn('gcloud', ['auth', 'list'], { stdio: 'pipe' });
      
      gcpCheck.stdout.on('data', (data) => {
        if (data.toString().includes('ACTIVE')) {
          gcpAuthenticated = true;
        }
      });
      
      gcpCheck.on('error', () => {
        // gcloud not installed or not accessible
        gcpAuthenticated = false;
      });
      
      await new Promise((resolve) => {
        gcpCheck.on('close', resolve);
        gcpCheck.on('error', resolve);
      });
    } catch (error) {
      console.log('GCP CLI not available:', error.message);
      gcpAuthenticated = false;
    }
    
    // Check azure auth with error handling
    try {
      const azureCheck = spawn('az', ['account', 'show'], { stdio: 'pipe' });
      
      azureCheck.on('close', (code) => {
        azureAuthenticated = code === 0;
      });
      
      azureCheck.on('error', () => {
        // az not installed or not accessible
        azureAuthenticated = false;
      });
      
      await new Promise((resolve) => {
        azureCheck.on('close', resolve);
        azureCheck.on('error', resolve);
      });
    } catch (error) {
      console.log('Azure CLI not available:', error.message);
      azureAuthenticated = false;
    }
    
    const authStatus = {
      gcp: gcpAuthenticated,
      azure: azureAuthenticated,
      isAuthenticated: gcpAuthenticated || azureAuthenticated
    };
    
    broadcast({ type: 'auth_complete', data: authStatus });
    res.json(authStatus);
  } catch (error) {
    broadcast({ type: 'auth_error', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Export resources endpoint
app.post('/api/export', async (req, res) => {
  const { provider, projectId, resourceGroup } = req.body;
  
  try {
    broadcast({ type: 'export_start', data: { provider }, provider });
    
    const scriptPath = path.join(__dirname, '..', 'cloudsec.sh');
    
    const bashScript = spawn('bash', [scriptPath], { 
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        CLOUD_PROVIDER: provider,
        PROJECT_ID: projectId || '',
        RESOURCE_GROUP: resourceGroup || '',
        HEADLESS_MODE: 'true',
        PATH: process.env.PATH,
        PROWLER_NO_BANNER: 'true',
        PROWLER_QUIET: 'true'
      }
    });
    
    console.log('Started bash script with env:', {
      CLOUD_PROVIDER: provider,
      PROJECT_ID: projectId || '',
      RESOURCE_GROUP: resourceGroup || '',
      HEADLESS_MODE: 'true'
    });
    
    // Send immediate feedback
    broadcast({ type: 'export_progress', data: `Initializing ${provider} export...\n` });
    
    let output = '';
    let exportSuccess = false;
    let exportDir = '';
    let exportFile = '';
    
    bashScript.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      console.log('Script output:', text); // Debug logging
      
      // Parse for the structured output we added
      if (text.includes('EXPORT_RESULT:')) {
        const match = text.match(/EXPORT_RESULT:([^:]+):([^:]*):([^:]*)/);
        if (match) {
          const [, status, dir, file] = match;
          exportSuccess = status === 'SUCCESS';
          exportDir = dir;
          exportFile = file;
        }
      }
      
      // Also parse legacy output patterns for compatibility
      if (text.includes('✓ Export completed successfully')) {
        exportSuccess = true;
      }
      
      if (text.includes('Exported to:')) {
        const match = text.match(/Exported to: (.+)/);
        if (match) {
          exportDir = match[1].trim();
        }
      }
      
      broadcast({ type: 'export_progress', data: text });
    });
    
    bashScript.stderr.on('data', (data) => {
      const errorText = data.toString();
      output += errorText;
      broadcast({ type: 'export_error', data: errorText });
    });
    
    bashScript.on('close', (code) => {
      const result = {
        success: exportSuccess && code === 0,
        output,
        exportDir,
        exportFile,
        provider,
        exitCode: code
      };
      
      broadcast({ type: 'export_complete', data: result });
      res.json(result);
    });
    
    bashScript.on('error', (error) => {
      const errorResult = {
        success: false,
        output: `Script execution error: ${error.message}`,
        exportDir: '',
        exportFile: '',
        provider,
        exitCode: -1
      };
      
      broadcast({ type: 'export_error', data: error.message });
      res.status(500).json(errorResult);
    });
    
  } catch (error) {
    broadcast({ type: 'export_error', data: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Security scan endpoint
app.post('/api/scan', async (req, res) => {
  const { exportDir, provider, projectId } = req.body;
  
  try {
    broadcast({ type: 'scan_start' });
    
    // Create a wrapper script to handle the security scanning
    const scriptPath = path.join(__dirname, '..', 'cloudsec.sh');
    const bashScript = spawn('bash', ['-c', `
      export CLOUD_PROVIDER="${provider}"
      export PROJECT_ID="${projectId || ''}"
      export LAST_EXPORT_DIR="${exportDir}"
      export LAST_EXPORT_FILE="${provider === 'GCP' ? 'gcp_resources.txt' : 'azure_resources.txt'}"
      export HEADLESS_MODE="true"
      
      # Source the original script functions
      source "${scriptPath}"
      
      echo "Starting security assessment..."
      
      # Execute security scans step by step  
      echo "--- Phase: Prowler Security Scan ---"
      if launch_prowler_scan "\${PROJECT_ID}"; then
        echo "✓ Prowler scan completed"
        echo "PROWLER_COMPLETE"
        echo "VERTEX_PROJECT_PROMPT"
        exit 0
      else
        echo "✗ Prowler scan failed"
        exit 1
      fi
    `], { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let scanSuccess = false;
    let currentPhase = 'gemini';
    
    bashScript.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Parse for different scan phases
      if (text.includes('--- Phase: Gemini AI Analysis ---')) {
        currentPhase = 'gemini';
        broadcast({ type: 'scan_phase', data: { phase: 'gemini' } });
      } else if (text.includes('Prowler Security Scan')) {
        currentPhase = 'prowler';
        broadcast({ type: 'scan_phase', data: { phase: 'prowler' } });
      } else if (text.includes('Consolidation Analysis')) {
        currentPhase = 'consolidation';
        broadcast({ type: 'scan_phase', data: { phase: 'consolidation' } });
      }
      
      // Check for success marker
      if (text.includes('SCAN_RESULT:SUCCESS')) {
        scanSuccess = true;
      }
      
      // Check if we need to prompt for Vertex AI project ID
      if (text.includes('VERTEX_PROJECT_PROMPT')) {
        broadcast({ 
          type: 'vertex_project_prompt', 
          data: { message: 'Please enter GCP Project ID for Vertex AI capabilities' }
        });
        // Don't return here - continue processing other output
      }
      
      broadcast({ type: 'scan_progress', data: text });
    });
    
    bashScript.stderr.on('data', (data) => {
      const errorText = data.toString();
      output += errorText;
      console.log('Script stderr:', errorText); // Debug logging
      broadcast({ type: 'scan_error', data: errorText });
    });
    
    bashScript.on('close', (code) => {
      console.log('Script completed with exit code:', code); // Debug logging
      const result = {
        success: scanSuccess && code === 0,
        output,
        scanResults: {
          // We'll parse actual results from the output files later
          outputFiles: {
            geminiAnalysis: scanSuccess ? 'security_analysis_*.txt' : null,
            prowlerResults: scanSuccess ? 'prowler_scan_*_cleaned.json' : null,
            consolidatedReport: scanSuccess ? 'consolidated_security_report_*.md' : null
          }
        },
        exitCode: code
      };
      
      broadcast({ type: 'scan_complete', data: result });
      res.json(result);
    });
    
    bashScript.on('error', (error) => {
      const errorResult = {
        success: false,
        output: `Scan execution error: ${error.message}`,
        scanResults: {},
        exitCode: -1
      };
      
      broadcast({ type: 'scan_error', data: error.message });
      res.status(500).json(errorResult);
    });
    
  } catch (error) {
    broadcast({ type: 'scan_error', data: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Continue scan with Vertex AI project ID
app.post('/api/continue-scan', async (req, res) => {
  const { exportDir, provider, projectId, vertexProjectId } = req.body;
  
  try {
    broadcast({ type: 'scan_phase', data: { phase: 'gemini' } });
    
    // Continue with Gemini analysis
    const scriptPath = path.join(__dirname, '..', 'cloudsec.sh');
    const bashScript = spawn('bash', ['-c', `
      export CLOUD_PROVIDER="${provider}"
      export PROJECT_ID="${projectId || ''}"
      export VERTEX_PROJECT_ID="${vertexProjectId}"
      export LAST_EXPORT_DIR="${exportDir}"
      export LAST_EXPORT_FILE="${provider === 'GCP' ? 'gcp_resources.txt' : 'azure_resources.txt'}"
      export HEADLESS_MODE="true"
      export SKIP_PROWLER="true"
      
      # Source the original script functions
      source "${scriptPath}"
      
      echo "--- Phase: Gemini AI Analysis ---"
      if launch_gemini_security_scanner; then
        echo "✓ Gemini analysis completed"
      else
        echo "✗ Gemini analysis failed"
        exit 1
      fi
      
      echo "SCAN_RESULT:SUCCESS"
    `], { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let scanSuccess = false;
    
    bashScript.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      if (text.includes('SCAN_RESULT:SUCCESS')) {
        scanSuccess = true;
      }
      
      broadcast({ type: 'scan_progress', data: text });
    });
    
    bashScript.stderr.on('data', (data) => {
      const errorText = data.toString();
      output += errorText;
      broadcast({ type: 'scan_error', data: errorText });
    });
    
    bashScript.on('close', (code) => {
      const result = {
        success: scanSuccess && code === 0,
        output,
        scanResults: {
          outputFiles: {
            geminiAnalysis: scanSuccess ? 'security_analysis_*.txt' : null,
            prowlerResults: scanSuccess ? 'prowler_scan_*_cleaned.json' : null,
            consolidatedReport: scanSuccess ? 'consolidated_security_report_*.md' : null
          }
        },
        exitCode: code
      };
      
      broadcast({ type: 'scan_complete', data: result });
      res.json(result);
    });
    
    bashScript.on('error', (error) => {
      const errorResult = {
        success: false,
        output: `Gemini scan execution error: ${error.message}`,
        scanResults: {},
        exitCode: -1
      };
      
      broadcast({ type: 'scan_error', data: error.message });
      res.status(500).json(errorResult);
    });
    
  } catch (error) {
    broadcast({ type: 'scan_error', data: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Cloud Security Assessment Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
}); 