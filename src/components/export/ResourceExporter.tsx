import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api, CloudSecurityWebSocket } from '@/lib/api';
import type { CloudProvider } from '@/pages/Index';

interface ResourceExporterProps {
  provider: CloudProvider;
  onComplete: (data: any) => void;
}

const ResourceExporter: React.FC<ResourceExporterProps> = ({ provider, onComplete }) => {
  const [projectId, setProjectId] = useState('');
  const [resourceGroup, setResourceGroup] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [exportResults, setExportResults] = useState<any>(null);
  const [exportOutput, setExportOutput] = useState<string>('');
  const { toast } = useToast();
  const [ws] = useState(() => new CloudSecurityWebSocket());

  useEffect(() => {
    ws.connect();
    
    ws.on('export_start', (data) => {
      setIsExporting(true);
      setExportStatus('running');
      setExportProgress(0);
      setExportOutput('Starting export for ' + data.provider + '...\n');
    });
    
    ws.on('export_progress', (data) => {
      setExportOutput(prev => prev + data.data);
      // Simulate progress based on output
      setExportProgress(prev => Math.min(prev + Math.random() * 10, 90));
    });
    
    ws.on('export_complete', (data) => {
      setExportProgress(100);
      setIsExporting(false);
      
      if (data.success) {
        setExportStatus('success');
        setExportResults({
          provider,
          projectId: provider === 'GCP' ? projectId : undefined,
          resourceGroup: provider === 'AZURE' ? resourceGroup : undefined,
          exportPath: data.exportDir,
          fileName: provider === 'GCP' ? 'gcp_resources.txt' : 'azure_resources.txt',
          fileSize: 'Unknown',
          lineCount: 'Unknown',
          resources: 'Unknown',
          timestamp: new Date().toISOString(),
          output: data.output,
          success: true
        });
        
        toast({
          title: "Export Completed",
          description: `Successfully exported ${provider} resources.`,
        });
      } else {
        setExportStatus('error');
        toast({
          title: "Export Failed",
          description: "Failed to export resources. Check the output for details.",
          variant: "destructive"
        });
      }
    });
    
    ws.on('export_error', (data) => {
      setIsExporting(false);
      setExportStatus('error');
      setExportOutput(prev => prev + 'ERROR: ' + data.data + '\n');
      
      toast({
        title: "Export Error",
        description: "An error occurred during export.",
        variant: "destructive"
      });
    });
    
    return () => ws.disconnect();
  }, [provider, projectId, resourceGroup, toast]);

  const handleExport = async () => {
    if (provider === 'GCP' && !projectId.trim()) {
      toast({
        title: "Project ID Required",
        description: "Please enter a valid GCP Project ID.",
        variant: "destructive"
      });
      return;
    }

    if (provider === 'AZURE' && !resourceGroup.trim()) {
      toast({
        title: "Resource Group Required",
        description: "Please enter a valid Azure Resource Group name.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      setExportStatus('running');
      setExportProgress(0);
      setExportOutput('');

      await api.exportResources({
        provider: provider!,
        projectId: provider === 'GCP' ? projectId : undefined,
        resourceGroup: provider === 'AZURE' ? resourceGroup : undefined
      });
    } catch (error) {
      setIsExporting(false);
      setExportStatus('error');
      toast({
        title: "Export Failed",
        description: "Failed to start export. Make sure the backend server is running.",
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    if (exportResults) {
      onComplete(exportResults);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {provider === 'GCP' ? 'GCP' : 'Azure'} Resource Export
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Export your cloud resources to Terraform format for security analysis.
        </p>
      </div>

      {/* Configuration Form */}
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              provider === 'GCP' ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              <span className="text-white text-sm font-bold">
                {provider === 'GCP' ? 'G' : 'Az'}
              </span>
            </div>
            <span>{provider === 'GCP' ? 'GCP Configuration' : 'Azure Configuration'}</span>
          </CardTitle>
          <CardDescription>
            {provider === 'GCP' 
              ? 'Enter your GCP Project ID to export resources'
              : 'Enter your Azure Resource Group name to export resources'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {provider === 'GCP' ? (
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                placeholder="my-gcp-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isExporting}
              />
              <p className="text-xs text-gray-500">
                The GCP project ID containing resources to export
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="resourceGroup">Resource Group</Label>
              <Input
                id="resourceGroup"
                placeholder="my-resource-group"
                value={resourceGroup}
                onChange={(e) => setResourceGroup(e.target.value)}
                disabled={isExporting}
              />
              <p className="text-xs text-gray-500">
                The Azure resource group containing resources to export
              </p>
            </div>
          )}

          <Button 
            onClick={handleExport}
            disabled={isExporting || (!projectId.trim() && provider === 'GCP') || (!resourceGroup.trim() && provider === 'AZURE')}
            className="w-full"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exporting Resources...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Start Export
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export Progress */}
      {exportStatus === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Export in Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={exportProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {exportProgress < 30 ? 'Initializing export...' :
                 exportProgress < 60 ? 'Discovering resources...' :
                 exportProgress < 90 ? 'Generating Terraform configuration...' :
                 'Finalizing export...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Output */}
      {exportOutput && (
        <Card>
          <CardHeader>
            <CardTitle>Export Output</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={exportOutput}
              readOnly
              className="h-32 font-mono text-sm bg-gray-50"
              placeholder="Export output will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {/* Export Results */}
      {exportStatus === 'success' && exportResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Export Completed Successfully</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Provider:</span>
                <span className="ml-2 font-medium">{exportResults.provider}</span>
              </div>
              <div>
                <span className="text-gray-600">Export Path:</span>
                <span className="ml-2 font-medium text-blue-600">{exportResults.exportPath}</span>
              </div>
              {exportResults.projectId && (
                <div>
                  <span className="text-gray-600">Project ID:</span>
                  <span className="ml-2 font-medium">{exportResults.projectId}</span>
                </div>
              )}
              {exportResults.resourceGroup && (
                <div>
                  <span className="text-gray-600">Resource Group:</span>
                  <span className="ml-2 font-medium">{exportResults.resourceGroup}</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Button onClick={handleContinue} className="w-full bg-blue-600 hover:bg-blue-700">
                Continue to Security Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Error */}
      {exportStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Export failed. Please check the output above for error details and try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ResourceExporter;
