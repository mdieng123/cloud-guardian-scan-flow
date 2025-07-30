const API_BASE = 'http://localhost:3001/api';

export interface AuthStatus {
  gcp: boolean;
  azure: boolean;
  isAuthenticated: boolean;
}

export interface ExportRequest {
  provider: 'GCP' | 'AZURE';
  projectId?: string;
  resourceGroup?: string;
}

export interface ExportResult {
  success: boolean;
  output: string;
  exportDir: string;
  provider: string;
  exitCode: number;
}

export interface ScanRequest {
  exportDir: string;
  provider: 'GCP' | 'AZURE';
  projectId?: string;
}

export interface ScanResult {
  success: boolean;
  output: string;
  scanResults: any;
  exitCode: number;
}

// API functions
export const api = {
  async checkAuth(): Promise<AuthStatus> {
    const response = await fetch(`${API_BASE}/check-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  },

  async exportResources(request: ExportRequest): Promise<ExportResult> {
    const response = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  async runSecurityScan(request: ScanRequest): Promise<ScanResult> {
    const response = await fetch(`${API_BASE}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  async continueScan(request: ScanRequest & { geminiApiKey: string }): Promise<ScanResult> {
    const response = await fetch(`${API_BASE}/continue-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  async checkLatestExport(provider: 'GCP' | 'AZURE') {
    const response = await fetch(`${API_BASE}/check-latest-export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    return response.json();
  },

  async healthCheck() {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
  }
};

// WebSocket connection for real-time updates
export class CloudSecurityWebSocket {
  private ws: WebSocket | null = null;
  private connectionId: string | null = null;
  private handlers: Map<string, (data: any) => void> = new Map();

  connect() {
    this.ws = new WebSocket('ws://localhost:3001');
    
    this.ws.onopen = () => {
      console.log('🔗 Connected to Cloud Security Assessment server');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'connection') {
          this.connectionId = message.connectionId;
          return;
        }

        const handler = this.handlers.get(message.type);
        if (handler) {
          // For progress messages, pass the whole message to preserve structure
          if (message.type === 'export_progress' || message.type === 'scan_progress') {
            handler(message);
          } else {
            handler(message.data || message);
          }
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('🔌 Disconnected from server', event.reason);
      this.ws = null;
      // Auto-reconnect after 3 seconds, with exponential backoff if needed
      setTimeout(() => {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          console.log('🔄 Attempting to reconnect...');
          this.connect();
        }
      }, 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  on(eventType: string, handler: (data: any) => void) {
    this.handlers.set(eventType, handler);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }
} 