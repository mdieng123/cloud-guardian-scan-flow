
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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

    setIsExporting(true);
    setExportStatus('running');
    setExportProgress(0);

    // Simulate export progress
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    // Simulate actual export process
    setTimeout(() => {
      clearInterval(progressInterval);
      setExportProgress(100);
      
      // Mock success response
      const mockResults = {
        provider,
        projectId: provider === 'GCP' ? projectId : undefined,
        resourceGroup: provider === 'AZURE' ? resourceGroup : undefined,
        exportPath: `${provider.toLowerCase()}_export_${Date.now()}`,
        fileName: provider === 'GCP' ? 'gcp_resources.txt' : 'azure_resources.txt',
        fileSize: '2.4 MB',
        lineCount: 1247,
        resources: Math.floor(Math.random() * 50) + 20,
        timestamp: new Date().toISOString()
      };

      setExportResults(mockResults);
      setExportStatus('success');
      setIsExporting(false);

      toast({
        title: "Export Completed",
        description: `Successfully exported ${mockResults.resources} resources.`,
      });

    }, 5000);
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
        <Card className="max-w-md mx-auto">
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

      {/* Export Results */}
      {exportStatus === 'success' && exportResults && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Export Completed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully exported <strong>{exportResults.resources} resources</strong> to Terraform format.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size:</span>
                  <span className="font-medium">{exportResults.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lines:</span>
                  <span className="font-medium">{exportResults.lineCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Export Path:</span>
                  <span className="font-medium text-xs">{exportResults.exportPath}</span>
                </div>
              </div>

              <Button onClick={handleContinue} className="w-full">
                Continue to Security Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Error */}
      {exportStatus === 'error' && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span>Export Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Export failed. Please check your credentials and try again.
              </AlertDescription>
            </Alert>
            <Button onClick={handleExport} variant="outline" className="w-full mt-3">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Export
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResourceExporter;
