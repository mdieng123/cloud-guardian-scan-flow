import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
  let { exportDir, provider, projectId } = req.body;
  
  console.log('DEBUG: Scan request received:', { exportDir, provider, projectId });
  
  // If projectId is missing for GCP, try to get it from gcloud config or export metadata
  if (provider === 'GCP' && !projectId) {
    try {
      // First try to read from export metadata
      const metadataPath = path.join(exportDir, 'export_metadata.txt');
      if (fs.existsSync(metadataPath)) {
        const metadata = fs.readFileSync(metadataPath, 'utf-8');
        const match = metadata.match(/Project ID:\s*([a-zA-Z0-9-]+)/);
        if (match) {
          projectId = match[1];
          console.log('DEBUG: Extracted project ID from metadata:', projectId);
        }
      }
      
      // If still no project ID, try gcloud config
      if (!projectId) {
        const result = spawn('gcloud', ['config', 'get-value', 'project'], { stdio: 'pipe' });
        const output = await new Promise((resolve) => {
          let data = '';
          result.stdout.on('data', (chunk) => data += chunk);
          result.on('close', () => resolve(data.trim()));
        });
        if (output && output !== '(unset)') {
          projectId = output;
          console.log('DEBUG: Got project ID from gcloud config:', projectId);
        }
      }
    } catch (error) {
      console.log('DEBUG: Could not auto-detect project ID:', error.message);
    }
  }
  
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
      
      echo "Starting security assessment..."
      echo "--- Phase: Prowler Security Scan ---"
      
      # Check if we already have prowler results
      EXISTING_PROWLER=\$(ls -t output/prowler_scan_*_cleaned.json 2>/dev/null | head -1)
      if [[ -n "\$EXISTING_PROWLER" ]]; then
        echo "Found existing Prowler scan results: \$EXISTING_PROWLER"
        echo "✓ Using existing Prowler scan"
        echo "PROWLER_COMPLETE"
        echo "VERTEX_PROJECT_PROMPT"
        exit 0
      else
        echo "No existing prowler results found, starting fresh scan"
        
        # Source the original script functions only if needed
        source "${scriptPath}"
        
        echo "Launching prowler scan with wrapper script approach..."
        
        # Create a temporary wrapper script for timeout
        cat > temp_prowler_wrapper.sh << WRAPPER_EOF
#!/bin/bash
export CLOUD_PROVIDER="${provider}"
export PROJECT_ID="${projectId || ''}"
export LAST_EXPORT_DIR="${exportDir}"
export LAST_EXPORT_FILE="${provider === 'GCP' ? 'gcp_resources.txt' : 'azure_resources.txt'}"
export HEADLESS_MODE="true"
echo "DEBUG: Wrapper script received project ID: '\$1'"
echo "DEBUG: Environment PROJECT_ID: '\$PROJECT_ID'"
source "${scriptPath}"
launch_prowler_scan_only "\$PROJECT_ID"
WRAPPER_EOF
        chmod +x temp_prowler_wrapper.sh
        
        # Try to run prowler scan with timeout using wrapper
        if timeout 600 ./temp_prowler_wrapper.sh "${projectId || ''}"; then
          rm -f temp_prowler_wrapper.sh
          echo "✓ Prowler scan completed successfully"
          echo "PROWLER_COMPLETE"
          echo "VERTEX_PROJECT_PROMPT"
          exit 0
        else
          rm -f temp_prowler_wrapper.sh
          echo "✗ Prowler scan failed with exit code: \$?"
          exit 1
        fi
      fi
    `], { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let scanSuccess = false;
    let waitingForVertexId = false;
    
    bashScript.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Parse for different scan phases
      if (text.includes('--- Phase: Gemini AI Analysis ---')) {
        broadcast({ type: 'scan_phase', data: { phase: 'gemini' } });
      } else if (text.includes('Prowler Security Scan')) {
        broadcast({ type: 'scan_phase', data: { phase: 'prowler' } });
      } else if (text.includes('Consolidation Analysis')) {
        broadcast({ type: 'scan_phase', data: { phase: 'consolidation' } });
      }
      
      // Check for success marker
      if (text.includes('PROWLER_COMPLETE')) {
        scanSuccess = true;
      }
      
      // Check if we need to prompt for Vertex AI project ID
      if (text.includes('VERTEX_PROJECT_PROMPT')) {
        waitingForVertexId = true;
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
      
      // If we're waiting for Vertex ID, don't complete the scan
      if (waitingForVertexId) {
        console.log('Prowler phase complete, waiting for Vertex AI project ID...');
        // Don't send scan_complete - let the frontend handle the vertex_project_prompt
        return;
      }
      
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
  const { exportDir, provider, projectId, vertexProjectId, geminiApiKey } = req.body;
  
  try {
    broadcast({ type: 'scan_phase', data: { phase: 'gemini' } });
    
    // Continue with Gemini analysis
    const scriptPath = path.join(__dirname, '..', 'cloudsec.sh');
    const fullExportDir = exportDir.startsWith('/') ? exportDir : path.join(__dirname, '..', exportDir);
    const bashScript = spawn('bash', ['-c', `
      export CLOUD_PROVIDER="${provider}"
      export PROJECT_ID="${projectId || ''}"
      export VERTEX_PROJECT_ID="${vertexProjectId}"
      export GOOGLE_API_KEY="${geminiApiKey}"
      export LAST_EXPORT_DIR="${fullExportDir}"
      export LAST_EXPORT_FILE="${provider === 'GCP' ? 'gcp_resources.txt' : 'azure_resources.txt'}"
      export HEADLESS_MODE="true"
      export SKIP_PROWLER="true"
      
      echo "DEBUG SERVER: LAST_EXPORT_DIR before sourcing: '${fullExportDir}'"
      echo "DEBUG SERVER: About to source script: ${scriptPath}"
      
      # Source the original script functions
      source "${scriptPath}"
      
      echo "--- Phase: Gemini AI Analysis ---"
      if LAST_EXPORT_DIR="${fullExportDir}" launch_gemini_security_scanner; then
        echo "✓ Gemini analysis completed"
        
        echo "--- Phase: Consolidation Analysis ---"
        # Find the latest prowler cleaned file
        PROWLER_CLEANED_FILE=\$(ls -t output/prowler_scan_*_cleaned.json 2>/dev/null | head -1)
        
        # Copy Prowler file to root directory for consolidation access
        if [[ -n "\$PROWLER_CLEANED_FILE" ]]; then
          PROWLER_FILENAME=\$(basename "\$PROWLER_CLEANED_FILE")
          cp "\$PROWLER_CLEANED_FILE" "./\$PROWLER_FILENAME"
          PROWLER_CLEANED_FILE="./\$PROWLER_FILENAME"
          echo "Copied Prowler file to root directory: \$PROWLER_CLEANED_FILE"
        fi
        
        # Find the latest gemini analysis file (in case GEMINI_ANALYSIS_FILE wasn't exported)
        if [[ -z "\$GEMINI_ANALYSIS_FILE" ]]; then
          GEMINI_ANALYSIS_FILE=\$(ls -t security_analysis_*.txt 2>/dev/null | head -1)
        fi
        
        # Try consolidation if both files exist
        if [[ -n "\$GEMINI_ANALYSIS_FILE" ]] && [[ -n "\$PROWLER_CLEANED_FILE" ]]; then
          echo "Starting consolidation analysis..."
          echo "Using Gemini file: \$GEMINI_ANALYSIS_FILE"
          echo "Using Prowler file: \$PROWLER_CLEANED_FILE"
          if launch_consolidation_analysis; then
            echo "✓ Consolidation completed"
          else
            echo "⚠ Consolidation failed, but continuing"
          fi
        else
          echo "⚠ Skipping consolidation - missing file paths"
          echo "Gemini file: \${GEMINI_ANALYSIS_FILE:-'Not found'}"
          echo "Prowler file: \${PROWLER_CLEANED_FILE:-'Not found'}"
        fi
        
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
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Cloud Security Assessment Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
}); 