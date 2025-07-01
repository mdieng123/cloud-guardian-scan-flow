import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, RefreshCw, Shield, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api, CloudSecurityWebSocket } from '@/lib/api';

interface AuthenticationCheckProps {
  onComplete: (data: any) => void;
}

const AuthenticationCheck: React.FC<AuthenticationCheckProps> = ({ onComplete }) => {
  const [gcpStatus, setGcpStatus] = useState<'checking' | 'authenticated' | 'not-authenticated'>('checking');
  const [azureStatus, setAzureStatus] = useState<'checking' | 'authenticated' | 'not-authenticated'>('checking');
  const [gcpAccount, setGcpAccount] = useState<string>('');
  const [azureAccount, setAzureAccount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [ws] = useState(() => new CloudSecurityWebSocket());

  const checkAuthentication = async () => {
    setIsLoading(true);
    setGcpStatus('checking');
    setAzureStatus('checking');
    
    try {
      const authData = await api.checkAuth();
      
      // Update GCP status
      setGcpStatus(authData.gcp ? 'authenticated' : 'not-authenticated');
      if (authData.gcp) {
        // You could get the actual account from gcloud command output
        setGcpAccount('user@gcp-project.iam.gserviceaccount.com');
      }
      
      // Update Azure status  
      setAzureStatus(authData.azure ? 'authenticated' : 'not-authenticated');
      if (authData.azure) {
        // You could get the actual account from az command output
        setAzureAccount('user@company.com');
      }
      
      setIsLoading(false);
      
      toast({
        title: authData.isAuthenticated ? "Authentication Check Complete" : "Authentication Required",
        description: authData.isAuthenticated 
          ? "You are authenticated with your cloud provider(s)." 
          : "Please authenticate with at least one cloud provider.",
        variant: authData.isAuthenticated ? "default" : "destructive"
      });
      
    } catch (error) {
      setIsLoading(false);
      setGcpStatus('not-authenticated');
      setAzureStatus('not-authenticated');
      
      toast({
        title: "Authentication Check Failed",
        description: "Failed to connect to backend server. Make sure the server is running.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    ws.connect();
    
    ws.on('auth_start', () => {
      setIsLoading(true);
      setGcpStatus('checking');
      setAzureStatus('checking');
    });
    
    ws.on('auth_complete', (data) => {
      setGcpStatus(data.gcp ? 'authenticated' : 'not-authenticated');
      setAzureStatus(data.azure ? 'authenticated' : 'not-authenticated');
      setIsLoading(false);
    });
    
    ws.on('auth_error', () => {
      setGcpStatus('not-authenticated');
      setAzureStatus('not-authenticated');
      setIsLoading(false);
    });
    
    // Initial auth check
    checkAuthentication();
    
    return () => ws.disconnect();
  }, []);

  const handleContinue = () => {
    if (gcpStatus === 'authenticated' || azureStatus === 'authenticated') {
      toast({
        title: "Authentication Verified",
        description: "Proceeding to cloud provider selection.",
      });
      onComplete({ 
        gcp: gcpStatus === 'authenticated',
        azure: azureStatus === 'authenticated',
        gcpAccount,
        azureAccount,
        isAuthenticated: true
      });
    } else {
      toast({
        title: "Authentication Required",
        description: "Please authenticate with at least one cloud provider.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'checking') return <RefreshCw className="h-5 w-5 animate-spin" />;
    if (status === 'authenticated') return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'checking') return <Badge variant="secondary">Checking...</Badge>;
    if (status === 'authenticated') return <Badge className="bg-green-100 text-green-800">Authenticated</Badge>;
    return <Badge variant="destructive">Not Authenticated</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Status</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Verify your cloud provider credentials to proceed with the security assessment.
        </p>
      </div>

      <div className="grid gap-4">
        {/* GCP Authentication Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">G</span>
                </div>
                <span>Google Cloud Platform</span>
              </CardTitle>
              {getStatusBadge(gcpStatus)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(gcpStatus)}
                <div>
                  {gcpStatus === 'authenticated' ? (
                    <div>
                      <p className="font-medium text-gray-900">Authenticated</p>
                      <p className="text-sm text-gray-600">Ready for resource export</p>
                    </div>
                  ) : gcpStatus === 'not-authenticated' ? (
                    <div>
                      <p className="font-medium text-gray-900">Not Authenticated</p>
                      <p className="text-sm text-gray-600">Run: gcloud auth login</p>
                    </div>
                  ) : (
                    <p className="font-medium text-gray-900">Checking authentication...</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Azure Authentication Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">Az</span>
                </div>
                <span>Microsoft Azure</span>
              </CardTitle>
              {getStatusBadge(azureStatus)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(azureStatus)}
                <div>
                  {azureStatus === 'authenticated' ? (
                    <div>
                      <p className="font-medium text-gray-900">Authenticated</p>
                      <p className="text-sm text-gray-600">Ready for resource export</p>
                    </div>
                  ) : azureStatus === 'not-authenticated' ? (
                    <div>
                      <p className="font-medium text-gray-900">Not Authenticated</p>
                      <p className="text-sm text-gray-600">Run: az login</p>
                    </div>
                  ) : (
                    <p className="font-medium text-gray-900">Checking authentication...</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Instructions */}
      {(gcpStatus === 'not-authenticated' || azureStatus === 'not-authenticated') && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertDescription>
            <strong>Authentication Required:</strong>
            <div className="mt-2 space-y-1">
              {gcpStatus === 'not-authenticated' && (
                <div>• For GCP: Run <code className="bg-gray-100 px-2 py-1 rounded">gcloud auth login</code></div>
              )}
              {azureStatus === 'not-authenticated' && (
                <div>• For Azure: Run <code className="bg-gray-100 px-2 py-1 rounded">az login</code></div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={checkAuthentication} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
        
        <Button 
          onClick={handleContinue}
          disabled={gcpStatus === 'not-authenticated' && azureStatus === 'not-authenticated'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continue to Cloud Selection
        </Button>
      </div>
    </div>
  );
};

export default AuthenticationCheck;
