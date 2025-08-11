import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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
    let awsAuthenticated = false;
    
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
    
    // Check AWS CLI and auth with better error handling
    try {
      // First check if AWS CLI is installed
      const awsVersionCheck = spawn('aws', ['--version'], { 
        stdio: 'pipe',
        env: {
          ...process.env,
          HOME: process.env.HOME,
        }
      });
      
      let awsCliInstalled = false;
      
      await new Promise((resolve) => {
        awsVersionCheck.on('close', (code) => {
          awsCliInstalled = code === 0;
          resolve();
        });
        awsVersionCheck.on('error', () => {
          awsCliInstalled = false;
          resolve();
        });
      });
      
      if (!awsCliInstalled) {
        console.log('AWS CLI not installed');
        awsAuthenticated = false;
      } else {
        // AWS CLI is installed, now check credentials
        const awsCheck = spawn('aws', ['sts', 'get-caller-identity'], { 
          stdio: 'pipe',
          timeout: 10000, // 10 second timeout
          env: {
            ...process.env,
            HOME: process.env.HOME,
            AWS_CONFIG_FILE: process.env.AWS_CONFIG_FILE || path.join(process.env.HOME || '/tmp', '.aws', 'config'),
            AWS_SHARED_CREDENTIALS_FILE: process.env.AWS_SHARED_CREDENTIALS_FILE || path.join(process.env.HOME || '/tmp', '.aws', 'credentials')
          }
        });
        
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            awsCheck.kill();
            awsAuthenticated = false;
            console.log('AWS authentication check timed out');
            resolve();
          }, 10000);
          
          awsCheck.on('close', (code) => {
            clearTimeout(timeout);
            awsAuthenticated = code === 0;
            if (code === 0) {
              console.log('AWS authentication successful');
            } else {
              console.log('AWS authentication failed with code:', code);
            }
            resolve();
          });
          
          awsCheck.on('error', (error) => {
            clearTimeout(timeout);
            console.log('AWS auth check error:', error.message);
            awsAuthenticated = false;
            resolve();
          });
        });
      }
    } catch (error) {
      console.log('AWS CLI check failed:', error.message);
      awsAuthenticated = false;
    }
    
    const authStatus = {
      gcp: gcpAuthenticated,
      azure: azureAuthenticated,
      aws: awsAuthenticated,
      isAuthenticated: gcpAuthenticated || azureAuthenticated || awsAuthenticated
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
  const { provider, projectId, resourceGroup, awsRegion, awsResources, vpcIds } = req.body;
  
  try {
    broadcast({ type: 'export_start', data: { provider }, provider });
    
    // Handle AWS export differently
    if (provider === 'AWS') {
      // Read AWS credentials from file if not in environment
      let awsCredentials = {};
      try {
        const credentialsPath = path.join(process.env.HOME || '/tmp', '.aws', 'credentials');
        if (fs.existsSync(credentialsPath)) {
          const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8');
          const lines = credentialsContent.split('\n');
          let currentProfile = null;
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              currentProfile = trimmed.slice(1, -1);
            } else if (currentProfile === 'default' || currentProfile === (process.env.AWS_PROFILE || 'default')) {
              if (trimmed.startsWith('aws_access_key_id')) {
                awsCredentials.AWS_ACCESS_KEY_ID = trimmed.split('=')[1].trim();
              } else if (trimmed.startsWith('aws_secret_access_key')) {
                awsCredentials.AWS_SECRET_ACCESS_KEY = trimmed.split('=')[1].trim();
              }
            }
          }
        }
      } catch (error) {
        console.log('Could not read AWS credentials file:', error.message);
      }
      
      // Use our custom AWS import script
      const awsScriptPath = path.join(__dirname, '..', 'aws_import.sh');
      
      // Build AWS import command arguments
      let awsArgs = ['--regions', awsRegion || 'us-east-1'];
      
      if (awsResources && awsResources.trim()) {
        awsArgs.push('--resources', awsResources);
      }
      
      if (vpcIds && vpcIds.trim()) {
        awsArgs.push('--vpc-ids', vpcIds);
      }
      
      awsArgs.push('--output-dir', './tftest');
      
      console.log('Starting AWS import with args:', awsArgs);
      console.log('AWS credentials loaded from file:', Object.keys(awsCredentials));
      
      const bashScript = spawn('bash', [awsScriptPath, ...awsArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          PATH: process.env.PATH,
          // Use credentials from file or environment
          AWS_ACCESS_KEY_ID: awsCredentials.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: awsCredentials.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
          AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
          AWS_DEFAULT_REGION: (awsRegion || process.env.AWS_DEFAULT_REGION || 'us-east-1').replace('us-east1', 'us-east-1'),
          AWS_REGION: (awsRegion || process.env.AWS_REGION || 'us-east-1').replace('us-east1', 'us-east-1'),
          AWS_PROFILE: process.env.AWS_PROFILE || 'default',
          // Pass through HOME directory for AWS config files
          HOME: process.env.HOME,
          AWS_CONFIG_FILE: process.env.AWS_CONFIG_FILE || path.join(process.env.HOME || '/tmp', '.aws', 'config'),
          AWS_SHARED_CREDENTIALS_FILE: process.env.AWS_SHARED_CREDENTIALS_FILE || path.join(process.env.HOME || '/tmp', '.aws', 'credentials'),
          // Additional environment variables for Prowler
          CLOUD_PROVIDER: 'AWS'
        }
      });
      
      let output = '';
      let exportSuccess = false;
      let exportDir = './tftest';
      let exportFile = 'generated/aws_consolidated.txt';
      
      bashScript.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        console.log('AWS Script output:', text);
        
        // Check for success indicators
        if (text.includes('Terraformer import completed successfully')) {
          exportSuccess = true;
        }
        
        if (text.includes('Consolidated file created:')) {
          const match = text.match(/Consolidated file created: (.+)/);
          if (match) {
            exportFile = match[1].trim();
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
          output: `AWS import script execution error: ${error.message}`,
          exportDir: '',
          exportFile: '',
          provider,
          exitCode: -1
        };
        
        broadcast({ type: 'export_error', data: error.message });
        res.status(500).json(errorResult);
      });
      
      return; // Exit early for AWS
    }
    
    // Handle GCP and Azure with existing logic
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
      export LAST_EXPORT_FILE="${provider === 'GCP' ? 'gcp_resources.txt' : provider === 'AWS' ? 'generated/aws_consolidated.txt' : 'azure_resources.txt'}"
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

// Download final security report
app.get('/api/download-final-report', async (req, res) => {
  try {
    console.log('Download final report endpoint called');
    const searchDir = path.join(__dirname, '..');
    console.log('Searching in directory:', searchDir);
    
    // Find the most recent final security report using async glob
    const reportFiles = await glob('final_security_report_*.md', { 
      cwd: searchDir,
      absolute: true 
    });
    
    console.log('Found report files:', reportFiles);
    
    if (reportFiles.length === 0) {
      console.log('No final security reports found');
      return res.status(404).json({ error: 'No final security report found' });
    }
    
    // Get the most recent file
    const mostRecentReport = reportFiles.sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.mtime.getTime() - statA.mtime.getTime();
    })[0];
    
    console.log('Most recent report:', mostRecentReport);
    
    // Check if file exists and is readable
    if (!fs.existsSync(mostRecentReport)) {
      console.log('File does not exist:', mostRecentReport);
      return res.status(404).json({ error: 'Final security report file not found' });
    }
    
    // Get file stats
    const stats = fs.statSync(mostRecentReport);
    console.log('File size:', stats.size, 'bytes');
    
    // Set appropriate headers for markdown download
    const filename = path.basename(mostRecentReport);
    console.log('Setting filename:', filename);
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file
    console.log('Starting file stream...');
    const fileStream = fs.createReadStream(mostRecentReport);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming final report:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading final security report' });
      }
    });
    
    fileStream.on('end', () => {
      console.log('File stream completed successfully');
    });
    
  } catch (error) {
    console.error('Error downloading final report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload document for RAG knowledge base
app.post('/api/upload-document', upload.single('document'), async (req, res) => {
  try {
    const { geminiApiKey } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key required' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const filename = `${fileId}_${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    fs.writeFileSync(filepath, file.buffer);

    // Process file for RAG (this would integrate with your LlamaIndex setup)
    // For now, just return success
    res.json({
      id: fileId,
      filename: filename,
      originalName: file.originalname,
      size: file.size,
      type: file.mimetype
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Security chat endpoint
app.post('/api/security-chat', async (req, res) => {
  try {
    const { message, geminiApiKey, uploadedDocuments, scanResults } = req.body;

    if (!message || !geminiApiKey) {
      return res.status(400).json({ error: 'Message and API key required' });
    }

    // Create the Python RAG chat script dynamically
    const chatScript = `
import sys
import json
import asyncio
from pathlib import Path
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, Settings
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

async def run_security_chat():
    try:
        # Parse input
        message = sys.argv[1]
        api_key = sys.argv[2]
        
        # Initialize LLM and embeddings
        Settings.llm = GoogleGenAI(
            model="gemini-2.0-flash",
            api_key=api_key,
            max_tokens=4000,
            temperature=0.3
        )
        
        Settings.embed_model = GoogleGenAIEmbedding(
            model_name="text-embedding-004",
            api_key=api_key
        )
        
        # Load security documents
        documents = []
        
        # Load enhanced Gemini analysis
        gemini_files = list(Path('.').glob('enhanced_security_analysis_*.txt'))
        if gemini_files:
            reader = SimpleDirectoryReader(input_files=[str(max(gemini_files, key=lambda f: f.stat().st_mtime))])
            documents.extend(reader.load_data())
        
        # Load Prowler results
        prowler_files = list(Path('.').glob('prowler_scan_*_cleaned.json'))
        if prowler_files:
            reader = SimpleDirectoryReader(input_files=[str(max(prowler_files, key=lambda f: f.stat().st_mtime))])
            documents.extend(reader.load_data())
        
        # Load final report
        final_reports = list(Path('.').glob('final_security_report_*.md'))
        if final_reports:
            reader = SimpleDirectoryReader(input_files=[str(max(final_reports, key=lambda f: f.stat().st_mtime))])
            documents.extend(reader.load_data())
        
        # Load uploaded documents
        uploads_dir = Path('uploads')
        if uploads_dir.exists():
            upload_files = list(uploads_dir.glob('*'))
            if upload_files:
                reader = SimpleDirectoryReader(input_dir=str(uploads_dir))
                documents.extend(reader.load_data())
        
        if not documents:
            print(json.dumps({
                "response": "I don't have access to any security documents yet. Please ensure your security scan has completed and try again.",
                "sources": []
            }))
            return
        
        # Create index
        index = VectorStoreIndex.from_documents(documents)
        query_engine = index.as_query_engine(
            similarity_top_k=5,
            response_mode="tree_summarize"
        )
        
        # Enhanced prompt for conversational security assistance
        enhanced_prompt = f\"\"\"You are a helpful security analyst assistant. A user is asking about their security scan results and needs practical guidance.

User question: {message}

Please provide a helpful, conversational response that:
1. Directly answers their question in plain language
2. Provides actionable recommendations when relevant
3. Explains technical concepts clearly
4. Focuses on being helpful rather than just dumping data
5. Includes specific evidence from the security documents when needed
6. Offers next steps or follow-up suggestions

Be conversational, helpful, and focused on practical security guidance.\"\"\"
        
        # Query the documents
        response = query_engine.query(enhanced_prompt)
        
        # Extract sources from response
        sources = []
        if hasattr(response, 'source_nodes'):
            for node in response.source_nodes:
                if hasattr(node, 'metadata') and 'file_name' in node.metadata:
                    sources.append(node.metadata['file_name'])
        
        # Clean up sources
        sources = list(set(sources))[:3]  # Limit to 3 unique sources
        
        print(json.dumps({
            "response": str(response.response),
            "sources": sources
        }))
        
    except Exception as e:
        print(json.dumps({
            "response": f"I encountered an error processing your request: {str(e)}. Please check your API key and try again.",
            "sources": []
        }))

if __name__ == "__main__":
    asyncio.run(run_security_chat())
`;

    // Save the script temporarily
    const scriptPath = path.join(__dirname, '..', 'temp_chat_script.py');
    fs.writeFileSync(scriptPath, chatScript);

    // Run the chat script using virtual environment
    // spawn is already imported at the top
    const pythonProcess = spawn('bash', ['-c', `source llama_env/bin/activate && python3 "${scriptPath}" "${message}" "${geminiApiKey}"`], {
      cwd: path.join(__dirname, '..')
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up temp script
      fs.unlinkSync(scriptPath);

      if (code === 0) {
        try {
          const result = JSON.parse(output);
          res.json(result);
        } catch (parseError) {
          console.error('Failed to parse Python output:', output);
          res.status(500).json({
            response: "I encountered an error processing your request. Please try again.",
            sources: []
          });
        }
      } else {
        console.error('Python script error:', errorOutput);
        res.status(500).json({
          response: "I encountered an error processing your request. Please check your API key and try again.",
          sources: []
        });
      }
    });

  } catch (error) {
    console.error('Security chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Continue scan with Gemini API key
app.post('/api/continue-scan', async (req, res) => {
  const { exportDir, provider, projectId, geminiApiKey } = req.body;
  
  try {
    broadcast({ type: 'scan_phase', data: { phase: 'gemini' } });
    
    // Continue with Gemini analysis
    const scriptPath = path.join(__dirname, '..', 'cloudsec.sh');
    const fullExportDir = exportDir.startsWith('/') ? exportDir : path.join(__dirname, '..', exportDir);
    const bashScript = spawn('bash', ['-c', `
      export CLOUD_PROVIDER="${provider}"
      export PROJECT_ID="${projectId || ''}"
      export GOOGLE_API_KEY="${geminiApiKey}"
      export LAST_EXPORT_DIR="${fullExportDir}"
      export LAST_EXPORT_FILE="${provider === 'GCP' ? 'gcp_resources.txt' : provider === 'AWS' ? 'generated/aws_consolidated.txt' : 'azure_resources.txt'}"
      export HEADLESS_MODE="true"
      export SKIP_PROWLER="true"
      
      echo "🚀 Starting Modern Gemini Security Analysis"
      echo "📂 Export Directory: ${fullExportDir}"
      echo "🔑 API Key: ${geminiApiKey ? '[PROVIDED]' : '[MISSING]'}"
      echo "🆔 Project ID: ${projectId || ''}"
      
      # Use the modern scanner directly
      echo "--- Phase: Gemini AI Analysis ---"
      if [[ -d "llama_env" ]]; then
        source llama_env/bin/activate && python3 "gemini_security_scanner.py" "${projectId || ''}" "${fullExportDir}" "${geminiApiKey}"
      else
        python3 "gemini_security_scanner.py" "${projectId || ''}" "${fullExportDir}" "${geminiApiKey}"
      fi
      if [[ $? -eq 0 ]]; then
        echo "✅ Modern Gemini analysis completed successfully"
        
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
          GEMINI_ANALYSIS_FILE=\$(ls -t enhanced_security_analysis_*.txt 2>/dev/null | head -1)
          if [[ -z "\$GEMINI_ANALYSIS_FILE" ]]; then
            GEMINI_ANALYSIS_FILE=\$(ls -t security_analysis_*.txt 2>/dev/null | head -1)
          fi
        fi
        
        # Try consolidation if both files exist
        if [[ -n "\$GEMINI_ANALYSIS_FILE" ]] && [[ -n "\$PROWLER_CLEANED_FILE" ]]; then
          echo "Starting consolidation analysis..."
          echo "Using Gemini file: \$GEMINI_ANALYSIS_FILE"
          echo "Using Prowler file: \$PROWLER_CLEANED_FILE"
          
          # Run consolidation script directly
          echo "Running security consolidation script..."
          if [[ -d "llama_env" ]]; then
            echo "Activating LlamaIndex virtual environment..."
            if source llama_env/bin/activate && python3 "security_consolidation_script.py" "${projectId || ''}" "." "${geminiApiKey}"; then
              echo "✓ Consolidation completed successfully"
              
              # Find the generated final report
              FINAL_SECURITY_REPORT=\$(ls -t final_security_report_*.md 2>/dev/null | head -1)
              if [[ -n "\$FINAL_SECURITY_REPORT" ]]; then
                echo "📄 Final security report: \$FINAL_SECURITY_REPORT"
              fi
            else
              echo "⚠ Consolidation failed, but continuing"
            fi
          else
            echo "Running consolidation script with system Python..."
            if python3 "security_consolidation_script.py" "${projectId || ''}" "." "${geminiApiKey}"; then
              echo "✓ Consolidation completed successfully"
              
              # Find the generated final report
              FINAL_SECURITY_REPORT=\$(ls -t final_security_report_*.md 2>/dev/null | head -1)
              if [[ -n "\$FINAL_SECURITY_REPORT" ]]; then
                echo "📄 Final security report: \$FINAL_SECURITY_REPORT"
              fi
            else
              echo "⚠ Consolidation failed, but continuing"
            fi
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
            geminiAnalysis: scanSuccess ? 'enhanced_security_analysis_*.txt' : null,
            prowlerResults: scanSuccess ? 'prowler_scan_*_cleaned.json' : null,
            finalSecurityReport: scanSuccess ? 'final_security_report_*.md' : null
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

// Check for latest export endpoint
app.post('/api/check-latest-export', async (req, res) => {
  const { provider } = req.body;
  
  try {
    const { glob } = await import('glob');
    
    // Look for existing export directories
    let pattern, expectedFile;
    if (provider === 'GCP') {
      pattern = 'gcp_export_*';
      expectedFile = 'gcp_resources.txt';
    } else if (provider === 'AZURE') {
      pattern = 'azure_export_*';
      expectedFile = 'azure_resources.txt';
    } else if (provider === 'AWS') {
      pattern = 'tftest';
      expectedFile = 'generated/aws_consolidated.txt';
    } else {
      return res.json({ hasExport: false });
    }
    
    const matchedDirs = await glob(pattern, { cwd: path.join(__dirname, '..') });
    
    const exportDirs = matchedDirs
      .map(dir => {
        const fullPath = path.join(__dirname, '..', dir);
        try {
          const stats = fs.statSync(fullPath);
          return {
            path: fullPath,
            name: dir,
            created: stats.birthtime,
            modified: stats.mtime
          };
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());

    if (exportDirs.length === 0) {
      return res.json({ hasExport: false });
    }

    const latestExport = exportDirs[0];
    
    // Check if the export has the required files  
    const exportFilePath = path.join(latestExport.path, expectedFile);
    
    if (!fs.existsSync(exportFilePath)) {
      return res.json({ hasExport: false });
    }

    // Try to extract project ID from metadata if available
    let projectId = null;
    let resourceGroup = null;
    
    const metadataPath = path.join(latestExport.path, 'export_metadata.txt');
    if (fs.existsSync(metadataPath)) {
      const metadata = fs.readFileSync(metadataPath, 'utf-8');
      const projectMatch = metadata.match(/Project ID:\s*([a-zA-Z0-9-]+)/);
      const resourceMatch = metadata.match(/Resource Group:\s*([^\n]+)/);
      
      if (projectMatch) projectId = projectMatch[1];
      if (resourceMatch) resourceGroup = resourceMatch[1].trim();
    }

    const fileStats = fs.statSync(exportFilePath);
    
    res.json({
      hasExport: true,
      export: {
        provider,
        projectId,
        resourceGroup,
        exportPath: latestExport.path,
        fileName: expectedFile,
        fileSize: Math.round(fileStats.size / 1024) + ' KB',
        timestamp: latestExport.modified.toISOString(),
        age: Math.round((Date.now() - latestExport.modified.getTime()) / 1000 / 60) + ' minutes ago'
      }
    });
    
  } catch (error) {
    console.error('Error checking latest export:', error);
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